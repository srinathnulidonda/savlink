# server/app/auth/sessions.py
import logging
from typing import Optional
from app.models import User
from app.auth.redis import get_emergency_session, is_redis_available

logger = logging.getLogger(__name__)


def verify_emergency_session(token: str) -> Optional[User]:
    if not is_redis_available():
        return None
    session = get_emergency_session(token)
    if not session or session.get('auth_source') != 'emergency':
        return None
    user_id = session.get('user_id')
    if not user_id:
        return None
    return User.query.filter_by(id=user_id).first()