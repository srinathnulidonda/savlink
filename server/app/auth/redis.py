# server/app/auth/redis.py

import hashlib
import json
import time
from typing import Optional, Dict, Any, Tuple
from app.extensions import redis_client
import logging

logger = logging.getLogger(__name__)

#  Key Prefixes 
PREFIX = "savlink"
TOKEN_CACHE      = f"{PREFIX}:token"        # Verified token data
USER_CACHE       = f"{PREFIX}:user"         # User profile data
SESSION_CACHE    = f"{PREFIX}:session"      # Emergency sessions
RATE_LIMIT       = f"{PREFIX}:rate"         # Rate limiting
PROVISION_LOCK   = f"{PREFIX}:provision"    # Provisioning locks

#  TTLs (seconds) 
TOKEN_CACHE_TTL     = 300      # 5 minutes (tokens change hourly)
USER_CACHE_TTL      = 600      # 10 minutes
SESSION_TTL         = 3600     # 1 hour (emergency sessions)
RATE_WINDOW         = 3600     # 1 hour
PROVISION_LOCK_TTL  = 10       # 10 seconds (prevent duplicate provisioning)

# Rate limits
EMERGENCY_REQUEST_LIMIT   = 3     # per hour
EMERGENCY_VERIFY_LIMIT    = 10    # per 15 minutes
AUTH_REQUEST_LIMIT         = 60    # per hour per IP
LOGIN_ATTEMPT_LIMIT        = 10    # per hour per email


#  Token Verification Cache 
def hash_token(token: str) -> str:
    """Create a secure hash of the full token for cache key."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def cache_token_verification(token: str, decoded_data: Dict[str, Any]) -> bool:
    """
    Cache a verified Firebase token result.
    Key: token hash → Value: decoded token data (uid, email, etc.)
    """
    if not redis_client.available:
        return False

    try:
        key = f"{TOKEN_CACHE}:{hash_token(token)}"
        
        # Only cache essential fields (not the entire decoded token)
        cache_data = {
            'uid': decoded_data.get('uid'),
            'email': decoded_data.get('email'),
            'name': decoded_data.get('name'),
            'picture': decoded_data.get('picture'),
            'email_verified': decoded_data.get('email_verified', False),
            'provider': decoded_data.get('firebase', {}).get('sign_in_provider', 'password'),
            'cached_at': time.time()
        }
        
        return redis_client.setex(key, TOKEN_CACHE_TTL, json.dumps(cache_data))
    except Exception as e:
        logger.warning(f"Failed to cache token verification: {e}")
        return False


def get_cached_token_verification(token: str) -> Optional[Dict[str, Any]]:
    """
    Get cached token verification result.
    Returns decoded token data if cached and valid, None otherwise.
    """
    if not redis_client.available:
        return None

    try:
        key = f"{TOKEN_CACHE}:{hash_token(token)}"
        cached = redis_client.get(key)
        
        if cached:
            data = json.loads(cached)
            logger.debug(f"Token cache HIT for uid={data.get('uid')}")
            return data
        
        return None
    except Exception as e:
        logger.warning(f"Failed to get cached token: {e}")
        return None


def invalidate_token_cache(token: str) -> bool:
    """Invalidate a specific token's cache."""
    if not redis_client.available:
        return False
    
    key = f"{TOKEN_CACHE}:{hash_token(token)}"
    return redis_client.delete(key) > 0


#  User Data Cache 
def cache_user_data(user_id: str, user_data: Dict[str, Any]) -> bool:
    """
    Cache user profile data from database.
    Avoids DB queries on every authenticated request.
    """
    if not redis_client.available:
        return False

    try:
        key = f"{USER_CACHE}:{user_id}"
        
        # Ensure data is JSON-serializable
        safe_data = {
            'id': user_data.get('id'),
            'email': user_data.get('email'),
            'name': user_data.get('name'),
            'avatar_url': user_data.get('avatar_url'),
            'auth_provider': user_data.get('auth_provider'),
            'created_at': user_data.get('created_at'),
            'last_login_at': user_data.get('last_login_at'),
            'emergency_enabled': user_data.get('emergency_enabled', False),
            'cached_at': time.time()
        }
        
        return redis_client.setex(key, USER_CACHE_TTL, json.dumps(safe_data))
    except Exception as e:
        logger.warning(f"Failed to cache user data for {user_id}: {e}")
        return False


def get_cached_user_data(user_id: str) -> Optional[Dict[str, Any]]:
    """Get cached user profile data."""
    if not redis_client.available:
        return None

    try:
        key = f"{USER_CACHE}:{user_id}"
        cached = redis_client.get(key)
        
        if cached:
            data = json.loads(cached)
            logger.debug(f"User cache HIT for {user_id}")
            return data
        
        return None
    except Exception as e:
        logger.warning(f"Failed to get cached user data: {e}")
        return None


def invalidate_user_cache(user_id: str) -> bool:
    """Invalidate user data cache (call on user update)."""
    if not redis_client.available:
        return False

    key = f"{USER_CACHE}:{user_id}"
    return redis_client.delete(key) > 0


