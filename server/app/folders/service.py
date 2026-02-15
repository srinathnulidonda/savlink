# server/app/folders/service.py

from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import and_, func, desc
from app.extensions import db, redis_client
from app.models import Folder, Link
from app.utils.ordering import get_next_position
from app.folders.tree import get_folder_tree, move_folder
import logging
import json

logger = logging.getLogger(__name__)

class SmartFolderManager:
    """Intelligent folder management with auto-categorization"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.cache_key = f"folders:{user_id}"
    
    def create_smart_folder(self, data: Dict[str, Any]) -> Tuple[Optional[Folder], Optional[str]]:
        """Create folder with smart features"""
        name = data.get('name', '').strip()
        if not name:
            return None, 'Folder name is required'
        
        if len(name) > 255:
            return None, 'Folder name too long'
        
        # Check for existing folder
        existing = Folder.query.filter_by(
            user_id=self.user_id,
            name=name,
            soft_deleted=False,
            parent_id=data.get('parent_id')
        ).first()
        
        if existing:
            return None, 'Folder already exists'
        
        # Validate parent folder
        parent_id = data.get('parent_id')
        if parent_id:
            parent = Folder.query.filter_by(
                id=parent_id,
                user_id=self.user_id,
                soft_deleted=False
            ).first()
            
            if not parent:
                return None, 'Parent folder not found'
        
        # Auto-suggest folder properties
        suggested_props = self._suggest_folder_properties(name)
        
        folder = Folder(
            user_id=self.user_id,
            parent_id=parent_id,
            name=name,
            color=data.get('color') or suggested_props.get('color'),
            icon=data.get('icon') or suggested_props.get('icon'),
            position=get_next_position(Folder, self.user_id),
            pinned=data.get('pinned', False)
        )
        
        db.session.add(folder)
        db.session.commit()
        
        # Auto-categorize existing links
        if data.get('auto_categorize', False):
            self._auto_categorize_links(folder, name)
        
        # Clear cache
        self._clear_cache()
        
        return folder, None
    
    def _suggest_folder_properties(self, name: str) -> Dict[str, Any]:
        """Suggest color and icon based on folder name"""
        name_lower = name.lower()
        
        # Predefined mappings
        mappings = {
            'work': {'color': '#3B82F6', 'icon': 'briefcase'},
            'personal': {'color': '#10B981', 'icon': 'user'},
            'projects': {'color': '#F59E0B', 'icon': 'folder-open'},
            'research': {'color': '#8B5CF6', 'icon': 'academic-cap'},
            'tools': {'color': '#EF4444', 'icon': 'wrench'},
            'design': {'color': '#EC4899', 'icon': 'color-swatch'},
            'development': {'color': '#06B6D4', 'icon': 'code'},
            'reading': {'color': '#84CC16', 'icon': 'book-open'},
            'news': {'color': '#F97316', 'icon': 'newspaper'},
            'social': {'color': '#8B5CF6', 'icon': 'users'},
            'shopping': {'color': '#06B6D4', 'icon': 'shopping-bag'},
            'travel': {'color': '#10B981', 'icon': 'globe'},
            'health': {'color': '#EF4444', 'icon': 'heart'},
            'finance': {'color': '#059669', 'icon': 'currency-dollar'},
            'education': {'color': '#7C3AED', 'icon': 'academic-cap'},
            'entertainment': {'color': '#EC4899', 'icon': 'play'},
            'docs': {'color': '#6B7280', 'icon': 'document'},
            'images': {'color': '#F59E0B', 'icon': 'photograph'},
            'videos': {'color': '#DC2626', 'icon': 'video-camera'},
        }
        
        # Check for keyword matches
        for keyword, props in mappings.items():
            if keyword in name_lower:
                return props
        
        # Default
        return {'color': '#6B7280', 'icon': 'folder'}
    
    def _auto_categorize_links(self, folder: Folder, search_terms: str) -> int:
        """Automatically categorize existing links into folder"""
        if not search_terms:
            return 0
        
        # Find potentially matching links
        search_pattern = f'%{search_terms.lower()}%'
        
        candidates = Link.query.filter(
            Link.user_id == self.user_id,
            Link.soft_deleted == False,
            Link.archived_at.is_(None),
            Link.folder_id.is_(None),  # Only unassigned links
            func.lower(Link.title).like(search_pattern) |
            func.lower(Link.original_url).like(search_pattern) |
            func.lower(Link.notes).like(search_pattern)
        ).limit(50).all()  # Limit to prevent mass moves
        
        moved_count = 0
        for link in candidates:
            # Calculate confidence score
            confidence = self._calculate_categorization_confidence(link, search_terms)
            
            # Only auto-move with high confidence
            if confidence > 0.7:
                link.folder_id = folder.id
                moved_count += 1
        
        if moved_count > 0:
            db.session.commit()
            logger.info(f"Auto-categorized {moved_count} links into folder '{folder.name}'")
        
        return moved_count
    
    def _calculate_categorization_confidence(self, link: Link, folder_name: str) -> float:
        """Calculate confidence score for auto-categorization"""
        score = 0.0
        name_lower = folder_name.lower()
        
        # Title match (highest weight)
        if link.title and name_lower in link.title.lower():
            score += 0.5
        
        # URL/domain match
        from app.utils.url import extract_domain
        domain = extract_domain(link.original_url)
        if domain and name_lower in domain.lower():
            score += 0.3
        
        # Notes match
        if link.notes and name_lower in link.notes.lower():
            score += 0.2
        
        return min(1.0, score)
    
    def get_folder_analytics(self, folder_id: int) -> Dict[str, Any]:
        """Get comprehensive folder analytics"""
        folder = Folder.query.filter_by(
            id=folder_id,
            user_id=self.user_id,
            soft_deleted=False
        ).first()
        
        if not folder:
            return {}
        
        # Basic stats
        total_links = Link.query.filter_by(
            folder_id=folder_id,
            user_id=self.user_id,
            soft_deleted=False
        ).count()
        
        active_links = Link.query.filter_by(
            folder_id=folder_id,
            user_id=self.user_id,
            soft_deleted=False,
            archived_at=None
        ).count()
        
        # Link types
        link_types = db.session.query(
            Link.link_type,
            func.count(Link.id).label('count')
        ).filter_by(
            folder_id=folder_id,
            user_id=self.user_id,
            soft_deleted=False
        ).group_by(Link.link_type).all()
        
        # Recent activity
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_links = Link.query.filter(
            Link.folder_id == folder_id,
            Link.user_id == self.user_id,
            Link.soft_deleted == False,
            Link.created_at >= week_ago
        ).count()
        
        # Top domains
        domain_stats = self._get_folder_domain_stats(folder_id)
        
        return {
            'folder_id': folder_id,
            'name': folder.name,
            'total_links': total_links,
            'active_links': active_links,
            'link_types': dict(link_types),
            'recent_additions': recent_links,
            'top_domains': domain_stats,
            'created_at': folder.created_at.isoformat() if folder.created_at else None,
            'last_activity': self._get_last_activity(folder_id)
        }
    
    def _get_folder_domain_stats(self, folder_id: int) -> List[Dict[str, Any]]:
        """Get domain statistics for folder"""
        links = Link.query.filter_by(
            folder_id=folder_id,
            user_id=self.user_id,
            soft_deleted=False
        ).all()
        
        domain_counts = {}
        for link in links:
            from app.utils.url import extract_domain
            domain = extract_domain(link.original_url)
            if domain:
                domain_counts[domain] = domain_counts.get(domain, 0) + 1
        
        # Sort by count
        sorted_domains = sorted(
            domain_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {'domain': domain, 'count': count}
            for domain, count in sorted_domains[:10]
        ]
    
    def _get_last_activity(self, folder_id: int) -> Optional[str]:
        """Get timestamp of last activity in folder"""
        last_link = Link.query.filter_by(
            folder_id=folder_id,
            user_id=self.user_id,
            soft_deleted=False
        ).order_by(desc(Link.updated_at)).first()
        
        if last_link and last_link.updated_at:
            return last_link.updated_at.isoformat()
        
        return None
    
    def suggest_folder_merge(self) -> List[Dict[str, Any]]:
        """Suggest folders that could be merged"""
        folders = Folder.query.filter_by(
            user_id=self.user_id,
            soft_deleted=False
        ).all()
        
        suggestions = []
        
        # Find folders with similar names
        for i, folder1 in enumerate(folders):
            for folder2 in folders[i+1:]:
                similarity = self._calculate_name_similarity(folder1.name, folder2.name)
                
                if similarity > 0.7:  # High similarity threshold
                    # Get link counts
                    count1 = Link.query.filter_by(
                        folder_id=folder1.id,
                        user_id=self.user_id,
                        soft_deleted=False
                    ).count()
                    
                    count2 = Link.query.filter_by(
                        folder_id=folder2.id,
                        user_id=self.user_id,
                        soft_deleted=False
                    ).count()
                    
                    suggestions.append({
                        'folders': [
                            {'id': folder1.id, 'name': folder1.name, 'link_count': count1},
                            {'id': folder2.id, 'name': folder2.name, 'link_count': count2}
                        ],
                        'similarity_score': similarity,
                        'suggested_name': folder1.name if count1 >= count2 else folder2.name,
                        'total_links': count1 + count2
                    })
        
        return sorted(suggestions, key=lambda x: x['similarity_score'], reverse=True)[:5]
    
    def _calculate_name_similarity(self, name1: str, name2: str) -> float:
        """Calculate similarity between folder names"""
        from difflib import SequenceMatcher
        return SequenceMatcher(None, name1.lower(), name2.lower()).ratio()
    
    def bulk_organize_links(self, organization_rules: List[Dict[str, Any]]) -> Dict[str, int]:
        """Bulk organize links based on rules"""
        results = {'moved': 0, 'errors': 0}
        
        for rule in organization_rules:
            try:
                rule_type = rule.get('type')
                
                if rule_type == 'domain':
                    moved = self._organize_by_domain(rule)
                    results['moved'] += moved
                    
                elif rule_type == 'keyword':
                    moved = self._organize_by_keyword(rule)
                    results['moved'] += moved
                    
                elif rule_type == 'date':
                    moved = self._organize_by_date(rule)
                    results['moved'] += moved
                    
            except Exception as e:
                logger.error(f"Error processing organization rule: {e}")
                results['errors'] += 1
        
        db.session.commit()
        self._clear_cache()
        
        return results
    
    def _organize_by_domain(self, rule: Dict[str, Any]) -> int:
        """Organize links by domain"""
        domain = rule.get('domain')
        target_folder_id = rule.get('target_folder_id')
        
        if not domain or not target_folder_id:
            return 0
        
        links = Link.query.filter(
            Link.user_id == self.user_id,
            Link.soft_deleted == False,
            Link.folder_id.is_(None),  # Only unassigned
            func.lower(Link.original_url).like(f'%{domain.lower()}%')
        ).all()
        
        moved = 0
        for link in links:
            from app.utils.url import extract_domain
            if extract_domain(link.original_url) == domain:
                link.folder_id = target_folder_id
                moved += 1
        
        return moved
    
    def _organize_by_keyword(self, rule: Dict[str, Any]) -> int:
        """Organize links by keyword"""
        keyword = rule.get('keyword', '').lower()
        target_folder_id = rule.get('target_folder_id')
        
        if not keyword or not target_folder_id:
            return 0
        
        search_pattern = f'%{keyword}%'
        links = Link.query.filter(
            Link.user_id == self.user_id,
            Link.soft_deleted == False,
            Link.folder_id.is_(None),
            func.lower(Link.title).like(search_pattern) |
            func.lower(Link.notes).like(search_pattern)
        ).all()
        
        for link in links:
            link.folder_id = target_folder_id
        
        return len(links)
    
    def _organize_by_date(self, rule: Dict[str, Any]) -> int:
        """Organize links by creation date"""
        date_range = rule.get('date_range')  # e.g., 'this_month', 'last_week'
        target_folder_id = rule.get('target_folder_id')
        
        if not date_range or not target_folder_id:
            return 0
        
        # Calculate date filter
        now = datetime.utcnow()
        if date_range == 'this_month':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif date_range == 'last_week':
            from datetime import timedelta
            start_date = now - timedelta(days=7)
        else:
            return 0
        
        links = Link.query.filter(
            Link.user_id == self.user_id,
            Link.soft_deleted == False,
            Link.folder_id.is_(None),
            Link.created_at >= start_date
        ).all()
        
        for link in links:
            link.folder_id = target_folder_id
        
        return len(links)
    
    def _clear_cache(self):
        """Clear folder-related cache"""
        if redis_client.available:
            cache_keys = [
                f"{self.cache_key}:tree",
                f"{self.cache_key}:stats",
                f"{self.cache_key}:structure"
            ]
            for key in cache_keys:
                redis_client.delete(key)

def serialize_folder(folder: Folder, include_counts: bool = False, include_analytics: bool = False) -> Dict[str, Any]:
    """Enhanced folder serialization"""
    data = {
        'id': folder.id,
        'name': folder.name,
        'color': folder.color,
        'icon': folder.icon,
        'position': folder.position,
        'parent_id': folder.parent_id,
        'pinned': folder.pinned,
        'created_at': folder.created_at.isoformat() if folder.created_at else None,
        'updated_at': folder.updated_at.isoformat() if folder.updated_at else None
    }
    
    if include_counts:
        data['link_count'] = Link.query.filter_by(
            folder_id=folder.id,
            user_id=folder.user_id,
            soft_deleted=False,
            archived_at=None
        ).count()
        
        data['total_link_count'] = Link.query.filter_by(
            folder_id=folder.id,
            user_id=folder.user_id,
            soft_deleted=False
        ).count()
    
    if include_analytics:
        manager = SmartFolderManager(folder.user_id)
        data['analytics'] = manager.get_folder_analytics(folder.id)
    
    return data

def serialize_folders(folders: List[Folder], include_counts: bool = False) -> List[Dict[str, Any]]:
    """Serialize multiple folders"""
    return [serialize_folder(folder, include_counts) for folder in folders]

# Update existing functions
def create_folder(user_id: str, data: Dict[str, Any]) -> Optional[Folder]:
    """Enhanced folder creation"""
    manager = SmartFolderManager(user_id)
    folder, error = manager.create_smart_folder(data)
    return folder

def get_user_folders(user_id: str) -> List[Folder]:
    """Get user folders with caching"""
    cache_key = f"folders:{user_id}:list"
    
    if redis_client.available:
        cached = redis_client.get(cache_key)
        if cached:
            try:
                folder_ids = json.loads(cached)
                return Folder.query.filter(
                    Folder.id.in_(folder_ids),
                    Folder.user_id == user_id,
                    Folder.soft_deleted == False
                ).order_by(Folder.position, Folder.created_at).all()
            except (json.JSONDecodeError, TypeError):
                pass
    
    folders = Folder.query.filter_by(
        user_id=user_id,
        soft_deleted=False
    ).order_by(Folder.position, Folder.created_at).all()
    
    # Cache folder IDs
    if redis_client.available:
        folder_ids = [f.id for f in folders]
        redis_client.setex(cache_key, 300, json.dumps(folder_ids))
    
    return folders

def get_folder_with_counts(user_id: str) -> List[Dict[str, Any]]:
    """Enhanced folder listing with counts"""
    cache_key = f"folders:{user_id}:with_counts"
    
def update_folder(user_id: str, folder_id: int, data: Dict[str, Any]) -> Optional[Folder]:
    """Update folder (backward compatibility wrapper)"""
    folder = Folder.query.filter_by(
        id=folder_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not folder:
        return None
    
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return None
        
        existing = Folder.query.filter(
            Folder.user_id == user_id,
            Folder.name == name,
            Folder.id != folder_id,
            Folder.soft_deleted == False
        ).first()
        
        if existing:
            return None
        
        folder.name = name
    
    if 'color' in data:
        folder.color = data['color']
    
    if 'icon' in data:
        folder.icon = data['icon']
    
    if 'position' in data:
        folder.position = data['position']
    
    if 'pinned' in data:
        folder.pinned = bool(data['pinned'])
    
    folder.updated_at = datetime.utcnow()
    db.session.commit()
    return folder

def soft_delete_folder(user_id: str, folder_id: int) -> bool:
    """Soft delete folder (backward compatibility)"""
    folder = Folder.query.filter_by(
        id=folder_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not folder:
        return False
    
    # Move child folders to root level
    child_folders = Folder.query.filter_by(
        parent_id=folder_id,
        user_id=user_id,
        soft_deleted=False
    ).all()
    
    for child in child_folders:
        child.parent_id = folder.parent_id
    
    # Unassign links from folder
    Link.query.filter_by(
        folder_id=folder_id,
        user_id=user_id
    ).update({'folder_id': None})
    
    folder.soft_deleted = True
    folder.updated_at = datetime.utcnow()
    db.session.commit()
    return True

def restore_folder(user_id: str, folder_id: int) -> Optional[Folder]:
    """Restore soft deleted folder (backward compatibility)"""
    folder = Folder.query.filter_by(
        id=folder_id,
        user_id=user_id,
        soft_deleted=True
    ).first()
    
    if not folder:
        return None
    
    folder.soft_deleted = False
    folder.updated_at = datetime.utcnow()
    db.session.commit()
    return folder