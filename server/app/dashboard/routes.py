# server/app/dashboard/routes.py
# Dashboard API routes — all endpoints under /api/dashboard

from flask import request, g
from app.dashboard import dashboard_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.dashboard.views import resolve_view, get_stats
from app.dashboard.service import serialize_links
import logging

logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────

def _uid():
    """
    Get user ID from g.current_user.
    Works with plain dict, UserProxy, and SQLAlchemy model.
    """
    u = g.current_user
    if u is None:
        return None
    if isinstance(u, dict):
        return u.get('id') or u.get('uid')
    return getattr(u, 'id', getattr(u, 'uid', None))


def _parse_int(value, default, minimum=1, maximum=100):
    """Safely parse an integer query param."""
    try:
        return max(minimum, min(int(value), maximum))
    except (ValueError, TypeError):
        return default


def _parse_bool(value):
    """Parse a boolean query param."""
    return str(value).lower() in ('true', '1', 'yes')


def _parse_int_list(value):
    """Parse a comma-separated list of integers."""
    if not value:
        return []
    try:
        return [int(x.strip()) for x in value.split(',') if x.strip()]
    except (ValueError, TypeError):
        return []


# ─── Routes ───────────────────────────────────────────────────────────

@dashboard_bp.route('/links', methods=['GET'])
@require_auth
def get_links():
    """
    Get paginated links with filtering, sorting, and search.
    
    Query params:
      view        — all|recent|starred|pinned|archive|expired  (default: all)
      search      — full-text search across title, URL, notes
      cursor      — pagination cursor (opaque string)
      limit       — items per page (1–100, default: 20)
      sort        — created_at|updated_at|title|click_count     (default: created_at)
      order       — asc|desc                                    (default: desc)
      folder_id   — filter by folder
      tag_ids     — filter by tags (comma-separated IDs)
      link_type   — saved|shortened
      starred     — true/false
      pinned      — true/false
      unassigned_only — true/false (links not in any folder)
      system_folder   — my_files (scope to non-archived active links)
    """
    try:
        user_id = _uid()
        if not user_id:
            return error_response('Authentication required', 401)

        # Parse all parameters
        view = request.args.get('view', 'all')
        search = request.args.get('search', '').strip() or None
        cursor = request.args.get('cursor')
        limit = _parse_int(request.args.get('limit'), default=20)
        sort = request.args.get('sort', 'created_at')
        order = request.args.get('order', 'desc')

        filters = {
            'system_folder': request.args.get('system_folder'),
            'folder_id': _parse_int(request.args.get('folder_id'), default=None, minimum=0, maximum=2**31),
            'tag_ids': _parse_int_list(request.args.get('tag_ids')),
            'link_type': request.args.get('link_type'),
            'starred_only': _parse_bool(request.args.get('starred')),
            'pinned_only': _parse_bool(request.args.get('pinned')),
            'unassigned_only': _parse_bool(request.args.get('unassigned_only')),
        }

        # Remove empty/None filters
        filters = {k: v for k, v in filters.items() if v}

        links, next_cursor, meta = resolve_view(
            user_id=user_id,
            view=view,
            search=search,
            cursor=cursor,
            limit=limit,
            sort=sort,
            order=order,
            **filters,
        )

        return success_response({
            'links': serialize_links(links),
            'meta': meta,
        })

    except Exception as e:
        logger.error(f"GET /links error: {e}", exc_info=True)
        return error_response('Failed to load links', 500)


@dashboard_bp.route('/stats', methods=['GET'])
@require_auth
def stats():
    """Get dashboard statistics."""
    try:
        user_id = _uid()
        if not user_id:
            return error_response('Authentication required', 401)

        stats_data = get_stats(user_id)

        # Add system folders if the module exists
        try:
            from app.folders.system import get_system_folders
            stats_data['system_folders'] = get_system_folders(user_id)
        except (ImportError, Exception) as e:
            logger.debug(f"System folders unavailable: {e}")
            stats_data['system_folders'] = []

        return success_response({'stats': stats_data})

    except Exception as e:
        logger.error(f"GET /stats error: {e}", exc_info=True)
        return error_response('Failed to load stats', 500)


@dashboard_bp.route('/structure', methods=['GET'])
@require_auth
def get_structure():
    """Get complete folder tree + system folders."""
    try:
        user_id = _uid()
        if not user_id:
            return error_response('Authentication required', 401)

        # User folders
        user_folders = []
        try:
            from app.folders.tree import get_folder_tree
            user_folders = get_folder_tree(user_id, include_counts=True)
        except (ImportError, Exception) as e:
            logger.debug(f"Folder tree unavailable: {e}")

        # System folders
        system_folders = []
        try:
            from app.folders.system import get_system_folders
            system_folders = get_system_folders(user_id)
        except (ImportError, Exception) as e:
            logger.debug(f"System folders unavailable: {e}")

        return success_response({
            'system_folders': system_folders,
            'user_folders': user_folders,
        })

    except Exception as e:
        logger.error(f"GET /structure error: {e}", exc_info=True)
        return error_response('Failed to load structure', 500)


# ── Register home sub-routes ──────────────────────────────────────────
# This import triggers route registration on dashboard_bp
from app.dashboard.home import routes as _home_routes  # noqa: E402, F401