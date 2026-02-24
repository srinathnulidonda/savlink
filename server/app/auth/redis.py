# server/app/auth/redis.py
import hashlib
import json
import time
import logging
from typing import Optional, Dict, Any, Tuple
from app.extensions import redis_client

logger = logging.getLogger(__name__)

PREFIX = "savlink"
TOKEN_CACHE_TTL = 300
USER_CACHE_TTL = 600
SESSION_TTL = 3600
RATE_WINDOW = 3600
EMERGENCY_REQUEST_LIMIT = 3
EMERGENCY_VERIFY_LIMIT = 10
AUTH_RATE_LIMIT = 60


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ── token cache ──────────────────────────────────────────────────────

def cache_token_verification(token: str, decoded: Dict[str, Any]) -> bool:
    if not redis_client.available:
        return False
    try:
        data = {
            'uid': decoded.get('uid'),
            'email': decoded.get('email'),
            'name': decoded.get('name'),
            'picture': decoded.get('picture'),
            'email_verified': decoded.get('email_verified', False),
            'firebase': decoded.get('firebase', {}),
            'cached_at': time.time(),
        }
        return redis_client.setex(f"{PREFIX}:token:{_hash(token)}", TOKEN_CACHE_TTL, json.dumps(data))
    except Exception as e:
        logger.warning("Token cache write failed: %s", e)
        return False


def get_cached_token_verification(token: str) -> Optional[Dict[str, Any]]:
    if not redis_client.available:
        return None
    try:
        raw = redis_client.get(f"{PREFIX}:token:{_hash(token)}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


def invalidate_token_cache(token: str) -> bool:
    if not redis_client.available:
        return False
    return redis_client.delete(f"{PREFIX}:token:{_hash(token)}") > 0


# ── user cache ───────────────────────────────────────────────────────

def cache_user_data(user_id: str, data: Dict[str, Any]) -> bool:
    if not redis_client.available:
        return False
    try:
        safe = {
            'id': data.get('id'), 'email': data.get('email'),
            'name': data.get('name'), 'avatar_url': data.get('avatar_url'),
            'auth_provider': data.get('auth_provider'),
            'created_at': data.get('created_at'),
            'last_login_at': data.get('last_login_at'),
            'emergency_enabled': data.get('emergency_enabled', False),
        }
        return redis_client.setex(f"{PREFIX}:user:{user_id}", USER_CACHE_TTL, json.dumps(safe))
    except Exception as e:
        logger.warning("User cache write failed: %s", e)
        return False


def get_cached_user_data(user_id: str) -> Optional[Dict[str, Any]]:
    if not redis_client.available:
        return None
    try:
        raw = redis_client.get(f"{PREFIX}:user:{user_id}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


def invalidate_user_cache(user_id: str) -> bool:
    if not redis_client.available:
        return False
    return redis_client.delete(f"{PREFIX}:user:{user_id}") > 0


# ── rate limiting ────────────────────────────────────────────────────

def _check_rate(identifier: str, category: str, limit: int, window: int = RATE_WINDOW) -> Tuple[bool, int]:
    if not redis_client.available:
        return True, limit
    try:
        key = f"{PREFIX}:rate:{category}:{identifier}"
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, window)
        if count is None:
            return True, limit
        return count <= limit, max(0, limit - count)
    except Exception:
        return True, limit


def check_auth_rate_limit(ip: str) -> Tuple[bool, int]:
    return _check_rate(ip, 'auth', AUTH_RATE_LIMIT)


def check_emergency_rate_limit(email: str) -> Tuple[bool, int]:
    return _check_rate(email, 'emergency_req', EMERGENCY_REQUEST_LIMIT)


def track_verification_attempt(token_hash: str) -> Tuple[bool, int]:
    return _check_rate(token_hash[:16], 'emergency_verify', EMERGENCY_VERIFY_LIMIT, 900)


# ── emergency sessions ──────────────────────────────────────────────

def create_emergency_session(session_id: str, user_id: str, ttl: int = SESSION_TTL) -> bool:
    if not redis_client.available:
        return False
    data = json.dumps({'user_id': user_id, 'auth_source': 'emergency', 'created_at': time.time()})
    return redis_client.setex(f"{PREFIX}:session:{session_id}", ttl, data) is not False


def get_emergency_session(session_id: str) -> Optional[Dict[str, Any]]:
    if not redis_client.available:
        return None
    try:
        raw = redis_client.get(f"{PREFIX}:session:{session_id}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


def revoke_emergency_session(session_id: str) -> bool:
    if not redis_client.available:
        return False
    return redis_client.delete(f"{PREFIX}:session:{session_id}") > 0


def is_redis_available() -> bool:
    return redis_client.available and redis_client.ping()