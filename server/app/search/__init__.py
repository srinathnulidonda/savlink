# server/app/search/__init__.py
from flask import Blueprint
search_bp = Blueprint('search', __name__)
from . import routes  # noqa: E402, F401