# server/app/auth/middleware.py

import time
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


# ─── UserProxy: fixes 'dict' has no attribute 'id' everywhere ────────
class UserProxy(dict):
    """
    Dict subclass that allows BOTH dict-style and attribute-style access.
    
    This ensures g.current_user works with:
      - g.current_user.id          (attribute access — used in route handlers)
      - g.current_user['id']       (dict access — used in serialization)
      - g.current_user.get('id')   (safe dict access)
      - isinstance(user, dict)     (returns True — backward compatible)
    
    Eliminates the 'dict object has no attribute' errors across ALL routes.
    """
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

    def __repr__(self):
        return f"<UserProxy id={self.get('id')} email={self.get('email')}>"


def _wrap_user(user_data):
    """Wrap user data in UserProxy if it's a plain dict."""
    if user_data is None:
        return None
    if isinstance(user_data, UserProxy):
        return user_data
    if isinstance(user_data, dict):
        return UserProxy(user_data)
    # Already a model instance — has attribute access natively
    return user_data


def require_auth(f):
    """
    Authentication middleware with multi-layer caching.
    
    Auth flow:
    1. Extract Bearer token from header
    2. Rate limit check (Redis)
    3. Verify token (Redis cache → Firebase Admin SDK)
    4. Get user data (Redis cache → Database)
    5. Set g.current_user as UserProxy for the request
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()

        # ── Step 1: Extract token ──
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return error_response('Authorization header required', 401, 'AUTH_MISSING')

        if not auth_header.startswith('Bearer '):
            return error_response('Invalid authorization format. Use: Bearer <token>', 401, 'AUTH_FORMAT')

        token = auth_header[7:].strip()

        if not token or len(token) < 100:
            return error_response('Invalid token', 401, 'AUTH_INVALID')

        # ── Step 2: Rate limiting ──
        client_ip = _get_client_ip()
        is_allowed, remaining = check_auth_rate_limit(client_ip)

        if not is_allowed:
            logger.warning(f"Auth rate limit exceeded for IP: {client_ip}")
            return error_response('Too many requests', 429, 'RATE_LIMITED')

        try:
            # ── Step 3: Try Firebase token ──
            user, auth_source = _authenticate_firebase(token)

            if user:
                g.current_user = _wrap_user(user)      # ← WRAPPED
                g.auth_source = auth_source

                duration_ms = (time.time() - start_time) * 1000
                if duration_ms > 500:
                    logger.warning(f"Slow auth: {duration_ms:.0f}ms for {g.current_user.get('id', 'unknown')}")

                return f(*args, **kwargs)

            # ── Step 4: Try emergency session ──
            emergency_user = verify_emergency_session(token)

            if emergency_user:
                # emergency_user is a User model — wrap its dict form
                if hasattr(emergency_user, 'to_dict'):
                    g.current_user = _wrap_user(emergency_user.to_dict())
                else:
                    g.current_user = _wrap_user(emergency_user)
                g.auth_source = 'emergency'
                return f(*args, **kwargs)

            return error_response('Invalid or expired token', 401, 'AUTH_EXPIRED')

        except Exception as e:
            logger.error(f"Auth middleware error: {e}", exc_info=True)
            return error_response('Authentication failed', 500, 'AUTH_ERROR')

    return decorated_function


def _authenticate_firebase(token: str):
    """
    Verify Firebase token and get user data.
    Returns: (user_dict, auth_source) or (None, None)
    """
    decoded_token = verify_id_token(token)

    if not decoded_token:
        return None, None

    user_info = extract_user_info(decoded_token)
    uid = user_info.get('uid')

    if not uid:
        logger.error("Token verified but no UID found")
        return None, None

    # ── Try Redis cache first ──
    user_data = get_cached_user_data(uid)

    if user_data:
        return user_data, 'firebase_cached'

    # ── Cache miss — provision user in DB ──
    try:
        user = provision_user_cached(user_info)

        if user:
            user_dict = user.to_dict()
            cache_user_data(uid, user_dict)
            return user_dict, 'firebase'

        return None, None
    except Exception as e:
        logger.error(f"User provisioning failed for {uid}: {e}", exc_info=True)
        return None, None


def _get_client_ip() -> str:
    """Extract real client IP from request headers."""
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()

    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip.strip()

    return request.remote_addr or '0.0.0.0'


def require_verified_email(f):
    """Require email verification in addition to authentication."""
    @wraps(f)
    @require_auth
    def decorated_function(*args, **kwargs):
        user = g.current_user

        email_verified = user.get('email_verified', False) if isinstance(user, dict) else getattr(user, 'email_verified', False)

        if not email_verified and g.auth_source != 'emergency':
            return error_response('Email verification required', 403, 'EMAIL_NOT_VERIFIED')

        return f(*args, **kwargs)

    return decorated_function


def optional_auth(f):
    """Optional authentication — sets g.current_user if token provided, None otherwise."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        g.current_user = None
        g.auth_source = None

        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()

            if token and len(token) >= 100:
                try:
                    user, source = _authenticate_firebase(token)
                    if user:
                        g.current_user = _wrap_user(user)  # ← WRAPPED
                        g.auth_source = source
                except Exception:
                    pass

        return f(*args, **kwargs)

    return decorated_function