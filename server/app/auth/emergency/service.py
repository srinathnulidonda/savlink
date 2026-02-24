# server/app/auth/emergency/service.py
import logging
from datetime import datetime, timedelta
from typing import Optional
from app.extensions import db
from app.models import User, EmergencyToken
from app.utils.crypto import generate_secure_token, hash_token
from app.auth.emergency.email import send_emergency_token_email
from app.auth.redis import (
    check_emergency_rate_limit,
    track_verification_attempt,
    create_emergency_session,
    is_redis_available,
)

logger = logging.getLogger(__name__)

TOKEN_TTL = timedelta(minutes=15)
SESSION_TTL = 3600


def request_emergency_access(email: str, ip_address: str) -> bool:
    if not is_redis_available():
        return False

    allowed, _ = check_emergency_rate_limit(email)
    if not allowed:
        return False

    user = User.query.filter_by(email=email).first()
    if not user or not user.emergency_enabled:
        return False

    EmergencyToken.query.filter_by(user_id=user.id, used_at=None).filter(
        EmergencyToken.expires_at > datetime.utcnow()
    ).update({'expires_at': datetime.utcnow()})
    db.session.commit()

    raw_token = generate_secure_token()
    record = EmergencyToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.utcnow() + TOKEN_TTL,
        ip_address=ip_address,
    )
    db.session.add(record)
    db.session.commit()

    return send_emergency_token_email(user.email, raw_token)


def verify_emergency_token(email: str, token: str, ip_address: str) -> Optional[str]:
    if not is_redis_available():
        return None

    user = User.query.filter_by(email=email).first()
    if not user:
        return None

    token_hashed = hash_token(token)

    allowed, _ = track_verification_attempt(token_hashed)
    if not allowed:
        return None

    record = EmergencyToken.query.filter_by(
        user_id=user.id, token_hash=token_hashed, used_at=None
    ).filter(EmergencyToken.expires_at > datetime.utcnow()).first()

    if not record:
        return None

    record.used_at = datetime.utcnow()
    record.ip_address = ip_address
    db.session.commit()

    session_token = generate_secure_token()
    if not create_emergency_session(session_id=session_token, user_id=user.id, ttl=SESSION_TTL):
        return None

    logger.info("Emergency access granted for %s from %s", email, ip_address)
    return session_token