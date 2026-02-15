# server/app/dashboard/home/routes.py

from flask import g
from app.dashboard import dashboard_bp
from app.auth.middleware import require_auth
from app.responses import success_response
from app.dashboard.home.service import (
    get_quick_access, get_recent_activity, get_home_stats
)

@dashboard_bp.route('/home/quick-access', methods=['GET'])
@require_auth
def home_quick_access():
    """Get quick access items for home dashboard"""
    items = get_quick_access(g.current_user.id)
    return success_response({'items': items})

@dashboard_bp.route('/home/recent', methods=['GET'])
@require_auth
def home_recent_activity():
    """Get recent activity for home dashboard"""
    activities = get_recent_activity(g.current_user.id)
    return success_response({'activities': activities})

@dashboard_bp.route('/home/stats', methods=['GET'])
@require_auth
def home_stats():
    """Get home dashboard stats"""
    stats = get_home_stats(g.current_user.id)
    return success_response({'stats': stats})