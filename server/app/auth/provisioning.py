# server/app/auth/provisioning.py
import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import User
from app.auth.redis import cache_user_data, invalidate_user_cache

logger = logging.getLogger(__name__)

LOGIN_UPDATE_INTERVAL = 300
_last_login_updates: Dict[str, float] = {}


def provision_user_cached(user_info: Dict[str, Any]) -> Optional[User]:
    uid = user_info.get('uid')
    email = user_info.get('email') or f"{uid}@savlink.local"
    if not uid:
        raise ValueError("Missing uid")
    try:
        user = _provision_or_update(uid, email, user_info)
        if user:
            cache_user_data(uid, user.to_dict())
        return user
    except Exception as e:
        logger.error("Provisioning error for %s: %s", uid, e, exc_info=True)
        db.session.rollback()
        user = User.query.filter_by(id=uid).first()
        if user:
            return user
        raise


def _provision_or_update(uid: str, email: str, info: Dict[str, Any]) -> User:
    user = User.query.filter_by(id=uid).first()

    if user:
        changed = False
        if info.get('name') and not user.name:
            user.name = info['name']
            changed = True
        if info.get('picture') and not user.avatar_url:
            user.avatar_url = info['picture']
            changed = True
        if email != user.email:
            conflict = User.query.filter_by(email=email).first()
            if not conflict or conflict.id == uid:
                user.email = email
                changed = True
        now = time.time()
        if now - _last_login_updates.get(uid, 0) > LOGIN_UPDATE_INTERVAL:
            user.last_login_at = datetime.utcnow()
            _last_login_updates[uid] = now
            changed = True
        if changed:
            db.session.commit()
            invalidate_user_cache(uid)
        return user

    existing = User.query.filter_by(email=email).first()
    if existing:
        logger.info("Merging user %s: %s → %s", email, existing.id, uid)
        existing.id = uid
        existing.last_login_at = datetime.utcnow()
        if info.get('name') and not existing.name:
            existing.name = info['name']
        if info.get('picture') and not existing.avatar_url:
            existing.avatar_url = info['picture']
        try:
            db.session.commit()
            _last_login_updates[uid] = time.time()
            invalidate_user_cache(uid)
            return existing
        except IntegrityError:
            db.session.rollback()
            user = User.query.filter_by(id=uid).first()
            if user:
                return user
            raise

    user = User(
        id=uid, email=email, name=info.get('name'),
        avatar_url=info.get('picture'),
        auth_provider=info.get('auth_provider', 'password'),
        created_at=datetime.utcnow(), last_login_at=datetime.utcnow(),
        emergency_enabled=False,
    )
    try:
        db.session.add(user)
        db.session.commit()
        _last_login_updates[uid] = time.time()
        logger.info("Created user: %s (%s)", uid, email)
        return user
    except IntegrityError:
        db.session.rollback()
        user = User.query.filter_by(id=uid).first() or User.query.filter_by(email=email).first()
        if user:
            return user
        raise ValueError(f"Failed to create or find user {uid}")


def update_user_profile(user_id: str, updates: Dict[str, Any]) -> Optional[User]:
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return None
    for field in ('name', 'avatar_url', 'emergency_enabled'):
        if field in updates and hasattr(user, field):
            setattr(user, field, updates[field])
    db.session.commit()
    invalidate_user_cache(user_id)
    return user