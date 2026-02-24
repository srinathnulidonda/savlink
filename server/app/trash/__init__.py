# server/app/trash/__init__.py

from flask import Blueprint
trash_bp = Blueprint('trash', __name__)
from . import routes  # noqa: E402, F401