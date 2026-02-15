# server/app/auth/emergency/service.py
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
    is_redis_available
)
from flask import current_app
import logging

logger = logging.getLogger(__name__)

def request_emergency_access(email: str, ip_address: str) -> bool:
    """Request emergency access token with rate limiting"""
    
    # Check if Redis is available for rate limiting
    if not is_redis_available():
        logger.warning("Emergency access temporarily disabled - Redis unavailable")
        return False
    
    # Check rate limit
    is_allowed, remaining = check_emergency_rate_limit(email)
    if not is_allowed:
        logger.warning(f"Rate limit exceeded for {email} from {ip_address}")
        return False
    
    # Check if user exists and has emergency access enabled
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.emergency_enabled:
        # Still count against rate limit to prevent user enumeration
        logger.info(f"Emergency access denied for {email} - user not found or not enabled")
        return False
    
    # Revoke any existing tokens for this user
    EmergencyToken.query.filter_by(
        user_id=user.id,
        used_at=None
    ).filter(
        EmergencyToken.expires_at > datetime.utcnow()
    ).update({'expires_at': datetime.utcnow()})
    db.session.commit()
    
    # Generate new token
    raw_token = generate_secure_token()
    token_hash = hash_token(raw_token)
    expires_at = datetime.utcnow() + current_app.config['EMERGENCY_TOKEN_TTL']
    
    emergency_token = EmergencyToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        ip_address=ip_address
    )
    db.session.add(emergency_token)
    db.session.commit()
    
    # Send email with token
    email_sent = send_emergency_token_email(user.email, raw_token)
    
    if email_sent:
        logger.info(f"Emergency token sent to {email} (remaining: {remaining})")
    else:
        logger.error(f"Failed to send emergency token email to {email}")
    
    return email_sent

def verify_emergency_token(email: str, token: str, ip_address: str) -> Optional[str]:
    """Verify emergency token with attempt tracking"""
    
    # Check if Redis is available
    if not is_redis_available():
        logger.warning("Emergency verification temporarily disabled - Redis unavailable")
        return None
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        logger.warning(f"Emergency verification failed - user not found: {email}")
        return None
    
    token_hash = hash_token(token)
    
    # Track verification attempt
    is_allowed, remaining = track_verification_attempt(token_hash)
    if not is_allowed:
        logger.warning(f"Too many verification attempts for token from {ip_address}")
        return None
    
    # Find valid token
    emergency_token = EmergencyToken.query.filter_by(
        user_id=user.id,
        token_hash=token_hash,
        used_at=None
    ).filter(
        EmergencyToken.expires_at > datetime.utcnow()
    ).first()
    
    if not emergency_token:
        logger.warning(f"Invalid token for {email} from {ip_address} (attempts remaining: {remaining})")
        return None
    
    # Mark token as used
    emergency_token.used_at = datetime.utcnow()
    emergency_token.ip_address = ip_address
    db.session.commit()
    
    # Create emergency session
    session_token = generate_secure_token()
    session_created = create_emergency_session(
        session_id=session_token,
        user_id=user.id,
        ttl=int(current_app.config['EMERGENCY_SESSION_TTL'].total_seconds())
    )
    
    if not session_created:
        logger.error(f"Failed to create emergency session for {email}")
        return None
    
    logger.info(f"Emergency access granted for {email} from {ip_address}")
    return session_token