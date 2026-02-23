# server/app/dashboard/home/routes.py
# Home dashboard routes — overview, quick access, recent activity

from flask import g
from app.dashboard import dashboard_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.dashboard.home.service import (
    get_home_data,
    get_quick_access,
    get_recent_activity,
    get_home_stats,
)
import logging

logger = logging.getLogger(__name__)


def _uid():
    """Get user ID safely."""
    u = g.current_user
    if u is None:
        return None
    if isinstance(u, dict):
        return u.get('id') or u.get('uid')
    return getattr(u, 'id', getattr(u, 'uid', None))


@dashboard_bp.route('/home', methods=['GET'])
@require_auth
def home():
    """
    Combined home dashboard endpoint.
    
    Returns recent links, quick-access items, and summary stats
    in a single response (eliminates 3 separate API calls).
    """
    try:
        user_id = _uid()
        if not user_id:
            return error_response('Authentication required', 401)

        data = get_home_data(user_id)
        return success_response(data)

    except Exception as e:
        logger.error(f"GET /home error: {e}", exc_info=True)
        return error_response('Failed to load dashboard', 500)


@dashboard_bp.route('/home/quick-access', methods=['GET'])
@require_auth
def home_quick_access():
    """Get pinned/starred items for quick access."""
    try:
        user_id = _uid()
        if not user_id:
            return error_response('Authentication required', 401)

        items = get_quick_access(user_id)
        return success_response({'items': items})

    except Exception as e:
        logger.error(f"GET /home/quick-access error: {e}", exc_info=True)
        return error_response('Failed to load quick access', 500)


@dashboard_bp.route('/home/recent', methods=['GET'])
@require_auth
def home_recent_activity():
    """Get recent link activity (last 7 days)."""
    try:
        user_id = _uid()
        if not user_id:
            return error_response('Authentication required', 401)

        activities = get_recent_activity(user_id)
        return success_response({'activities': activities})

    except Exception as e:
        logger.error(f"GET /home/recent error: {e}", exc_info=True)
        return error_response('Failed to load recent activity', 500)


@dashboard_bp.route('/home/stats', methods=['GET'])
@require_auth
def home_stats():
    """Get lightweight home stats."""
    try:
        user_id = _uid()
        if not user_id:
            return error_response('Authentication required', 401)

        stats = get_home_stats(user_id)
        return success_response({'stats': stats})

    except Exception as e:
        logger.error(f"GET /home/stats error: {e}", exc_info=True)
        return error_response('Failed to load stats', 500)