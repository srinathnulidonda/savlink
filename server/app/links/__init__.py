# server/app/links/__init__.py
from flask import Blueprint

links_bp = Blueprint('links', __name__)

from . import routes