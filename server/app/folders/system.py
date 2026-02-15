# server/app/folders/system.py

from typing import Dict, List, Any
from app.models import Link, Folder
from app.extensions import db

SYSTEM_FOLDERS = {
    'my_files': {
        'id': 'my_files',
        'name': 'My Files',
        'type': 'system',
        'icon': 'folder',
        'color': None,
        'immutable': True,
        'description': 'All your links and folders'
    }
}

def get_system_folders(user_id: str) -> List[Dict[str, Any]]:
    """Get system folders with counts"""
    folders = []
    
    for folder_key, folder_def in SYSTEM_FOLDERS.items():
        folder_data = folder_def.copy()
        
        if folder_key == 'my_files':
            # Count all non-archived links
            total_links = Link.query.filter(
                Link.user_id == user_id,
                Link.soft_deleted == False,
                Link.archived_at.is_(None)
            ).count()
            
            folder_data['link_count'] = total_links
        
        folders.append(folder_data)
    
    return folders

def get_my_files_scope_query(user_id: str):
    """Get base query for My Files scope"""
    return Link.query.filter(
        Link.user_id == user_id,
        Link.soft_deleted == False,
        Link.archived_at.is_(None)
    )

def is_system_folder(folder_id: str) -> bool:
    """Check if folder ID is a system folder"""
    return folder_id in SYSTEM_FOLDERS

def validate_system_folder_operation(folder_id: str, operation: str) -> bool:
    """Validate if operation is allowed on system folder"""
    if not is_system_folder(folder_id):
        return True  # Not a system folder, allow operation
    
    folder = SYSTEM_FOLDERS.get(folder_id)
    if not folder:
        return False
    
    # System folders are immutable
    forbidden_operations = ['update', 'delete', 'rename', 'move']
    return operation not in forbidden_operations