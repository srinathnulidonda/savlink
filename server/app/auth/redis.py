# server/app/auth/redis.py
"""Redis helper functions for authentication"""
import hashlib
import json
from typing import Optional, Dict, Any
from flask import current_app
from app.extensions import redis_client
import logging

logger = logging.getLogger(__name__)

# Key prefixes following naming convention
KEY_PREFIX = "savlink:auth"
EMERGENCY_RATE_PREFIX = f"{KEY_PREFIX}:emergency:rate"
EMERGENCY_VERIFY_PREFIX = f"{KEY_PREFIX}:emergency:verify"
SESSION_PREFIX = f"{KEY_PREFIX}:session"
FIREBASE_TOKEN_PREFIX = f"{KEY_PREFIX}:firebase:token"

# Rate limiting constants
EMERGENCY_REQUEST_LIMIT = 3  # max requests per hour
EMERGENCY_REQUEST_WINDOW = 3600  # 1 hour in seconds
VERIFICATION_ATTEMPT_LIMIT = 10  # max attempts per token
VERIFICATION_WINDOW = 900  # 15 minutes

def check_emergency_rate_limit(email: str) -> tuple[bool, int]:
    """
    Check if email has exceeded emergency request rate limit
    Returns: (is_allowed, remaining_requests)
    """
    if not redis_client.available:
        # If Redis is down, allow but log warning
        logger.warning(f"Redis unavailable - cannot enforce rate limit for {email}")
        return True, EMERGENCY_REQUEST_LIMIT
    
    key = f"{EMERGENCY_RATE_PREFIX}:{email}"
    
    # Increment counter
    count = redis_client.incr(key)
    
    if count == 1:
        # First request - set expiry
        redis_client.expire(key, EMERGENCY_REQUEST_WINDOW)
    
    if count is None:
        # Redis operation failed
        return True, EMERGENCY_REQUEST_LIMIT
    
    remaining = max(0, EMERGENCY_REQUEST_LIMIT - count)
    is_allowed = count <= EMERGENCY_REQUEST_LIMIT
    
    if not is_allowed:
        logger.warning(f"Rate limit exceeded for email: {email} (count: {count})")
    
    return is_allowed, remaining

def track_verification_attempt(token_hash: str) -> tuple[bool, int]:
    """
    Track token verification attempts
    Returns: (is_allowed, remaining_attempts)
    """
    if not redis_client.available:
        # If Redis is down, allow but log warning
        logger.warning(f"Redis unavailable - cannot track verification attempts")
        return True, VERIFICATION_ATTEMPT_LIMIT
    
    key = f"{EMERGENCY_VERIFY_PREFIX}:{token_hash}"
    
    # Increment counter
    attempts = redis_client.incr(key)
    
    if attempts == 1:
        # First attempt - set expiry
        redis_client.expire(key, VERIFICATION_WINDOW)
    
    if attempts is None:
        # Redis operation failed
        return True, VERIFICATION_ATTEMPT_LIMIT
    
    remaining = max(0, VERIFICATION_ATTEMPT_LIMIT - attempts)
    is_allowed = attempts <= VERIFICATION_ATTEMPT_LIMIT
    
    if not is_allowed:
        logger.warning(f"Verification limit exceeded for token hash: {token_hash[:8]}...")
    
    return is_allowed, remaining

def create_emergency_session(session_id: str, user_id: str, ttl: int = 900) -> bool:
    """
    Store emergency session in Redis
    TTL default: 15 minutes
    """
    if not redis_client.available:
        logger.error("Cannot create emergency session - Redis unavailable")
        return False
    
    key = f"{SESSION_PREFIX}:{session_id}"
    value = json.dumps({
        'user_id': user_id,
        'auth_source': 'emergency'
    })
    
    result = redis_client.setex(key, ttl, value)
    return result is not False

def get_emergency_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve emergency session from Redis"""
    if not redis_client.available:
        return None
    
    key = f"{SESSION_PREFIX}:{session_id}"
    value = redis_client.get(key)
    
    if value:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            logger.error(f"Invalid session data for key: {key}")
            return None
    
    return None

def revoke_emergency_session(session_id: str) -> bool:
    """Delete emergency session from Redis"""
    if not redis_client.available:
        return False
    
    key = f"{SESSION_PREFIX}:{session_id}"
    return redis_client.delete(key) > 0

def cache_firebase_token(token: str, user_data: Dict[str, Any], ttl: int = 300) -> bool:
    """
    Cache Firebase token verification result (optional optimization)
    TTL default: 5 minutes
    """
    if not redis_client.available:
        return False
    
    # Create a fingerprint from token (first 32 chars + last 32 chars)
    if len(token) > 64:
        fingerprint = token[:32] + token[-32:]
    else:
        fingerprint = token
    
    # Hash for security
    fingerprint_hash = hashlib.sha256(fingerprint.encode()).hexdigest()[:16]
    
    key = f"{FIREBASE_TOKEN_PREFIX}:{fingerprint_hash}"
    value = json.dumps(user_data)
    
    result = redis_client.setex(key, ttl, value)
    return result is not False

def get_cached_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached Firebase token data (optional optimization)
    Returns None if not found or Redis unavailable
    """
    if not redis_client.available:
        return None
    
    # Create same fingerprint
    if len(token) > 64:
        fingerprint = token[:32] + token[-32:]
    else:
        fingerprint = token
    
    fingerprint_hash = hashlib.sha256(fingerprint.encode()).hexdigest()[:16]
    
    key = f"{FIREBASE_TOKEN_PREFIX}:{fingerprint_hash}"
    value = redis_client.get(key)
    
    if value:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    
    return None

def is_redis_available() -> bool:
    """Check if Redis is currently available"""
    return redis_client.available and redis_client.ping()