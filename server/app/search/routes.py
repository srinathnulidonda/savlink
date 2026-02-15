# server/app/search/routes.py

from flask import request, g, jsonify
from flask import Blueprint
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.search.service import AdvancedSearch
import logging
from . import search_bp
logger = logging.getLogger(__name__)

@search_bp.route('/everything', methods=['GET'])
@require_auth
def search_everything():
    """Comprehensive search across all entities"""
    query = request.args.get('q', '').strip()
    if not query:
        return error_response('Search query is required', 400)
    
    if len(query) > 500:
        return error_response('Search query too long', 400)
    
    # Parse filters
    filters = {}
    
    # Boolean filters
    for filter_name in ['starred', 'pinned', 'frequently_used', 'unassigned_only']:
        if request.args.get(filter_name) == 'true':
            filters[filter_name] = True
    
    # String filters
    if request.args.get('link_type'):
        filters['link_type'] = request.args.get('link_type')
    if request.args.get('domain'):
        filters['domain'] = request.args.get('domain')
    
    # Numeric filters
    if request.args.get('folder_id'):
        try:
            filters['folder_id'] = int(request.args.get('folder_id'))
        except ValueError:
            pass
    
    if request.args.get('min_clicks'):
        try:
            filters['min_clicks'] = int(request.args.get('min_clicks'))
        except ValueError:
            pass
    
    # Date filters
    if request.args.get('created_after'):
        try:
            from datetime import datetime
            filters['created_after'] = datetime.fromisoformat(request.args.get('created_after'))
        except ValueError:
            pass
    
    # Tag IDs
    tag_ids_str = request.args.get('tag_ids')
    if tag_ids_str:
        try:
            filters['tag_ids'] = [int(tid) for tid in tag_ids_str.split(',')]
        except ValueError:
            pass
    
    # Special filters
    if request.args.get('expiring_soon') == 'true':
        filters['expiring_soon'] = True
    
    # Include archived
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'
    
    # Limit
    try:
        limit = int(request.args.get('limit', 50))
        limit = min(max(1, limit), 200)  # Cap at 200
    except ValueError:
        limit = 50
    
    # Perform search
    search_engine = AdvancedSearch(g.current_user.id)
    results = search_engine.search_everything(query, filters, limit, include_archived)
    
    return success_response(results)

@search_bp.route('/links', methods=['GET'])
@require_auth
def search_user_links():
    """Legacy endpoint - redirects to everything search"""
    # Use new search engine but return only links for backward compatibility
    query = request.args.get('q', '').strip()
    if not query:
        return error_response('Search query is required', 400)
    
    search_engine = AdvancedSearch(g.current_user.id)
    results = search_engine.search_everything(query, {}, 50)
    
    return success_response({
        'links': results['links'],
        'query': query,
        'count': len(results['links']),
        'stats': results['stats']
    })

@search_bp.route('/suggestions', methods=['GET'])
@require_auth
def search_suggestions():
    """Get intelligent search suggestions"""
    query = request.args.get('q', '').strip()
    
    search_engine = AdvancedSearch(g.current_user.id)
    
    if not query or len(query) < 2:
        # Return search history and trending
        return success_response({
            'suggestions': {
                'recent': search_engine.get_search_history(5),
                'trending': search_engine.get_trending_searches(),
                'links': [],
                'folders': [],
                'tags': []
            }
        })
    
    # Quick search for suggestions
    results = search_engine.search_everything(query, {}, 15)
    
    return success_response({
        'suggestions': {
            'recent': search_engine.get_search_history(3),
            'trending': search_engine.get_trending_searches(),
            'links': results['links'][:5],
            'folders': results['folders'][:3],
            'tags': results['tags'][:3],
            'related_queries': results['suggestions']
        }
    })

@search_bp.route('/history', methods=['GET'])
@require_auth
def get_search_history():
    """Get user's search history"""
    try:
        limit = int(request.args.get('limit', 20))
        limit = min(max(1, limit), 100)
    except ValueError:
        limit = 20
    
    search_engine = AdvancedSearch(g.current_user.id)
    history = search_engine.get_search_history(limit)
    
    return success_response({'history': history})

@search_bp.route('/history', methods=['DELETE'])
@require_auth
def clear_search_history():
    """Clear user's search history"""
    from app.extensions import redis_client
    
    if redis_client.available:
        history_key = f"search:{g.current_user.id}:history"
        redis_client.delete(history_key)
    
    return success_response({'message': 'Search history cleared'})

@search_bp.route('/trending', methods=['GET'])
@require_auth
def get_trending_searches():
    """Get trending search queries"""
    try:
        days = int(request.args.get('days', 7))
        days = min(max(1, days), 30)
    except ValueError:
        days = 7
    
    search_engine = AdvancedSearch(g.current_user.id)
    trending = search_engine.get_trending_searches(days)
    
    return success_response({'trending': trending})