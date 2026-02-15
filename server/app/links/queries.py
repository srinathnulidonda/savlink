# server/app/links/queries.py

from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy import or_, and_, func, desc, case
from app.models import Link, LinkTag, Folder, Tag
from app.extensions import db

def base_query(user_id: str):
    """Enhanced base query with performance optimizations"""
    return Link.query.filter(
        Link.user_id == user_id,
        Link.soft_deleted == False
    )

def apply_folder_filter(query, folder_id: Optional[int], unassigned_only: bool, system_folder: Optional[str] = None):
    """Enhanced folder filtering with system folder support"""
    if system_folder == 'my_files':
        # My Files shows everything (no additional filtering needed)
        return query.filter(Link.archived_at.is_(None))
    elif unassigned_only:
        return query.filter(Link.folder_id.is_(None))
    elif folder_id is not None:
        return query.filter(Link.folder_id == folder_id)
    return query

def apply_tag_filter(query, tag_ids: List[int]):
    """Enhanced tag filtering with better performance"""
    if not tag_ids:
        return query
    
    # Use EXISTS for better performance with multiple tags
    for tag_id in tag_ids:
        subquery = db.session.query(LinkTag.link_id).filter(
            LinkTag.tag_id == tag_id,
            LinkTag.link_id == Link.id
        )
        query = query.filter(subquery.exists())
    
    return query

def apply_status_filters(query, filters: Dict[str, Any]):
    """Apply various status filters"""
    if filters.get('starred'):
        query = query.filter(Link.starred == True)
    
    if filters.get('pinned'):
        query = query.filter(Link.pinned == True)
    
    if filters.get('frequently_used'):
        query = query.filter(Link.frequently_used == True)
    
    if filters.get('active') is not None:
        query = query.filter(Link.is_active == filters['active'])
    
    if filters.get('link_type'):
        query = query.filter(Link.link_type == filters['link_type'])
    
    return query

def view_all(user_id: str):
    """All active links with intelligent ordering"""
    return base_query(user_id).filter(
        Link.archived_at.is_(None)
    ).order_by(
        desc(Link.pinned),
        desc(Link.starred), 
        desc(Link.frequently_used),
        desc(Link.updated_at)
    )

def view_recent(user_id: str):
    """Recent links (last 7 days) with activity weighting"""
    cutoff = datetime.utcnow() - timedelta(days=7)
    return base_query(user_id).filter(
        Link.archived_at.is_(None),
        or_(
            Link.created_at >= cutoff,
            Link.updated_at >= cutoff
        )
    ).order_by(
        desc(Link.updated_at),
        desc(Link.created_at)
    )

def view_starred(user_id: str):
    """Starred links ordered by star date"""
    return base_query(user_id).filter(
        Link.starred == True,
        Link.archived_at.is_(None)
    ).order_by(
        desc(Link.pinned_at),  # Pinned starred items first
        desc(Link.updated_at)
    )

def view_pinned(user_id: str):
    """Pinned links ordered by pin date"""
    return base_query(user_id).filter(
        Link.pinned == True,
        Link.archived_at.is_(None)
    ).order_by(
        desc(Link.pinned_at),
        desc(Link.created_at)
    )

def view_archive(user_id: str):
    """Archived links ordered by archive date"""
    return base_query(user_id).filter(
        Link.archived_at.isnot(None)
    ).order_by(desc(Link.archived_at))

def view_expired(user_id: str):
    """Expired short links"""
    return base_query(user_id).filter(
        Link.link_type == 'shortened',
        Link.expires_at.isnot(None),
        Link.expires_at <= datetime.utcnow()
    ).order_by(desc(Link.expires_at))

def view_expiring_soon(user_id: str, days: int = 7):
    """Links expiring within specified days"""
    cutoff = datetime.utcnow() + timedelta(days=days)
    return base_query(user_id).filter(
        Link.link_type == 'shortened',
        Link.expires_at.isnot(None),
        Link.expires_at <= cutoff,
        Link.expires_at > datetime.utcnow()
    ).order_by(Link.expires_at)

def view_trending(user_id: str):
    """Trending links based on recent activity and engagement"""
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    # Calculate engagement score using SQL
    engagement_score = case([
        (Link.click_count > 10, 50),
        (Link.click_count > 5, 30),
        (Link.click_count > 0, 20)
    ], else_=0) + case([
        (Link.frequently_used == True, 25),
        (Link.starred == True, 15),
        (Link.pinned == True, 20)
    ], else_=0) + case([
        (Link.updated_at >= week_ago, 30)
    ], else_=0)
    
    return base_query(user_id).filter(
        Link.archived_at.is_(None)
    ).order_by(
        desc(engagement_score),
        desc(Link.click_count),
        desc(Link.updated_at)
    )

def view_frequently_used(user_id: str):
    """Frequently used links"""
    return base_query(user_id).filter(
        Link.frequently_used == True,
        Link.archived_at.is_(None)
    ).order_by(
        desc(Link.click_count),
        desc(Link.updated_at)
    )

