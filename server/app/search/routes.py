# server/app/search/routes.py
from flask import request, g
from app.search import search_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.search.service import SearchEngine


@search_bp.route('/everything', methods=['GET'])
@require_auth
def search_everything():
    query = request.args.get('q', '').strip()
    if not query:
        return error_response('Search query is required', 400)
    if len(query) > 500:
        return error_response('Query too long', 400)

    filters = {}
    for flag in ('starred', 'pinned', 'frequently_used', 'unassigned_only'):
        if request.args.get(flag) == 'true':
            filters[flag] = True
    if request.args.get('link_type'):
        filters['link_type'] = request.args.get('link_type')
    if request.args.get('folder_id'):
        try:
            filters['folder_id'] = int(request.args.get('folder_id'))
        except ValueError:
            pass
    tag_str = request.args.get('tag_ids')
    if tag_str:
        try:
            filters['tag_ids'] = [int(x) for x in tag_str.split(',') if x.strip()]
        except ValueError:
            pass

    try:
        limit = min(max(1, int(request.args.get('limit', 50))), 200)
    except ValueError:
        limit = 50

    engine = SearchEngine(g.current_user.id)
    return success_response(engine.search(query, filters, limit=limit))


@search_bp.route('/suggestions', methods=['GET'])
@require_auth
def suggestions():
    query = request.args.get('q', '').strip()
    engine = SearchEngine(g.current_user.id)

    if not query or len(query) < 2:
        return success_response({'suggestions': engine.get_history(10)})

    results = engine.search(query, {}, limit=10)
    return success_response({
        'suggestions': results['links'][:5],
        'folders': results['folders'][:3],
        'tags': results['tags'][:3],
    })