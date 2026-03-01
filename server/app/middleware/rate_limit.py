# server/app/middleware/rate_limit.py

import time
import logging
from functools import wraps
from flask import request, g
from app.extensions import redis_client
from app.responses import error_response

logger = logging.getLogger(__name__)

# In-memory fallback when Redis is down
_local_counters = {}
_local_cleanup_time = 0


def _cleanup_local():
    global _local_cleanup_time
    now = time.time()
    if now - _local_cleanup_time < 60:
        return
    _local_cleanup_time = now
    expired = [k for k, (_, exp) in _local_counters.items() if exp < now]
    for k in expired:
        del _local_counters[k]


def _get_identifier():
    """Get user ID if authenticated, otherwise IP."""
    user = getattr(g, 'current_user', None)
    if user:
        uid = user.get('id') if isinstance(user, dict) else getattr(user, 'id', None)
        if uid:
            return f'user:{uid}'
    return f'ip:{request.remote_addr}'


def rate_limit(max_requests=60, window_seconds=60, key_prefix='rl'):
    """
    Decorator for rate limiting.
    Uses Redis if available, falls back to in-memory.
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            identifier = _get_identifier()
            key = f'{key_prefix}:{identifier}'

            allowed, remaining, reset_at = _check_rate(
                key, max_requests, window_seconds
            )

            if not allowed:
                return error_response(
                    'Too many requests. Please wait.',
                    429,
                    code='RATE_LIMITED'
                )

            response = f(*args, **kwargs)

            # Add rate limit headers
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Limit'] = str(max_requests)
                response.headers['X-RateLimit-Remaining'] = str(remaining)
                response.headers['X-RateLimit-Reset'] = str(int(reset_at))

            return response
        return wrapped
    return decorator


def _check_rate(key, max_requests, window_seconds):
    """Returns (allowed, remaining, reset_timestamp)."""
    now = time.time()
    reset_at = now + window_seconds

    if redis_client.available:
        return _check_redis(key, max_requests, window_seconds, now)

    return _check_local(key, max_requests, window_seconds, now)


def _check_redis(key, max_requests, window_seconds, now):
    try:
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, window_seconds)

        ttl = redis_client._exec(redis_client._client.ttl, key) or window_seconds
        reset_at = now + ttl
        remaining = max(0, max_requests - (count or 0))
        allowed = (count or 0) <= max_requests

        return allowed, remaining, reset_at
    except Exception:
        return True, max_requests, now + window_seconds


def _check_local(key, max_requests, window_seconds, now):
    _cleanup_local()

    if key in _local_counters:
        count, expires = _local_counters[key]
        if now > expires:
            _local_counters[key] = (1, now + window_seconds)
            return True, max_requests - 1, now + window_seconds
        count += 1
        _local_counters[key] = (count, expires)
        remaining = max(0, max_requests - count)
        return count <= max_requests, remaining, expires
    else:
        _local_counters[key] = (1, now + window_seconds)
        return True, max_requests - 1, now + window_seconds


# ═══ Pre-built rate limiters for common patterns ═══

# General API: 120 requests/minute
api_limiter = rate_limit(max_requests=120, window_seconds=60, key_prefix='rl:api')

# Write operations: 30/minute
write_limiter = rate_limit(max_requests=30, window_seconds=60, key_prefix='rl:write')

# Auth endpoints: 10/minute
auth_limiter = rate_limit(max_requests=10, window_seconds=60, key_prefix='rl:auth')

# Search: 30/minute
search_limiter = rate_limit(max_requests=30, window_seconds=60, key_prefix='rl:search')

# Metadata extraction: 20/minute
metadata_limiter = rate_limit(max_requests=20, window_seconds=60, key_prefix='rl:meta')