# server/app/redirect/__init__.py
from flask import Blueprint

redirect_bp = Blueprint('redirect', __name__)

from . import routes