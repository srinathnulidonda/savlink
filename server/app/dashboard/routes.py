from flask import request, g
from app.dashboard import dashboard_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.dashboard.views import resolve_view, get_stats
from app.dashboard.service import serialize_links
from app.folders.system import get_system_folders
import logging

logger = logging.getLogger(__name__)

# Import home routes
from app.dashboard.home.routes import *

@dashboard_bp.route('/links', methods=['GET'])
@require_auth
def get_links():
    """Get links for My Files dashboard with enhanced filtering"""
    view = request.args.get('view', 'all')
    search = request.args.get('search')
    cursor = request.args.get('cursor')
    
    # System folder support
    system_folder = request.args.get('system_folder')
    folder_id = request.args.get('folder_id', type=int)
    tag_ids_str = request.args.get('tag_ids')
    unassigned_only = request.args.get('unassigned_only', 'false').lower() == 'true'
    
    # New filters
    starred_only = request.args.get('starred', 'false').lower() == 'true'
    pinned_only = request.args.get('pinned', 'false').lower() == 'true'
    link_type = request.args.get('link_type')
    
    tag_ids = []
    if tag_ids_str:
        try:
            tag_ids = [int(tid) for tid in tag_ids_str.split(',')]
        except ValueError:
            tag_ids = []

    try:
        limit = int(request.args.get('limit', 20))
    except (ValueError, TypeError):
        limit = 20

    links, next_cursor, meta = resolve_view(
        user_id=g.current_user.id,
        view=view,
        search=search,
        cursor=cursor,
        limit=limit,
        system_folder=system_folder,
        folder_id=folder_id,
        tag_ids=tag_ids,
        unassigned_only=unassigned_only,
        starred_only=starred_only,
        pinned_only=pinned_only,
        link_type=link_type,
    )

    return success_response({
        'links': serialize_links(links),
        'meta': meta,
    })

@dashboard_bp.route('/stats', methods=['GET'])
@require_auth
def stats():
    """Get enhanced dashboard stats"""
    stats_data = get_stats(g.current_user.id)
    
    # Add system folders
    stats_data['system_folders'] = get_system_folders(g.current_user.id)
    
    return success_response({'stats': stats_data})

@dashboard_bp.route('/structure', methods=['GET'])
@require_auth  
def get_structure():
    """Get complete dashboard structure (folders + system folders)"""
    from app.folders.tree import get_folder_tree
    from app.folders.system import get_system_folders
    
    user_folders = get_folder_tree(g.current_user.id, include_counts=True)
    system_folders = get_system_folders(g.current_user.id)
    
    return success_response({
        'system_folders': system_folders,
        'user_folders': user_folders
    })