# server/app/auth/sessions.py
from datetime import datetime
from typing import Optional
from app.models import User
from app.auth.redis import (
    create_emergency_session as redis_create_session,
    get_emergency_session as redis_get_session,
    revoke_emergency_session as redis_revoke_session,
    is_redis_available
)
from app.utils.crypto import generate_secure_token
from flask import current_app
import logging

logger = logging.getLogger(__name__)

def create_emergency_session(user_id: str) -> Optional[str]:
    """Create emergency session in Redis"""
    if not is_redis_available():
        logger.error("Cannot create emergency session - Redis unavailable")
        return None
    
    token = generate_secure_token()
    ttl = int(current_app.config['EMERGENCY_SESSION_TTL'].total_seconds())
    
    success = redis_create_session(
        session_id=token,
        user_id=user_id,
        ttl=ttl
    )
    
    if success:
        return token
    
    return None

def verify_emergency_session(token: str) -> Optional[User]:
    """Verify emergency session from Redis"""
    if not is_redis_available():
        logger.warning("Cannot verify emergency session - Redis unavailable")
        return None
    
    session_data = redis_get_session(token)
    
    if not session_data:
        return None
    
    user_id = session_data.get('user_id')
    auth_source = session_data.get('auth_source')
    
    if not user_id or auth_source != 'emergency':
        logger.warning(f"Invalid session data for token")
        return None
    
    user = User.query.filter_by(id=user_id).first()
    
    if user:
        # Update last login
        user.last_login_at = datetime.utcnow()
        from app.extensions import db
        db.session.commit()
    
    return user

def revoke_emergency_session(token: str):
    """Revoke emergency session from Redis"""
    if not is_redis_available():
        logger.warning("Cannot revoke session - Redis unavailable")
        return
    
    redis_revoke_session(token)