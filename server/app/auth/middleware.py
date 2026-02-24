# server/app/auth/middleware.py
import logging
from functools import wraps
from flask import request, g
from app.responses import error_response
from app.auth.firebase import verify_id_token, extract_user_info
from app.auth.provisioning import provision_user_cached
from app.auth.sessions import verify_emergency_session
from app.auth.redis import get_cached_user_data, cache_user_data, check_auth_rate_limit

logger = logging.getLogger(__name__)


class UserProxy(dict):
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"User has no attribute '{name}'")

    def __setattr__(self, name, value):
        self[name] = value

    def __delattr__(self, name):
        try:
            del self[name]
        except KeyError:
            raise AttributeError(f"User has no attribute '{name}'")


def _wrap_user(data):
    if data is None:
        return None
    if isinstance(data, UserProxy):
        return data
    if isinstance(data, dict):
        return UserProxy(data)
    return data


def get_client_ip() -> str:
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.headers.get('X-Real-IP', request.remote_addr or '0.0.0.0').strip()


def _authenticate_firebase(token: str):
    decoded = verify_id_token(token)
    if not decoded:
        return None, None

    info = extract_user_info(decoded)
    uid = info.get('uid')
    if not uid:
        return None, None

    cached = get_cached_user_data(uid)
    if cached:
        return cached, 'firebase_cached'

    try:
        user = provision_user_cached(info)
        return (user.to_dict(), 'firebase') if user else (None, None)
    except Exception as e:
        logger.error("Provisioning failed for %s: %s", uid, e)
        return None, None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return error_response('Authorization header required', 401, 'AUTH_MISSING')
        if not auth_header.startswith('Bearer '):
            return error_response('Invalid authorization format', 401, 'AUTH_FORMAT')

        token = auth_header[7:].strip()
        if not token or len(token) < 100:
            return error_response('Invalid token', 401, 'AUTH_INVALID')

        allowed, _ = check_auth_rate_limit(get_client_ip())
        if not allowed:
            return error_response('Too many requests', 429, 'RATE_LIMITED')

        try:
            user, source = _authenticate_firebase(token)
            if user:
                g.current_user = _wrap_user(user)
                g.auth_source = source
                return f(*args, **kwargs)

            emergency_user = verify_emergency_session(token)
            if emergency_user:
                data = emergency_user.to_dict() if hasattr(emergency_user, 'to_dict') else emergency_user
                g.current_user = _wrap_user(data)
                g.auth_source = 'emergency'
                return f(*args, **kwargs)

            return error_response('Invalid or expired token', 401, 'AUTH_EXPIRED')
        except Exception as e:
            logger.error("Auth error: %s", e, exc_info=True)
            return error_response('Authentication failed', 500, 'AUTH_ERROR')

    return decorated


def optional_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        g.current_user = None
        g.auth_source = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
            if token and len(token) >= 100:
                try:
                    user, source = _authenticate_firebase(token)
                    if user:
                        g.current_user = _wrap_user(user)
                        g.auth_source = source
                except Exception:
                    pass
        return f(*args, **kwargs)
    return decorated