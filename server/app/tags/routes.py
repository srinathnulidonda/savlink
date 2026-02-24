# server/app/tags/routes.py
from flask import request, g
from app.tags import tags_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.tags import service


@tags_bp.route('', methods=['POST'])
@require_auth
def create():
    data = request.get_json()
    if not data or not data.get('name'):
        return error_response('name is required', 400)
    tag = service.create_tag(g.current_user.id, data)
    if not tag:
        return error_response('Tag already exists', 400)
    return success_response({'tag': service.serialize_tag(tag)}, status=201)


@tags_bp.route('', methods=['GET'])
@require_auth
def list_tags():
    tags = service.get_user_tags(g.current_user.id)
    return success_response({'tags': [service.serialize_tag(t) for t in tags]})


@tags_bp.route('/<int:tag_id>', methods=['PUT'])
@require_auth
def update(tag_id):
    data = request.get_json()
    if not data:
        return error_response('Invalid body', 400)
    tag = service.update_tag(g.current_user.id, tag_id, data)
    if not tag:
        return error_response('Tag not found or name conflict', 404)
    return success_response({'tag': service.serialize_tag(tag)})


@tags_bp.route('/<int:tag_id>', methods=['DELETE'])
@require_auth
def delete(tag_id):
    if not service.delete_tag(g.current_user.id, tag_id):
        return error_response('Tag not found', 404)
    return success_response(message='Deleted')