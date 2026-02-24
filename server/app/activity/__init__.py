# server/app/activity/__init__.py

from flask import Blueprint
activity_bp = Blueprint('activity', __name__)
from . import routes  # noqa: E402, F401