# server/app/auth/routes.py
from flask import g, request
from app.auth import auth_bp
from app.auth.middleware import require_auth
from app.auth.emergency.service import request_emergency_access, verify_emergency_token
from app.responses import success_response, error_response
import logging

logger = logging.getLogger(__name__)

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current authenticated user information"""
    try:
        if not hasattr(g, 'current_user') or g.current_user is None:
            logger.error("No current_user in g object")
            return error_response('User not found in request context', 500)
        
        user_dict = g.current_user.to_dict()
        return success_response(user_dict)
    except AttributeError as e:
        logger.error(f"AttributeError in /auth/me: {e}", exc_info=True)
        return error_response('User data format error', 500)
    except Exception as e:
        logger.error(f"Unexpected error in /auth/me: {e}", exc_info=True)
        return error_response('Internal server error', 500)

@auth_bp.route('/session', methods=['GET'])
@require_auth
def get_session_info():
    """Get current session information including auth source"""
    try:
        if not hasattr(g, 'current_user') or g.current_user is None:
            logger.error("No current_user in session endpoint")
            return error_response('User not found in request context', 500)
            
        session_data = {
            'user': g.current_user.to_dict(),
            'auth_source': getattr(g, 'auth_source', 'unknown'),
            'is_emergency': getattr(g, 'auth_source', None) == 'emergency'
        }
        
        return success_response(session_data)
    except Exception as e:
        logger.error(f"Error in /auth/session: {e}", exc_info=True)
        return error_response('Internal server error', 500)

@auth_bp.route('/emergency/request', methods=['POST'])
def request_emergency():
    """Request emergency access token"""
    try:
        data = request.get_json()
        
        if not data:
            return error_response('Invalid request body', 400)
            
        email = data.get('email')
        
        if not email:
            return error_response('Email is required', 400)
        
        # Validate email format
        if not isinstance(email, str) or '@' not in email:
            return error_response('Invalid email format', 400)
        
        # Get client IP
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if client_ip and ',' in client_ip:
            # Take the first IP if there are multiple
            client_ip = client_ip.split(',')[0].strip()
        
        logger.info(f"Emergency access requested for email: {email} from IP: {client_ip}")
        
        success = request_emergency_access(email, client_ip)
        
        if success:
            return success_response(
                message='Emergency access token sent to your email'
            )
        else:
            return error_response('Failed to send emergency access token', 400)
            
    except Exception as e:
        logger.error(f"Error in emergency request: {e}", exc_info=True)
        return error_response('Internal server error', 500)

@auth_bp.route('/emergency/verify', methods=['POST'])
def verify_emergency():
    """Verify emergency access token and create session"""
    try:
        data = request.get_json()
        
        if not data:
            return error_response('Invalid request body', 400)
            
        email = data.get('email')
        token = data.get('token')
        
        if not email or not token:
            return error_response('Email and token are required', 400)
        
        # Validate inputs
        if not isinstance(email, str) or '@' not in email:
            return error_response('Invalid email format', 400)
            
        if not isinstance(token, str) or len(token) < 10:
            return error_response('Invalid token format', 400)
        
        # Get client IP
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if client_ip and ',' in client_ip:
            client_ip = client_ip.split(',')[0].strip()
        
        logger.info(f"Emergency verification attempt for email: {email} from IP: {client_ip}")
        
        session_token = verify_emergency_token(email, token, client_ip)
        
        if session_token:
            logger.info(f"Emergency access granted for email: {email}")
            return success_response({
                'token': session_token,
                'type': 'emergency',
                'expires_in': 3600  # 1 hour
            })
        else:
            logger.warning(f"Emergency verification failed for email: {email}")
            return error_response('Invalid or expired token', 400)
            
    except Exception as e:
        logger.error(f"Error in emergency verification: {e}", exc_info=True)
        return error_response('Internal server error', 500)

@auth_bp.route('/health', methods=['GET'])
def auth_health():
    """Health check for auth service"""
    try:
        # Basic health check - can be expanded
        health_status = {
            'service': 'auth',
            'status': 'healthy',
            'timestamp': __import__('datetime').datetime.utcnow().isoformat()
        }
        
        # Check if we can import required modules
        try:
            from app.auth.firebase import _firebase_app
            health_status['firebase'] = 'configured' if _firebase_app else 'not configured'
        except Exception:
            health_status['firebase'] = 'error'
        
        return success_response(health_status)
    except Exception as e:
        logger.error(f"Error in auth health check: {e}", exc_info=True)
        return error_response('Auth service unhealthy', 503)