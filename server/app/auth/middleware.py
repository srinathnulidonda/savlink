# server/app/auth/middleware.py
import time
import hashlib
from functools import wraps
from flask import request, g
from app.responses import error_response
from app.auth.firebase import verify_id_token, extract_user_info
from app.auth.provisioning import provision_user_cached
from app.auth.sessions import verify_emergency_session
from app.auth.redis import (
    get_cached_user_data,
    cache_user_data,
    check_auth_rate_limit
)
import logging

logger = logging.getLogger(__name__)

_local_auth = {}
_LOCAL_TTL = 30
_LOCAL_MAX = 100


def _token_key(token):
    return hashlib.sha256(token.encode()).hexdigest()[:20]


def _local_get(token):
    key = _token_key(token)
    entry = _local_auth.get(key)
    if entry and entry[2] > time.time():
        return entry[0], entry[1]
    if entry:
        _local_auth.pop(key, None)
    return None, None


def _local_set(token, user_data, source):
    now = time.time()
    if len(_local_auth) >= _LOCAL_MAX:
        expired = [k for k, v in _local_auth.items() if v[2] <= now]
        for k in expired:
            del _local_auth[k]
        if len(_local_auth) >= _LOCAL_MAX:
            oldest = min(_local_auth, key=lambda k: _local_auth[k][2])
            del _local_auth[oldest]
    _local_auth[_token_key(token)] = (user_data, source, now + _LOCAL_TTL)


def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start = time.time()

        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return error_response('Authorization header required', 401, 'AUTH_MISSING')

        if not auth_header.startswith('Bearer '):
            return error_response('Invalid authorization format', 401, 'AUTH_FORMAT')

        token = auth_header[7:].strip()
        if not token or len(token) < 100:
            return error_response('Invalid token', 401, 'AUTH_INVALID')

        try:
            user, source = _local_get(token)
            if user:
                g.current_user = user
                g.auth_source = f'{source}_local'
                return f(*args, **kwargs)

            client_ip = _get_client_ip()
            is_allowed, _ = check_auth_rate_limit(client_ip)
            if not is_allowed:
                return error_response('Too many requests', 429, 'RATE_LIMITED')

            user, source = _authenticate_firebase(token)
            if user:
                _local_set(token, user, source)
                g.current_user = user
                g.auth_source = source

                dur = (time.time() - start) * 1000
                if dur > 500:
                    logger.warning("Slow auth: %.0fms for %s (%s)",
                                   dur, user.get('id', '?')[:8], source)
                return f(*args, **kwargs)

            emergency_user = verify_emergency_session(token)
            if emergency_user:
                user_dict = emergency_user.to_dict() if hasattr(emergency_user, 'to_dict') else emergency_user
                g.current_user = user_dict
                g.auth_source = 'emergency'
                return f(*args, **kwargs)

            return error_response('Invalid or expired token', 401, 'AUTH_EXPIRED')

        except Exception as e:
            logger.error("Auth error: %s", e, exc_info=True)
            return error_response('Authentication failed', 500, 'AUTH_ERROR')

    return decorated_function


def _authenticate_firebase(token):
    decoded_token = verify_id_token(token)
    if not decoded_token:
        return None, None

    user_info = extract_user_info(decoded_token)
    uid = user_info.get('uid')
    if not uid:
        return None, None

    user_data = get_cached_user_data(uid)
    if user_data:
        return user_data, 'firebase_cached'

    try:
        user = provision_user_cached(user_info)
        if user:
            user_dict = user.to_dict()
            cache_user_data(uid, user_dict)
            return user_dict, 'firebase'
        return None, None
    except Exception as e:
        logger.error("Provisioning failed for %s: %s", uid[:8], e, exc_info=True)
        return None, None


def _get_client_ip():
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.headers.get('X-Real-IP', request.remote_addr or '0.0.0.0').strip()


def require_verified_email(f):
    @wraps(f)
    @require_auth
    def decorated_function(*args, **kwargs):
        user = g.current_user
        verified = user.get('email_verified', False) if isinstance(user, dict) else getattr(user, 'email_verified', False)
        if not verified and g.auth_source != 'emergency':
            return error_response('Email verification required', 403, 'EMAIL_NOT_VERIFIED')
        return f(*args, **kwargs)
    return decorated_function


def optional_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        g.current_user = None
        g.auth_source = None

        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
            if token and len(token) >= 100:
                try:
                    user, source = _local_get(token)
                    if not user:
                        user, source = _authenticate_firebase(token)
                        if user:
                            _local_set(token, user, source)
                    if user:
                        g.current_user = user
                        g.auth_source = source
                except Exception:
                    pass
        return f(*args, **kwargs)
    return decorated_function