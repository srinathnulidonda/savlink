# server/app/links/routes.py
from flask import request, g
from app.links import links_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.links.service import (
    create_link, update_link, pin_link, unpin_link,
    archive_link, restore_link, toggle_active, soft_delete_link
)
from app.links.duplicate import check_duplicate
from app.links.tagging import move_to_folder, add_tags_to_link, remove_tags_from_link
import logging

logger = logging.getLogger(__name__)


@links_bp.route('', methods=['POST'])
@require_auth
def create():
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)

    link, extra = create_link(g.current_user.id, data)
    if link is None and extra and 'error' in extra:
        return error_response(extra['error'], 400)

    from app.dashboard.service import serialize_link
    response = {'link': serialize_link(link)}

    if extra and 'duplicate_warning' in extra:
        response['duplicate_warning'] = extra['duplicate_warning']

    return success_response(response, status=201)


@links_bp.route('/<int:link_id>', methods=['PUT', 'PATCH'])
@require_auth
def update(link_id):
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)

    link, err = update_link(g.current_user.id, link_id, data)
    if err:
        return error_response(err, 404 if err == 'Link not found' else 400)

    from app.dashboard.service import serialize_link
    return success_response({'link': serialize_link(link)})


@links_bp.route('/<int:link_id>/pin', methods=['POST'])
@require_auth
def pin(link_id):
    ok, err = pin_link(g.current_user.id, link_id)
    if not ok:
        return error_response(err, 404)
    return success_response(message='Link pinned')


@links_bp.route('/<int:link_id>/unpin', methods=['POST'])
@require_auth
def unpin(link_id):
    ok, err = unpin_link(g.current_user.id, link_id)
    if not ok:
        return error_response(err, 404)
    return success_response(message='Link unpinned')


@links_bp.route('/<int:link_id>/archive', methods=['POST'])
@require_auth
def archive(link_id):
    ok, err = archive_link(g.current_user.id, link_id)
    if not ok:
        return error_response(err, 404)
    return success_response(message='Link archived')


@links_bp.route('/<int:link_id>/restore', methods=['POST'])
@require_auth
def restore(link_id):
    ok, err = restore_link(g.current_user.id, link_id)
    if not ok:
        return error_response(err, 404)
    return success_response(message='Link restored')


@links_bp.route('/<int:link_id>/toggle-active', methods=['POST'])
@require_auth
def toggle(link_id):
    new_state, err = toggle_active(g.current_user.id, link_id)
    if err:
        return error_response(err, 404)
    return success_response({'is_active': new_state})


@links_bp.route('/<int:link_id>', methods=['DELETE'])
@require_auth
def delete(link_id):
    ok, err = soft_delete_link(g.current_user.id, link_id)
    if not ok:
        return error_response(err, 404)
    return success_response(message='Link deleted')


@links_bp.route('/check-duplicate', methods=['POST'])
@require_auth
def check_dup():
    data = request.get_json()
    if not data or not data.get('original_url'):
        return error_response('original_url is required', 400)

    result = check_duplicate(g.current_user.id, data['original_url'])
    return success_response({'duplicate': result})


@links_bp.route('/<int:link_id>/move-folder', methods=['POST'])
@require_auth
def move_folder(link_id):
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)
    
    folder_id = data.get('folder_id')
    
    if not move_to_folder(g.current_user.id, link_id, folder_id):
        return error_response('Link or folder not found', 404)
    
    return success_response(message='Link moved')


@links_bp.route('/<int:link_id>/add-tags', methods=['POST'])
@require_auth
def add_tags(link_id):
    data = request.get_json()
    if not data or 'tag_ids' not in data:
        return error_response('tag_ids is required', 400)
    
    tag_ids = data.get('tag_ids', [])
    if not isinstance(tag_ids, list):
        return error_response('tag_ids must be an array', 400)
    
    if not add_tags_to_link(g.current_user.id, link_id, tag_ids):
        return error_response('Link not found', 404)
    
    return success_response(message='Tags added')


@links_bp.route('/<int:link_id>/remove-tags', methods=['POST'])
@require_auth
def remove_tags(link_id):
    data = request.get_json()
    if not data or 'tag_ids' not in data:
        return error_response('tag_ids is required', 400)
    
    tag_ids = data.get('tag_ids', [])
    if not isinstance(tag_ids, list):
        return error_response('tag_ids must be an array', 400)
    
    if not remove_tags_from_link(g.current_user.id, link_id, tag_ids):
        return error_response('Link not found', 404)
    
    return success_response(message='Tags removed')