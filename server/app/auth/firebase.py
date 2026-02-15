# server/app/auth/firebase.py
import json
import os
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from typing import Optional, Dict, Any
from app.auth.redis import cache_firebase_token, get_cached_firebase_token
import logging

logger = logging.getLogger(__name__)

_firebase_app = None

def initialize_firebase():
    global _firebase_app
    if _firebase_app:
        return _firebase_app
    
    config_json = os.environ.get('FIREBASE_CONFIG_JSON')
    if not config_json:
        raise ValueError("FIREBASE_CONFIG_JSON environment variable not set")
    
    try:
        config_dict = json.loads(config_json)
        cred = credentials.Certificate(config_dict)
        _firebase_app = firebase_admin.initialize_app(cred)
        return _firebase_app
    except Exception as e:
        raise ValueError(f"Failed to initialize Firebase: {str(e)}")

def verify_id_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify Firebase ID token with optional Redis caching"""
    try:
        # Check cache first (best-effort)
        cached_data = get_cached_firebase_token(token)
        if cached_data:
            logger.debug("Firebase token found in cache")
            return cached_data
        
        # Initialize Firebase if needed
        initialize_firebase()
        
        # Verify with Firebase
        decoded_token = firebase_auth.verify_id_token(token)
        
        # Cache the result (best-effort, don't fail if Redis is down)
        try:
            cache_firebase_token(token, decoded_token)
        except Exception as e:
            logger.debug(f"Failed to cache Firebase token: {e}")
        
        return decoded_token
        
    except firebase_auth.ExpiredIdTokenError:
        logger.debug("Firebase token expired")
        return None
    except firebase_auth.RevokedIdTokenError:
        logger.debug("Firebase token revoked")
        return None
    except firebase_auth.InvalidIdTokenError:
        logger.debug("Firebase token invalid")
        return None
    except Exception as e:
        logger.error(f"Firebase token verification error: {e}")
        return None

def extract_user_info(decoded_token: Dict[str, Any]) -> Dict[str, Any]:
    """Extract user information from decoded Firebase token"""
    return {
        'uid': decoded_token.get('uid'),
        'email': decoded_token.get('email'),
        'name': decoded_token.get('name'),
        'picture': decoded_token.get('picture'),
        'auth_provider': decoded_token.get('firebase', {}).get('sign_in_provider', 'password')
    }