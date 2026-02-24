# server/app/links/routes.py
from flask import request, g
from app.links import links_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.links import service
from app.dashboard.serializers import serialize_link


@links_bp.route('', methods=['POST'])
@require_auth
def create():
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)

    link, extra = service.create_link(g.current_user.id, data)
    if link is None:
        return error_response(extra.get('error', 'Creation failed'), 400)

    resp = {'link': serialize_link(link)}
    if extra and extra.get('duplicate_warning'):
        resp['duplicate_warning'] = extra['duplicate_warning']
    return success_response(resp, status=201)


@links_bp.route('/<int:link_id>', methods=['PUT', 'PATCH'])
@require_auth
def update(link_id):
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)
    link, err = service.update_link(g.current_user.id, link_id, data)
    if err:
        return error_response(err, 404 if 'not found' in err.lower() else 400)
    return success_response({'link': serialize_link(link)})


@links_bp.route('/<int:link_id>/pin', methods=['POST'])
@require_auth
def pin(link_id):
    ok, err = service.set_pin(g.current_user.id, link_id, True)
    return success_response(message='Pinned') if ok else error_response(err, 404)


@links_bp.route('/<int:link_id>/unpin', methods=['POST'])
@require_auth
def unpin(link_id):
    ok, err = service.set_pin(g.current_user.id, link_id, False)
    return success_response(message='Unpinned') if ok else error_response(err, 404)


@links_bp.route('/<int:link_id>/star', methods=['POST'])
@require_auth
def star(link_id):
    ok, err = service.set_star(g.current_user.id, link_id, True)
    return success_response(message='Starred') if ok else error_response(err, 404)


@links_bp.route('/<int:link_id>/unstar', methods=['POST'])
@require_auth
def unstar(link_id):
    ok, err = service.set_star(g.current_user.id, link_id, False)
    return success_response(message='Unstarred') if ok else error_response(err, 404)


@links_bp.route('/<int:link_id>/archive', methods=['POST'])
@require_auth
def archive(link_id):
    ok, err = service.archive_link(g.current_user.id, link_id)
    return success_response(message='Archived') if ok else error_response(err, 404)


@links_bp.route('/<int:link_id>/restore', methods=['POST'])
@require_auth
def restore(link_id):
    ok, err = service.restore_link(g.current_user.id, link_id)
    return success_response(message='Restored') if ok else error_response(err, 404)


@links_bp.route('/<int:link_id>/toggle-active', methods=['POST'])
@require_auth
def toggle_active(link_id):
    state, err = service.toggle_active(g.current_user.id, link_id)
    if err:
        return error_response(err, 404)
    return success_response({'is_active': state})


@links_bp.route('/<int:link_id>', methods=['DELETE'])
@require_auth
def delete(link_id):
    ok, err = service.soft_delete_link(g.current_user.id, link_id)
    return success_response(message='Deleted') if ok else error_response(err, 404)


@links_bp.route('/check-duplicate', methods=['POST'])
@require_auth
def check_duplicate():
    data = request.get_json()
    if not data or not data.get('original_url'):
        return error_response('original_url is required', 400)
    return success_response({'duplicate': service.check_duplicate(g.current_user.id, data['original_url'])})


@links_bp.route('/<int:link_id>/move-folder', methods=['POST'])
@require_auth
def move_folder(link_id):
    data = request.get_json() or {}
    ok = service.move_to_folder(g.current_user.id, link_id, data.get('folder_id'))
    return success_response(message='Moved') if ok else error_response('Not found', 404)


@links_bp.route('/<int:link_id>/tags', methods=['POST'])
@require_auth
def update_tags(link_id):
    data = request.get_json()
    if not data:
        return error_response('Invalid body', 400)
    add_ids = data.get('add', [])
    remove_ids = data.get('remove', [])
    ok = service.update_link_tags(g.current_user.id, link_id, add_ids, remove_ids)
    return success_response(message='Tags updated') if ok else error_response('Not found', 404)