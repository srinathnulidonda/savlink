# server/app/auth/middleware.py
from functools import wraps
from flask import request, g
from app.responses import error_response
from app.auth.firebase import verify_id_token, extract_user_info
from app.auth.provisioning import provision_user
from app.auth.sessions import verify_emergency_session
from app.models import User
import logging

logger = logging.getLogger(__name__)

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return error_response('Authorization header missing', 401)
        
        if not auth_header.startswith('Bearer '):
            return error_response('Invalid authorization header format', 401)
        
        token = auth_header[7:]
        
        try:
            # Try Firebase token first
            decoded_token = verify_id_token(token)
            if decoded_token:
                user_info = extract_user_info(decoded_token)
                logger.info(f"Firebase auth successful for uid: {user_info.get('uid')}")
                
                try:
                    user = provision_user(user_info)
                    g.current_user = user
                    g.auth_source = 'firebase'
                    return f(*args, **kwargs)
                except Exception as e:
                    logger.error(f"User provisioning failed: {e}", exc_info=True)
                    return error_response('Failed to provision user', 500)
            
            # Try emergency session token
            user = verify_emergency_session(token)
            if user:
                g.current_user = user
                g.auth_source = 'emergency'
                return f(*args, **kwargs)
            
            return error_response('Invalid or expired token', 401)
            
        except Exception as e:
            logger.error(f"Auth middleware error: {e}", exc_info=True)
            return error_response('Authentication failed', 500)
    
    return decorated_function