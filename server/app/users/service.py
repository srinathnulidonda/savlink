# server/app/users/service.py
from typing import Optional
from app.models import User
from app.extensions import db


def get_user_by_id(user_id: str) -> Optional[User]:
    return User.query.filter_by(id=user_id).first()


def get_user_by_email(email: str) -> Optional[User]:
    return User.query.filter_by(email=email).first()


def enable_emergency_access(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False
    user.emergency_enabled = True
    db.session.commit()
    return True


def disable_emergency_access(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False
    user.emergency_enabled = False
    db.session.commit()
    return True