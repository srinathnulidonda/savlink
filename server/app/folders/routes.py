# server/app/folders/routes.py
from flask import request
from app.folders import folders_bp
from app.auth.middleware import require_auth
from app.auth.utils import get_current_user_id as uid
from app.responses import success_response, error_response
from app.folders import service


@folders_bp.route('', methods=['POST'])
@require_auth
def create():
    data = request.get_json()
    if not data or not data.get('name'):
        return error_response('name is required', 400)
    folder, err = service.create_folder(uid(), data)
    if err:
        return error_response(err, 400)
    return success_response({'folder': service.serialize_folder(folder, counts=True)}, status=201)


@folders_bp.route('', methods=['GET'])
@require_auth
def list_all():
    view = request.args.get('view', 'list')
    if view == 'tree':
        return success_response({'folders': service.get_folder_tree(uid())})
    folders = service.get_user_folders(uid())
    return success_response({'folders': [service.serialize_folder(f, counts=True) for f in folders]})


@folders_bp.route('/<int:folder_id>', methods=['GET'])
@require_auth
def get_detail(folder_id):
    data = service.get_folder_detail(uid(), folder_id)
    if not data:
        return error_response('Folder not found', 404)
    return success_response(data)


@folders_bp.route('/<int:folder_id>/links', methods=['GET'])
@require_auth
def get_folder_links(folder_id):
    try:
        limit = min(max(1, int(request.args.get('limit', 30))), 100)
    except ValueError:
        limit = 30
    params = {
        'search': request.args.get('search', ''),
        'sort': request.args.get('sort', 'created_at'),
        'order': request.args.get('order', 'desc'),
        'cursor': request.args.get('cursor'),
        'limit': limit,
    }
    result = service.get_folder_links(uid(), folder_id, params)
    if result is None:
        return error_response('Folder not found', 404)
    return success_response(result)


@folders_bp.route('/<int:folder_id>', methods=['PUT'])
@require_auth
def update(folder_id):
    data = request.get_json()
    if not data:
        return error_response('Invalid body', 400)
    folder = service.update_folder(uid(), folder_id, data)
    if not folder:
        return error_response('Folder not found or name conflict', 404)
    return success_response({'folder': service.serialize_folder(folder, counts=True)})


@folders_bp.route('/<int:folder_id>', methods=['DELETE'])
@require_auth
def delete(folder_id):
    if not service.soft_delete_folder(uid(), folder_id):
        return error_response('Folder not found', 404)
    return success_response(message='Deleted')


@folders_bp.route('/<int:folder_id>/pin', methods=['POST'])
@require_auth
def toggle_pin(folder_id):
    result = service.toggle_folder_pin(uid(), folder_id)
    if result is None:
        return error_response('Folder not found', 404)
    return success_response({'pinned': result})


@folders_bp.route('/<int:folder_id>/move', methods=['POST'])
@require_auth
def move(folder_id):
    data = request.get_json() or {}
    ok = service.move_folder(uid(), folder_id, data.get('parent_id'))
    return success_response(message='Moved') if ok else error_response('Invalid move', 400)