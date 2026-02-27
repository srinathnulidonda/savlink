# server/app/auth/firebase.py

import json
import os
import time
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from typing import Optional, Dict, Any
from app.auth.redis import (
    cache_token_verification,
    get_cached_token_verification,
    invalidate_token_cache
)
import logging

logger = logging.getLogger(__name__)

_firebase_app = None

#  Performance Metrics 
_metrics = {
    'cache_hits': 0,
    'cache_misses': 0,
    'verifications': 0,
    'errors': 0
}


def initialize_firebase():
    """Initialize Firebase Admin SDK (idempotent)."""
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
        logger.info("✅ Firebase Admin SDK initialized successfully")
        logger.info(f"Project ID: {config_dict.get('project_id')}")
        return _firebase_app
    except ValueError:
        # Already initialized
        _firebase_app = firebase_admin.get_app()
        logger.info("Firebase Admin SDK already initialized")
        return _firebase_app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}", exc_info=True)
        raise ValueError(f"Failed to initialize Firebase: {e}")


def verify_id_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Firebase ID token with Redis caching.
    
    Flow:
    1. Check Redis cache (fast path: ~1-5ms)
    2. If miss, verify with Firebase Admin SDK (~200-500ms)
    3. Cache result in Redis for 5 minutes
    
    Returns decoded token data or None if invalid.
    """
    if not token or len(token) < 100:
        logger.warning("Token validation failed: too short or empty")
        return None
    
    #  Step 1: Check Redis cache 
    cached = get_cached_token_verification(token)
    if cached:
        _metrics['cache_hits'] += 1
        logger.debug(f"Token cache HIT for uid={cached.get('uid', 'unknown')[:8]}")
        return cached
    
    _metrics['cache_misses'] += 1
    logger.debug("Token cache MISS - verifying with Firebase")
    
    #  Step 2: Verify with Firebase 
    try:
        initialize_firebase()
        
        start = time.time()
        decoded_token = firebase_auth.verify_id_token(token, check_revoked=True)
        duration = (time.time() - start) * 1000
        
        _metrics['verifications'] += 1
        
        uid = decoded_token.get('uid', 'unknown')
        logger.info(f"✅ Firebase token verified: uid={uid[:8]} in {duration:.0f}ms")
        
        if duration > 1000:
            logger.warning(f"⚠️  Slow Firebase verification: {duration:.0f}ms")
        
        #  Step 3: Cache the result 
        cache_token_verification(token, decoded_token)
        
        return decoded_token
        
    except firebase_auth.ExpiredIdTokenError as e:
        logger.warning(f"Token expired: {str(e)[:100]}")
        invalidate_token_cache(token)
        return None
    except firebase_auth.RevokedIdTokenError as e:
        logger.warning(f"Token revoked: {str(e)[:100]}")
        invalidate_token_cache(token)
        return None
    except firebase_auth.InvalidIdTokenError as e:
        logger.warning(f"Invalid token format: {str(e)[:100]}")
        return None
    except firebase_auth.CertificateFetchError as e:
        # Network issue fetching Google's public keys
        logger.error(f"Firebase certificate fetch error: {e}")
        _metrics['errors'] += 1
        return None
    except Exception as e:
        logger.error(f"Firebase verification error: {e}", exc_info=True)
        _metrics['errors'] += 1
        return None


def extract_user_info(decoded_token: Dict[str, Any]) -> Dict[str, Any]:
    """Extract normalized user info from decoded token (cached or fresh)."""
    firebase_data = decoded_token.get('firebase', {})
    
    return {
        'uid': decoded_token.get('uid'),
        'email': decoded_token.get('email'),
        'name': decoded_token.get('name'),
        'picture': decoded_token.get('picture'),
        'email_verified': decoded_token.get('email_verified', False),
        'auth_provider': decoded_token.get('provider', firebase_data.get('sign_in_provider', 'password'))
    }


def get_verification_metrics() -> Dict[str, Any]:
    """Get verification performance metrics."""
    total = _metrics['cache_hits'] + _metrics['cache_misses']
    hit_rate = (_metrics['cache_hits'] / total * 100) if total > 0 else 0
    
    return {
        **_metrics,
        'total_requests': total,
        'cache_hit_rate': f"{hit_rate:.1f}%"
    }