VIEW_MAP = {
    'all': view_all,
    'recent': view_recent,
    'starred': view_starred,
    'pinned': view_pinned,
    'archive': view_archive,
    'expired': view_expired,
    'trending': view_trending,
    'frequently_used': view_frequently_used,
}

def apply_search(query, search_term: str):
    """Enhanced search with better relevance"""
    if not search_term or not search_term.strip():
        return query

    term = f'%{search_term.strip()}%'
    
    # Build search conditions with relevance weighting
    search_conditions = [
        Link.title.ilike(term),
        Link.original_url.ilike(term),
        Link.notes.ilike(term),
        Link.slug.ilike(term)
    ]
    
    # Domain-specific search
    from app.utils.url import extract_domain
    domain = extract_domain(search_term.strip())
    if domain:
        search_conditions.append(
            Link.original_url.ilike(f'%{domain}%')
        )
    
    query = query.filter(or_(*search_conditions))
    
    # Order by relevance (title matches first, then URL, etc.)
    relevance_score = case([
        (func.lower(Link.title).like(func.lower(term)), 100),
        (func.lower(Link.original_url).like(func.lower(term)), 80),
        (func.lower(Link.notes).like(func.lower(term)), 60),
        (func.lower(Link.slug).like(func.lower(term)), 70)
    ], else_=0)
    
    return query.order_by(
        desc(relevance_score),
        desc(Link.pinned),
        desc(Link.starred),
        desc(Link.updated_at)
    )

def paginate_cursor(query, cursor: Optional[str], limit: int) -> Tuple[List[Link], Optional[str]]:
    """Enhanced cursor pagination with better performance"""
    if cursor:
        try:
            cursor_id = int(cursor)
            query = query.filter(Link.id < cursor_id)
        except (ValueError, TypeError):
            pass

    results = query.limit(limit + 1).all()

    next_cursor = None
    if len(results) > limit:
        results = results[:limit]
        next_cursor = str(results[-1].id)

    return results, next_cursor

def count_views(user_id: str) -> dict:
    """Enhanced view counts with caching consideration"""
    # Base query for performance
    base_active = base_query(user_id).filter(Link.archived_at.is_(None))
    
    # Calculate counts efficiently
    all_count = base_active.count()
    
    # Recent (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_count = base_active.filter(
        or_(
            Link.created_at >= week_ago,
            Link.updated_at >= week_ago
        )
    ).count()
    
    # Status-based counts
    starred_count = base_active.filter(Link.starred == True).count()
    pinned_count = base_active.filter(Link.pinned == True).count()
    frequently_used_count = base_active.filter(Link.frequently_used == True).count()
    
    # Archive count
    archive_count = base_query(user_id).filter(Link.archived_at.isnot(None)).count()
    
    # Unassigned count
    unassigned_count = base_active.filter(Link.folder_id.is_(None)).count()
    
    # Short link specific counts
    short_links = base_query(user_id).filter(Link.link_type == 'shortened')
    
    expired_count = short_links.filter(
        Link.expires_at.isnot(None),
        Link.expires_at <= datetime.utcnow()
    ).count()
    
    expiring_soon_count = short_links.filter(
        Link.expires_at.isnot(None),
        Link.expires_at <= datetime.utcnow() + timedelta(days=7),
        Link.expires_at > datetime.utcnow()
    ).count()

    return {
        'all': all_count,
        'recent': recent_count,
        'starred': starred_count,
        'pinned': pinned_count,
        'frequently_used': frequently_used_count,
        'archive': archive_count,
        'unassigned': unassigned_count,
        'expired': expired_count,
        'expiring_soon': expiring_soon_count,
    }

def get_link_for_user(link_id: int, user_id: str) -> Optional[Link]:
    """Get link for user with relationship loading"""
    return Link.query.options(
        db.joinedload(Link.folder),
        db.joinedload(Link.user)
    ).filter_by(
        id=link_id,
        user_id=user_id,
        soft_deleted=False
    ).first()

def get_links_by_domain(user_id: str, domain: str, limit: int = 50) -> List[Link]:
    """Get links by domain for organization"""
    return base_query(user_id).filter(
        Link.archived_at.is_(None),
        func.lower(Link.original_url).like(f'%{domain.lower()}%')
    ).order_by(desc(Link.created_at)).limit(limit).all()

def get_links_needing_organization(user_id: str, limit: int = 100) -> List[Link]:
    """Get links that could benefit from organization"""
    return base_query(user_id).filter(
        Link.archived_at.is_(None),
        Link.folder_id.is_(None),  # Unassigned
        or_(
            Link.title.is_(None),  # No title
            ~db.exists().where(  # No tags
                and_(
                    LinkTag.link_id == Link.id,
                    LinkTag.user_id == user_id
                )
            )
        )
    ).order_by(desc(Link.created_at)).limit(limit).all()