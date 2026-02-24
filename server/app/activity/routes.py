# server/app/activity/routes.py

from flask import request, g
from app.activity import activity_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.activity import service


@activity_bp.route('', methods=['GET'])
@require_auth
def get_activity():
    try:
        limit = min(max(1, int(request.args.get('limit', 30))), 100)
    except ValueError:
        limit = 30
    cursor = request.args.get('cursor')
    entity_type = request.args.get('entity_type')
    action = request.args.get('action')
    data = service.get_user_activity(
        g.current_user.id, limit=limit, cursor=cursor,
        entity_type=entity_type, action=action,
    )
    return success_response(data)


@activity_bp.route('/feed', methods=['GET'])
@require_auth
def feed():
    """Real-time feed from Redis (last 50 actions, <10ms)."""
    data = service.get_activity_feed(g.current_user.id)
    return success_response({'feed': data})


@activity_bp.route('/stats', methods=['GET'])
@require_auth
def activity_stats():
    try:
        days = min(max(1, int(request.args.get('days', 30))), 365)
    except ValueError:
        days = 30
    return success_response({'stats': service.get_activity_stats(g.current_user.id, days)})


@activity_bp.route('/clear', methods=['POST'])
@require_auth
def clear_history():
    data = request.get_json() or {}
    days = data.get('older_than_days', 90)
    deleted = service.clear_old_activity(g.current_user.id, days)
    return success_response({'deleted': deleted})