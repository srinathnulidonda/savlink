# server/app/trash/routes.py

from flask import request, g
from app.trash import trash_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.trash import service


@trash_bp.route('', methods=['GET'])
@require_auth
def list_trash():
    try:
        limit = min(max(1, int(request.args.get('limit', 30))), 100)
    except ValueError:
        limit = 30
    cursor = request.args.get('cursor')
    entity_type = request.args.get('type', 'all')  # all, link, folder
    data = service.get_trash(g.current_user.id, entity_type, limit, cursor)
    return success_response(data)


@trash_bp.route('/stats', methods=['GET'])
@require_auth
def trash_stats():
    return success_response({'stats': service.get_trash_stats(g.current_user.id)})


@trash_bp.route('/restore/<int:item_id>', methods=['POST'])
@require_auth
def restore_item(item_id):
    data = request.get_json() or {}
    entity_type = data.get('type', 'link')
    ok = service.restore_from_trash(g.current_user.id, item_id, entity_type)
    return success_response(message='Restored') if ok else error_response('Item not found in trash', 404)


@trash_bp.route('/restore-bulk', methods=['POST'])
@require_auth
def restore_bulk():
    data = request.get_json()
    if not data or not data.get('items'):
        return error_response('items array required', 400)
    result = service.restore_bulk(g.current_user.id, data['items'])
    return success_response(result)


@trash_bp.route('/delete/<int:item_id>', methods=['DELETE'])
@require_auth
def permanent_delete(item_id):
    data = request.get_json() or {}
    entity_type = data.get('type', 'link')
    ok = service.permanent_delete(g.current_user.id, item_id, entity_type)
    return success_response(message='Permanently deleted') if ok else error_response('Not found', 404)


@trash_bp.route('/empty', methods=['POST'])
@require_auth
def empty_trash():
    result = service.empty_trash(g.current_user.id)
    return success_response(result)


@trash_bp.route('/auto-cleanup', methods=['POST'])
@require_auth
def auto_cleanup():
    """Remove items that have been in trash > 30 days."""
    result = service.auto_cleanup(g.current_user.id)
    return success_response(result)