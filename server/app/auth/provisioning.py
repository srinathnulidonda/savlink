# server/app/auth/provisioning.py

import time
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import User
from app.auth.redis import (
    get_cached_user_data,
    cache_user_data,
    invalidate_user_cache
)
import logging

logger = logging.getLogger(__name__)

# Only update last_login_at every 5 minutes (not every request)
LOGIN_UPDATE_INTERVAL = 300  # seconds
_last_login_updates = {}  # {uid: timestamp}


def provision_user_cached(user_info: Dict[str, Any]) -> Optional[User]:
    """
    Provision or update a user with Redis caching.
    
    Flow:
    1. Check Redis for cached user
    2. If cached, return without DB query (unless stale login timestamp)
    3. If not cached, query/create in DB
    4. Cache result in Redis
    """
    uid = user_info.get('uid')
    email = user_info.get('email')
    
    if not uid:
        raise ValueError("Missing uid in user info")
    
    if not email:
        email = f"{uid}@savlink.local"
    
    try:
        #  Try to get from DB and provision 
        user = _provision_or_update(uid, email, user_info)
        
        if user:
            # Cache the user data
            cache_user_data(uid, user.to_dict())
        
        return user
        
    except Exception as e:
        logger.error(f"Provisioning error for {uid}: {e}", exc_info=True)
        db.session.rollback()
        
        # Try to return existing user even on error
        user = User.query.filter_by(id=uid).first()
        if user:
            return user
        
        raise


def _provision_or_update(uid: str, email: str, user_info: Dict[str, Any]) -> User:
    """Core provisioning logic with optimized writes."""
    
    # Try finding by UID first (most common case)
    user = User.query.filter_by(id=uid).first()
    
    if user:
        #  Existing user - minimal update 
        changed = False
        
        # Update name/avatar only if user doesn't have them
        if user_info.get('name') and not user.name:
            user.name = user_info['name']
            changed = True
        
        if user_info.get('picture') and not user.avatar_url:
            user.avatar_url = user_info['picture']
            changed = True
        
        # Handle email change (rare)
        if email != user.email:
            existing = User.query.filter_by(email=email).first()
            if not existing or existing.id == uid:
                user.email = email
                changed = True
            else:
                logger.warning(f"Email {email} belongs to user {existing.id}, keeping {user.email}")
        
        # Throttle last_login_at updates (every 5 min, not every request)
        now = time.time()
        last_update = _last_login_updates.get(uid, 0)
        
        if now - last_update > LOGIN_UPDATE_INTERVAL:
            user.last_login_at = datetime.utcnow()
            _last_login_updates[uid] = now
            changed = True
        
        if changed:
            db.session.commit()
            invalidate_user_cache(uid)  # Invalidate stale cache
        
        return user
    
    #  Check by email (account merging) 
    existing_email_user = User.query.filter_by(email=email).first()
    
    if existing_email_user:
        logger.info(f"Merging user {email}: {existing_email_user.id} → {uid}")
        existing_email_user.id = uid
        existing_email_user.last_login_at = datetime.utcnow()
        
        if user_info.get('name') and not existing_email_user.name:
            existing_email_user.name = user_info['name']
        if user_info.get('picture') and not existing_email_user.avatar_url:
            existing_email_user.avatar_url = user_info['picture']
        
        try:
            db.session.commit()
            _last_login_updates[uid] = time.time()
            invalidate_user_cache(uid)
            return existing_email_user
        except IntegrityError:
            db.session.rollback()
            # If merge fails, try finding by new UID
            user = User.query.filter_by(id=uid).first()
            if user:
                return user
            raise
    
    #  Create new user 
    user = User(
        id=uid,
        email=email,
        name=user_info.get('name'),
        avatar_url=user_info.get('picture'),
        auth_provider=user_info.get('auth_provider', 'password'),
        created_at=datetime.utcnow(),
        last_login_at=datetime.utcnow(),
        emergency_enabled=False
    )
    
    try:
        db.session.add(user)
        db.session.commit()
        _last_login_updates[uid] = time.time()
        logger.info(f"Created new user: {uid} ({email})")
        return user
    except IntegrityError:
        db.session.rollback()
        # Race condition: user was created by another request
        user = User.query.filter_by(id=uid).first()
        if not user:
            user = User.query.filter_by(email=email).first()
        
        if user:
            logger.info(f"User {uid} created by concurrent request, returning existing")
            return user
        
        raise ValueError(f"Failed to create or find user {uid}")


def update_user_profile(user_id: str, updates: Dict[str, Any]) -> Optional[User]:
    """Update user profile and invalidate cache."""
    user = User.query.filter_by(id=user_id).first()
    
    if not user:
        return None
    
    allowed_fields = {'name', 'avatar_url', 'emergency_enabled'}
    
    for field, value in updates.items():
        if field in allowed_fields and hasattr(user, field):
            setattr(user, field, value)
    
    db.session.commit()
    invalidate_user_cache(user_id)
    
    return user