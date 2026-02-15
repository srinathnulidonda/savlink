# server/app/dashboard/__init__.py
from flask import Blueprint

dashboard_bp = Blueprint('dashboard', __name__)

from . import routes