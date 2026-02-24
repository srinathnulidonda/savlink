# server/app/users/__init__.py

from flask import Blueprint
users_bp = Blueprint('users', __name__)
from . import routes  # noqa: E402, F401
from .service import (
    get_user_by_id, get_user_by_email,
    enable_emergency_access, disable_emergency_access,
)