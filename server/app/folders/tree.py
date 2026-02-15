# server/app/folders/tree.py

from typing import List, Dict, Any, Optional
from sqlalchemy import and_
from app.extensions import db
from app.models import Folder, Link
import logging

logger = logging.getLogger(__name__)

def get_folder_tree(user_id: str, include_counts: bool = True) -> List[Dict[str, Any]]:
    """Get hierarchical folder tree for user"""
    # Get all folders
    folders = Folder.query.filter(
        Folder.user_id == user_id,
        Folder.soft_deleted == False
    ).order_by(Folder.position, Folder.created_at).all()
    
    # Build folder map
    folder_map = {}
    for folder in folders:
        folder_data = {
            'id': folder.id,
            'name': folder.name,
            'color': folder.color,
            'icon': folder.icon,
            'position': folder.position,
            'pinned': folder.pinned,
            'parent_id': folder.parent_id,
            'children': [],
            'link_count': 0,
            'depth': 0
        }
        
        if include_counts:
            folder_data['link_count'] = Link.query.filter(
                Link.user_id == user_id,
                Link.folder_id == folder.id,
                Link.soft_deleted == False,
                Link.archived_at.is_(None)
            ).count()
        
        folder_map[folder.id] = folder_data
    
    # Build tree structure
    root_folders = []
    
    for folder in folder_map.values():
        parent_id = folder['parent_id']
        
        if parent_id and parent_id in folder_map:
            # Add to parent's children
            folder_map[parent_id]['children'].append(folder)
            folder['depth'] = folder_map[parent_id]['depth'] + 1
        else:
            # Root level folder
            root_folders.append(folder)
    
    # Sort children recursively
    def sort_children(folders):
        for folder in folders:
            folder['children'].sort(key=lambda x: (x['position'], x['name']))
            sort_children(folder['children'])
    
    sort_children(root_folders)
    root_folders.sort(key=lambda x: (x['position'], x['name']))
    
    return root_folders

def move_folder(user_id: str, folder_id: int, new_parent_id: Optional[int]) -> bool:
    """Move folder to a different parent"""
    folder = Folder.query.filter_by(
        id=folder_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not folder:
        return False
    
    # Validate new parent
    if new_parent_id:
        parent = Folder.query.filter_by(
            id=new_parent_id,
            user_id=user_id,
            soft_deleted=False
        ).first()
        
        if not parent:
            return False
        
        # Prevent circular reference
        if would_create_cycle(user_id, folder_id, new_parent_id):
            return False
    
    folder.parent_id = new_parent_id
    db.session.commit()
    return True

def would_create_cycle(user_id: str, folder_id: int, new_parent_id: int) -> bool:
    """Check if moving folder would create a circular reference"""
    current_id = new_parent_id
    
    while current_id:
        if current_id == folder_id:
            return True
        
        folder = Folder.query.filter_by(
            id=current_id,
            user_id=user_id,
            soft_deleted=False
        ).first()
        
        if not folder:
            break
        
        current_id = folder.parent_id
    
    return False

def get_folder_path(user_id: str, folder_id: int) -> List[Dict[str, Any]]:
    """Get breadcrumb path for a folder"""
    path = []
    current_id = folder_id
    
    while current_id:
        folder = Folder.query.filter_by(
            id=current_id,
            user_id=user_id,
            soft_deleted=False
        ).first()
        
        if not folder:
            break
        
        path.insert(0, {
            'id': folder.id,
            'name': folder.name,
            'color': folder.color,
            'icon': folder.icon
        })
        
        current_id = folder.parent_id
    
    return path

def delete_folder_cascade(user_id: str, folder_id: int) -> bool:
    """Soft delete folder and handle children"""
    folder = Folder.query.filter_by(
        id=folder_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not folder:
        return False
    
    # Move child folders to parent level
    Folder.query.filter_by(
        parent_id=folder_id,
        user_id=user_id,
        soft_deleted=False
    ).update({'parent_id': folder.parent_id})
    
    # Unassign links from folder
    Link.query.filter_by(
        folder_id=folder_id,
        user_id=user_id
    ).update({'folder_id': None})
    
    # Soft delete the folder
    folder.soft_deleted = True
    db.session.commit()
    
    return True