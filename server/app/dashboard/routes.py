# server/app/dashboard/routes.py
from flask import request, g
from app.dashboard import dashboard_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.dashboard import views
from app.dashboard.serializers import serialize_links
import logging

logger = logging.getLogger(__name__)


def _uid():
    u = g.current_user
    if isinstance(u, dict):
        return u.get('id') or u.get('uid')
    return getattr(u, 'id', getattr(u, 'uid', None))


def _int(val, default, lo=1, hi=100):
    try:
        return max(lo, min(int(val), hi))
    except (ValueError, TypeError):
        return default


@dashboard_bp.route('/links', methods=['GET'])
@require_auth
def get_links():
    try:
        uid = _uid()
        view = request.args.get('view', 'all')
        search = request.args.get('search', '').strip() or None
        cursor = request.args.get('cursor')
        limit = _int(request.args.get('limit'), 20)
        sort = request.args.get('sort', 'created_at')
        order = request.args.get('order', 'desc')

        filters = {}
        if request.args.get('folder_id'):
            filters['folder_id'] = _int(request.args.get('folder_id'), None, 0, 2**31)
        if request.args.get('link_type'):
            filters['link_type'] = request.args.get('link_type')
        if request.args.get('starred') == 'true':
            filters['starred_only'] = True
        if request.args.get('pinned') == 'true':
            filters['pinned_only'] = True
        if request.args.get('unassigned_only') == 'true':
            filters['unassigned_only'] = True
        tag_str = request.args.get('tag_ids')
        if tag_str:
            try:
                filters['tag_ids'] = [int(x) for x in tag_str.split(',') if x.strip()]
            except ValueError:
                pass

        links, next_cursor, meta = views.resolve_view(uid, view, search, cursor, limit, sort, order, **filters)
        return success_response({'links': serialize_links(links), 'meta': meta})
    except Exception as e:
        logger.error("GET /links error: %s", e, exc_info=True)
        return error_response('Failed to load links', 500)


@dashboard_bp.route('/stats', methods=['GET'])
@require_auth
def stats():
    try:
        return success_response({'stats': views.get_stats(_uid())})
    except Exception as e:
        logger.error("GET /stats error: %s", e, exc_info=True)
        return error_response('Failed to load stats', 500)


@dashboard_bp.route('/structure', methods=['GET'])
@require_auth
def structure():
    try:
        from app.folders.service import get_folder_tree
        return success_response({'folders': get_folder_tree(_uid())})
    except Exception as e:
        logger.error("GET /structure error: %s", e, exc_info=True)
        return error_response('Failed to load structure', 500)


@dashboard_bp.route('/home', methods=['GET'])
@require_auth
def home():
    try:
        return success_response(views.get_home_data(_uid()))
    except Exception as e:
        logger.error("GET /home error: %s", e, exc_info=True)
        return error_response('Failed to load dashboard', 500)


@dashboard_bp.route('/home/quick-access', methods=['GET'])
@require_auth
def quick_access():
    try:
        return success_response({'items': views.get_quick_access(_uid())})
    except Exception as e:
        logger.error("GET /home/quick-access error: %s", e, exc_info=True)
        return error_response('Failed to load quick access', 500)