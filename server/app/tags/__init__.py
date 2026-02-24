# server/app/tags/__init__.py
from flask import Blueprint
tags_bp = Blueprint('tags', __name__)
from . import routes  # noqa: E402, F401