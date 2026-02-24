# server/app/auth/firebase.py
import json
import os
import logging
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from typing import Optional, Dict, Any
from app.auth.redis import (
    cache_token_verification,
    get_cached_token_verification,
    invalidate_token_cache,
)

logger = logging.getLogger(__name__)
_firebase_app = None


def initialize_firebase():
    global _firebase_app
    if _firebase_app:
        return _firebase_app
    config_json = os.environ.get('FIREBASE_CONFIG_JSON')
    if not config_json:
        raise ValueError("FIREBASE_CONFIG_JSON not set")
    try:
        cred = credentials.Certificate(json.loads(config_json))
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized")
        return _firebase_app
    except ValueError:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app


def verify_id_token(token: str) -> Optional[Dict[str, Any]]:
    if not token or len(token) < 100:
        return None

    cached = get_cached_token_verification(token)
    if cached:
        return cached

    try:
        initialize_firebase()
        decoded = firebase_auth.verify_id_token(token, check_revoked=True)
        cache_token_verification(token, decoded)
        return decoded
    except (firebase_auth.ExpiredIdTokenError, firebase_auth.RevokedIdTokenError):
        invalidate_token_cache(token)
        return None
    except (firebase_auth.InvalidIdTokenError, firebase_auth.CertificateFetchError):
        return None
    except Exception as e:
        logger.error("Firebase verification error: %s", e)
        return None


def extract_user_info(decoded_token: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'uid': decoded_token.get('uid'),
        'email': decoded_token.get('email'),
        'name': decoded_token.get('name'),
        'picture': decoded_token.get('picture'),
        'email_verified': decoded_token.get('email_verified', False),
        'auth_provider': decoded_token.get('firebase', {}).get('sign_in_provider', 'password'),
    }