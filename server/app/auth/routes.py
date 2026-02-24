# server/app/auth/routes.py
import time
import logging
from flask import g, request
from app.auth import auth_bp
from app.auth.middleware import require_auth, get_client_ip
from app.auth.emergency.service import request_emergency_access, verify_emergency_token
from app.auth.redis import check_auth_rate_limit, is_redis_available
from app.responses import success_response, error_response

logger = logging.getLogger(__name__)


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    user = g.current_user
    if user is None:
        return error_response('User not found', 500)
    return success_response(user if isinstance(user, dict) else user.to_dict())


@auth_bp.route('/session', methods=['GET'])
@require_auth
def get_session_info():
    user = g.current_user
    if user is None:
        return error_response('No active session', 500)
    return success_response({
        'user': user if isinstance(user, dict) else user.to_dict(),
        'auth_source': getattr(g, 'auth_source', 'unknown'),
        'is_emergency': getattr(g, 'auth_source', None) == 'emergency',
        'timestamp': time.time(),
    })


@auth_bp.route('/emergency/request', methods=['POST'])
def request_emergency():
    allowed, _ = check_auth_rate_limit(get_client_ip())
    if not allowed:
        return error_response('Too many requests', 429, 'RATE_LIMITED')

    data = request.get_json(silent=True)
    if not data:
        return error_response('Invalid request body', 400)

    email = data.get('email', '').strip().lower()
    if not email or '@' not in email or len(email) > 255:
        return error_response('Valid email is required', 400, 'INVALID_EMAIL')

    request_emergency_access(email, get_client_ip())
    return success_response(
        message='If an account exists with this email, an emergency access token has been sent.'
    )


@auth_bp.route('/emergency/verify', methods=['POST'])
def verify_emergency():
    allowed, _ = check_auth_rate_limit(get_client_ip())
    if not allowed:
        return error_response('Too many requests', 429, 'RATE_LIMITED')

    data = request.get_json(silent=True)
    if not data:
        return error_response('Invalid request body', 400)

    email = data.get('email', '').strip().lower()
    token = data.get('token', '').strip()

    if not email or '@' not in email:
        return error_response('Valid email is required', 400, 'INVALID_EMAIL')
    if not token or len(token) < 10:
        return error_response('Valid token is required', 400, 'INVALID_TOKEN')

    session_token = verify_emergency_token(email, token, get_client_ip())
    if session_token:
        return success_response({'token': session_token, 'type': 'emergency', 'expires_in': 3600})
    return error_response('Invalid or expired token', 401, 'INVALID_TOKEN')


@auth_bp.route('/health', methods=['GET'])
def auth_health():
    from app.auth.firebase import _firebase_app
    return success_response({
        'service': 'auth',
        'status': 'healthy',
        'firebase': 'configured' if _firebase_app else 'not_configured',
        'redis': is_redis_available(),
        'timestamp': time.time(),
    })