#  Rate Limiting 
def check_rate_limit(
    identifier: str, 
    category: str = 'general',
    limit: int = 60, 
    window: int = RATE_WINDOW
) -> Tuple[bool, int, int]:
    """
    Check rate limit for an identifier.
    Returns: (is_allowed, remaining, retry_after_seconds)
    """
    if not redis_client.available:
        return True, limit, 0

    try:
        key = f"{RATE_LIMIT}:{category}:{identifier}"
        
        count = redis_client.incr(key)
        
        if count == 1:
            redis_client.expire(key, window)
        
        if count is None:
            return True, limit, 0
        
        remaining = max(0, limit - count)
        is_allowed = count <= limit
        
        if not is_allowed:
            ttl = redis_client.ttl(key)
            retry_after = max(0, ttl if ttl > 0 else window)
            logger.warning(f"Rate limit exceeded: {category}/{identifier} ({count}/{limit})")
            return False, 0, retry_after
        
        return True, remaining, 0
    except Exception as e:
        logger.warning(f"Rate limit check failed: {e}")
        return True, limit, 0


def check_emergency_rate_limit(email: str) -> Tuple[bool, int]:
    """Check emergency access request rate limit."""
    allowed, remaining, _ = check_rate_limit(
        email, 'emergency_request', EMERGENCY_REQUEST_LIMIT, RATE_WINDOW
    )
    return allowed, remaining


def track_verification_attempt(token_hash: str) -> Tuple[bool, int]:
    """Track emergency token verification attempts."""
    allowed, remaining, _ = check_rate_limit(
        token_hash[:16], 'emergency_verify', EMERGENCY_VERIFY_LIMIT, 900
    )
    return allowed, remaining


def check_login_rate_limit(email: str) -> Tuple[bool, int]:
    """Check login attempt rate limit per email."""
    allowed, remaining, _ = check_rate_limit(
        email, 'login', LOGIN_ATTEMPT_LIMIT, RATE_WINDOW
    )
    return allowed, remaining


def check_auth_rate_limit(ip_address: str) -> Tuple[bool, int]:
    """Check auth endpoint rate limit per IP."""
    allowed, remaining, _ = check_rate_limit(
        ip_address, 'auth_ip', AUTH_REQUEST_LIMIT, RATE_WINDOW
    )
    return allowed, remaining


#  Emergency Sessions 
def create_emergency_session(session_id: str, user_id: str, ttl: int = SESSION_TTL) -> bool:
    """Store emergency session in Redis."""
    if not redis_client.available:
        logger.error("Cannot create emergency session - Redis unavailable")
        return False

    key = f"{SESSION_CACHE}:{session_id}"
    value = json.dumps({
        'user_id': user_id,
        'auth_source': 'emergency',
        'created_at': time.time()
    })
    
    result = redis_client.setex(key, ttl, value)
    return result is not False


def get_emergency_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve emergency session from Redis."""
    if not redis_client.available:
        return None

    key = f"{SESSION_CACHE}:{session_id}"
    value = redis_client.get(key)
    
    if value:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            logger.error(f"Invalid session data for {session_id}")
            return None
    return None


def revoke_emergency_session(session_id: str) -> bool:
    """Delete emergency session from Redis."""
    if not redis_client.available:
        return False
    
    key = f"{SESSION_CACHE}:{session_id}"
    return redis_client.delete(key) > 0


#  Provisioning Lock 
def acquire_provision_lock(user_id: str) -> bool:
    """
    Acquire a lock for user provisioning to prevent duplicate DB writes.
    Uses Redis SET NX (set if not exists).
    """
    if not redis_client.available:
        return True  # Allow if Redis unavailable
    
    try:
        key = f"{PROVISION_LOCK}:{user_id}"
        # SET NX with TTL
        result = redis_client.set(key, "1", ex=PROVISION_LOCK_TTL)
        
        # redis_client.set doesn't support NX directly, use raw set
        # Fallback: check and set
        if redis_client.exists(key):
            return False  # Lock already held
        
        redis_client.setex(key, PROVISION_LOCK_TTL, "1")
        return True
    except Exception:
        return True  # Allow if Redis fails


def release_provision_lock(user_id: str):
    """Release the provisioning lock."""
    if not redis_client.available:
        return
    
    key = f"{PROVISION_LOCK}:{user_id}"
    redis_client.delete(key)


#  Firebase Token Cache (legacy compatibility) 
def cache_firebase_token(token: str, decoded_data: Dict[str, Any], ttl: int = TOKEN_CACHE_TTL) -> bool:
    """Legacy wrapper for cache_token_verification."""
    return cache_token_verification(token, decoded_data)


def get_cached_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """Legacy wrapper for get_cached_token_verification."""
    return get_cached_token_verification(token)


#  Utility 
def is_redis_available() -> bool:
    """Check if Redis is currently available."""
    return redis_client.available and redis_client.ping()


def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics for monitoring."""
    if not redis_client.available:
        return {'available': False}
    
    try:
        return {
            'available': True,
            'ping': redis_client.ping()
        }
    except Exception as e:
        return {'available': False, 'error': str(e)}