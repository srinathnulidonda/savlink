# server/app/folders/routes.py

from flask import request, g
from app.folders import folders_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.folders.service import (
    SmartFolderManager, create_folder, get_user_folders, 
    update_folder, soft_delete_folder, restore_folder,
    serialize_folder
)
from app.folders.tree import get_folder_tree, move_folder

@folders_bp.route('', methods=['POST'])
@require_auth
def create():
    """Create a new folder with smart features"""
    data = request.get_json()
    if not data or not data.get('name'):
        return error_response('name is required', 400)
    
    manager = SmartFolderManager(g.current_user.id)
    folder, error = manager.create_smart_folder(data)
    
    if error:
        return error_response(error, 400)
    
    return success_response({
        'folder': serialize_folder(folder, include_counts=True)
    }, status=201)

@folders_bp.route('', methods=['GET'])
@require_auth
def list_folders():
    """List user folders with enhanced data"""
    include_analytics = request.args.get('include_analytics', 'false').lower() == 'true'
    view = request.args.get('view', 'list')  # 'list' or 'tree'
    
    if view == 'tree':
        folders = get_folder_tree(g.current_user.id, include_counts=True)
        return success_response({'folders': folders})
    
    folders = get_user_folders(g.current_user.id)
    
    serialized_folders = []
    for folder in folders:
        folder_data = serialize_folder(
            folder, 
            include_counts=True, 
            include_analytics=include_analytics
        )
        serialized_folders.append(folder_data)
    
    return success_response({'folders': serialized_folders})

@folders_bp.route('/<int:folder_id>/analytics', methods=['GET'])
@require_auth
def get_analytics(folder_id):
    """Get detailed folder analytics"""
    manager = SmartFolderManager(g.current_user.id)
    analytics = manager.get_folder_analytics(folder_id)
    
    if not analytics:
        return error_response('Folder not found', 404)
    
    return success_response({'analytics': analytics})

@folders_bp.route('/<int:folder_id>/move', methods=['POST'])
@require_auth
def move_folder_endpoint(folder_id):
    """Move folder to different parent"""
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)
    
    new_parent_id = data.get('parent_id')
    
    if not move_folder(g.current_user.id, folder_id, new_parent_id):
        return error_response('Failed to move folder', 400)
    
    return success_response({'message': 'Folder moved successfully'})

@folders_bp.route('/bulk-organize', methods=['POST'])
@require_auth
def bulk_organize():
    """Bulk organize links using rules"""
    data = request.get_json()
    if not data or not data.get('rules'):
        return error_response('Organization rules are required', 400)
    
    rules = data.get('rules', [])
    if not isinstance(rules, list) or len(rules) > 20:
        return error_response('Invalid rules (max 20 allowed)', 400)
    
    manager = SmartFolderManager(g.current_user.id)
    results = manager.bulk_organize_links(rules)
    
    return success_response({
        'results': results,
        'message': f"Organized {results['moved']} links with {results['errors']} errors"
    })

@folders_bp.route('/merge-suggestions', methods=['GET'])
@require_auth
def get_merge_suggestions():
    """Get suggestions for folder merging"""
    manager = SmartFolderManager(g.current_user.id)
    suggestions = manager.suggest_folder_merge()
    
    return success_response({'suggestions': suggestions})

@folders_bp.route('/<int:folder_id>/pin', methods=['POST'])
@require_auth
def pin_folder(folder_id):
    """Pin/unpin folder"""
    folder = Folder.query.filter_by(
        id=folder_id,
        user_id=g.current_user.id,
        soft_deleted=False
    ).first()
    
    if not folder:
        return error_response('Folder not found', 404)
    
    folder.pinned = not folder.pinned
    from app.extensions import db
    db.session.commit()
    
    action = 'pinned' if folder.pinned else 'unpinned'
    return success_response({
        'message': f'Folder {action} successfully',
        'pinned': folder.pinned
    })

@folders_bp.route('/<int:folder_id>', methods=['PUT'])
@require_auth
def update(folder_id):
    """Update folder with validation"""
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)
    
    folder = update_folder(g.current_user.id, folder_id, data)
    if not folder:
        return error_response('Folder not found or name already exists', 404)
    
    return success_response({
        'folder': serialize_folder(folder, include_counts=True)
    })

@folders_bp.route('/<int:folder_id>', methods=['DELETE'])
@require_auth
def delete(folder_id):
    """Soft delete folder"""
    if not soft_delete_folder(g.current_user.id, folder_id):
        return error_response('Folder not found', 404)
    
    return success_response(message='Folder deleted')

@folders_bp.route('/<int:folder_id>/restore', methods=['POST'])
@require_auth
def restore(folder_id):
    """Restore soft deleted folder"""
    folder = restore_folder(g.current_user.id, folder_id)
    if not folder:
        return error_response('Folder not found', 404)
    
    return success_response({
        'folder': serialize_folder(folder, include_counts=True)
    })