# server/app/folders/routes.py
from flask import request, g
from app.folders import folders_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.folders import service


@folders_bp.route('', methods=['POST'])
@require_auth
def create():
    data = request.get_json()
    if not data or not data.get('name'):
        return error_response('name is required', 400)
    folder, err = service.create_folder(g.current_user.id, data)
    if err:
        return error_response(err, 400)
    return success_response({'folder': service.serialize_folder(folder, counts=True)}, status=201)


@folders_bp.route('', methods=['GET'])
@require_auth
def list_all():
    view = request.args.get('view', 'list')
    if view == 'tree':
        return success_response({'folders': service.get_folder_tree(g.current_user.id)})
    folders = service.get_user_folders(g.current_user.id)
    return success_response({'folders': [service.serialize_folder(f, counts=True) for f in folders]})


@folders_bp.route('/<int:folder_id>', methods=['PUT'])
@require_auth
def update(folder_id):
    data = request.get_json()
    if not data:
        return error_response('Invalid body', 400)
    folder = service.update_folder(g.current_user.id, folder_id, data)
    if not folder:
        return error_response('Folder not found or name conflict', 404)
    return success_response({'folder': service.serialize_folder(folder, counts=True)})


@folders_bp.route('/<int:folder_id>', methods=['DELETE'])
@require_auth
def delete(folder_id):
    if not service.soft_delete_folder(g.current_user.id, folder_id):
        return error_response('Folder not found', 404)
    return success_response(message='Deleted')


@folders_bp.route('/<int:folder_id>/pin', methods=['POST'])
@require_auth
def toggle_pin(folder_id):
    result = service.toggle_folder_pin(g.current_user.id, folder_id)
    if result is None:
        return error_response('Folder not found', 404)
    return success_response({'pinned': result})


@folders_bp.route('/<int:folder_id>/move', methods=['POST'])
@require_auth
def move(folder_id):
    data = request.get_json() or {}
    ok = service.move_folder(g.current_user.id, folder_id, data.get('parent_id'))
    return success_response(message='Moved') if ok else error_response('Invalid move', 400)