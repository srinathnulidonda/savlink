# server/app/dashboard/home/service.py

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import and_, or_, desc, func
from app.extensions import db
from app.models import Link, Folder
from app.utils.ranking import calculate_importance_score
from app.dashboard.service import serialize_link
from app.folders.service import serialize_folder
import logging

logger = logging.getLogger(__name__)

QUICK_ACCESS_LIMIT = 8
RECENT_LIMIT = 20

def get_quick_access(user_id: str) -> List[Dict[str, Any]]:
    """Get quick access items (starred/pinned links + pinned folders)"""
    items = []
    
    # Get pinned and starred links
    links = Link.query.filter(
        Link.user_id == user_id,
        Link.soft_deleted == False,
        Link.archived_at.is_(None),
        or_(Link.pinned == True, Link.starred == True)
    ).order_by(
        desc(Link.pinned),
        desc(Link.starred),
        desc(Link.frequently_used),
        desc(Link.updated_at)
    ).limit(QUICK_ACCESS_LIMIT - 2).all()  # Reserve slots for folders
    
    for link in links:
        items.append({
            'type': 'link',
            'item': serialize_link(link),
            'importance': calculate_importance_score(link)
        })
    
    # Get pinned folders
    folders = Folder.query.filter(
        Folder.user_id == user_id,
        Folder.soft_deleted == False,
        Folder.pinned == True
    ).order_by(desc(Folder.updated_at)).limit(2).all()
    
    for folder in folders:
        items.append({
            'type': 'folder',
            'item': serialize_folder(folder, include_counts=True),
            'importance': 100  # Folders get high base importance
        })
    
    # Sort by importance and limit
    items.sort(key=lambda x: x['importance'], reverse=True)
    return [item['item'] for item in items[:QUICK_ACCESS_LIMIT]]

def get_recent_activity(user_id: str) -> List[Dict[str, Any]]:
    """Get recent activity (opened, added, edited)"""
    cutoff = datetime.utcnow() - timedelta(days=7)
    
    # Recent links (added or updated)
    links = Link.query.filter(
        Link.user_id == user_id,
        Link.soft_deleted == False,
        Link.archived_at.is_(None),
        or_(
            Link.created_at >= cutoff,
            Link.updated_at >= cutoff
        )
    ).order_by(
        desc(Link.updated_at),
        desc(Link.created_at)
    ).limit(RECENT_LIMIT).all()
    
    items = []
    for link in links:
        activity_type = 'added' if link.created_at >= cutoff and link.updated_at <= link.created_at + timedelta(seconds=1) else 'edited'
        items.append({
            'type': 'link',
            'activity': activity_type,
            'timestamp': link.updated_at or link.created_at,
            'item': serialize_link(link)
        })
    
    # Sort by timestamp
    items.sort(key=lambda x: x['timestamp'], reverse=True)
    return items[:RECENT_LIMIT]

def mark_link_accessed(user_id: str, link_id: int) -> bool:
    """Mark a link as accessed for frequency tracking"""
    link = Link.query.filter_by(
        id=link_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not link:
        return False
    
    # Update access metrics
    link.click_count += 1
    link.updated_at = datetime.utcnow()
    
    # Mark as frequently used if accessed multiple times
    if link.click_count >= 3:
        link.frequently_used = True
    
    db.session.commit()
    return True

def get_home_stats(user_id: str) -> Dict[str, Any]:
    """Get quick stats for home dashboard"""
    # Total counts
    total_links = Link.query.filter(
        Link.user_id == user_id,
        Link.soft_deleted == False,
        Link.archived_at.is_(None)
    ).count()
    
    total_folders = Folder.query.filter(
        Folder.user_id == user_id,
        Folder.soft_deleted == False
    ).count()
    
    # This week's activity
    week_ago = datetime.utcnow() - timedelta(days=7)
    this_week = Link.query.filter(
        Link.user_id == user_id,
        Link.soft_deleted == False,
        Link.created_at >= week_ago
    ).count()
    
    return {
        'total_links': total_links,
        'total_folders': total_folders,
        'this_week': this_week
    }