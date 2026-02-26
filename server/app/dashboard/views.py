# server/app/dashboard/views.py

import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy import or_, func, desc, asc
from sqlalchemy.orm import joinedload
from app.models import Link, Folder, LinkTag, Tag
from app.extensions import db
from app.dashboard.serializers import serialize_link
from app.cache.redis_layer import cache
from app.cache import keys as K

logger = logging.getLogger(__name__)

VALID_VIEWS = {'all', 'recent', 'starred', 'pinned', 'archive', 'expired', 'short', 'frequently_used'}
SORT_MAP = {
    'created_at': Link.created_at,
    'updated_at': Link.updated_at,
    'title': Link.title,
    'click_count': Link.click_count
}


def resolve_view(user_id, view='all', search=None, cursor=None, limit=20,
                 sort='created_at', order='desc', **filters):
    if view not in VALID_VIEWS:
        view = 'all'
    limit = max(1, min(limit, 100))
    sort = sort if sort in SORT_MAP else 'created_at'
    order = order if order in ('asc', 'desc') else 'desc'

    from app.links.queries import VIEW_MAP, apply_search, apply_filters, paginate
    query_fn = VIEW_MAP.get(view, VIEW_MAP['all'])
    query = query_fn(user_id)
    query = apply_filters(query, filters)
    if search:
        query = apply_search(query, search)

    col = SORT_MAP[sort]
    direction = asc(col) if order == 'asc' else desc(col)
    if view in ('all', 'recent') and sort == 'created_at' and order == 'desc':
        query = query.order_by(desc(Link.pinned), desc(Link.starred), direction)
    else:
        query = query.order_by(direction)

    links, next_cursor = paginate(query, cursor, limit)
    meta = {
        'view': view,
        'count': len(links),
        'has_more': next_cursor is not None,
        'next_cursor': next_cursor,
        'sort': sort,
        'order': order
    }
    return links, next_cursor, meta


def get_recent_items(user_id: str, limit: int = 20) -> Dict[str, Any]:
    key = K.DASH_RECENT.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    week_ago = datetime.utcnow() - timedelta(days=7)
    links = (
        Link.query.options(joinedload(Link.folder))
        .filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,
            Link.archived_at.is_(None),
            or_(Link.created_at >= week_ago, Link.updated_at >= week_ago)
        )
        .order_by(desc(Link.updated_at))
        .limit(limit)
        .all()
    )
    folders = (
        Folder.query.filter(
            Folder.user_id == user_id,
            Folder.soft_deleted == False,
            Folder.updated_at >= week_ago
        )
        .order_by(desc(Folder.updated_at))
        .limit(5)
        .all()
    )
    from app.folders.service import serialize_folder

    data = {
        'recent_links': [serialize_link(l) for l in links],
        'recent_folders': [serialize_folder(f, counts=True) for f in folders],
        'period': '7d'
    }
    cache.put(key, data, K.TTL_DASHBOARD)
    return data


def get_pinned_items(user_id: str) -> Dict[str, Any]:
    key = K.DASH_PINNED.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    links = (
        Link.query.options(joinedload(Link.folder))
        .filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,
            Link.archived_at.is_(None),
            Link.pinned == True
        )
        .order_by(desc(Link.pinned_at), desc(Link.created_at))
        .limit(50)
        .all()
    )
    folders = (
        Folder.query.filter(
            Folder.user_id == user_id,
            Folder.soft_deleted == False,
            Folder.pinned == True
        )
        .order_by(desc(Folder.updated_at))
        .all()
    )
    from app.folders.service import serialize_folder

    data = {
        'pinned_links': [serialize_link(l) for l in links],
        'pinned_folders': [serialize_folder(f, counts=True) for f in folders],
        'total_pinned': len(links) + len(folders)
    }
    cache.put(key, data, K.TTL_DASHBOARD)
    return data


def get_starred_items(user_id: str, limit: int = 30) -> Dict[str, Any]:
    key = K.DASH_STARRED.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    links = (
        Link.query.options(joinedload(Link.folder))
        .filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,
            Link.archived_at.is_(None),
            Link.starred == True
        )
        .order_by(desc(Link.updated_at))
        .limit(limit)
        .all()
    )
    data = {
        'starred_links': [serialize_link(l) for l in links],
        'total_starred': len(links)
    }
    cache.put(key, data, K.TTL_DASHBOARD)
    return data


def get_overview(user_id: str) -> Dict[str, Any]:
    key = K.DASH_OVERVIEW.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    data = {
        'home': get_home_data(user_id),
        'stats': get_stats(user_id),
        'pinned': get_pinned_items(user_id),
        'starred': get_starred_items(user_id)
    }
    try:
        from app.folders.service import get_folder_tree
        data['folder_tree'] = get_folder_tree(user_id)
    except Exception:
        data['folder_tree'] = []
    try:
        from app.tags.service import get_tags_with_counts
        data['tags'] = get_tags_with_counts(user_id)
    except Exception:
        data['tags'] = []

    cache.put(key, data, K.TTL_DASHBOARD)
    return data


def _when(cond):
    return db.case((cond, 1), else_=0)


def _safe_int(v):
    return int(v) if v else 0


def get_stats(user_id: str) -> Dict[str, Any]:
    key = K.DASH_STATS.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    na = Link.archived_at.is_(None)
    week_ago = datetime.utcnow() - timedelta(days=7)
    try:
        r = db.session.query(
            func.count(Link.id).label('total'),
            func.sum(_when(db.and_(na, Link.is_active == True))).label('active'),
            func.sum(_when(db.and_(Link.starred == True, na))).label('starred'),
            func.sum(_when(db.and_(Link.pinned == True, na))).label('pinned'),
            func.sum(_when(Link.archived_at.isnot(None))).label('archived'),
            func.sum(_when(db.and_(Link.folder_id.is_(None), na))).label('unassigned'),
            func.sum(_when(Link.created_at >= week_ago)).label('this_week'),
            func.sum(_when(db.and_(Link.link_type == 'shortened', na))).label('short'),
            func.sum(_when(db.and_(Link.frequently_used == True, na))).label('frequently_used'),
            db.func.coalesce(
                func.sum(db.case((Link.link_type == 'shortened', Link.click_count), else_=0)), 0
            ).label('clicks')
        ).filter(Link.user_id == user_id, Link.soft_deleted == False).one()

        stats = {
            'overview': {
                'total_links': _safe_int(r.total),
                'active_links': _safe_int(r.active),
                'total_clicks': _safe_int(r.clicks),
                'this_week': _safe_int(r.this_week)
            },
            'counts': {
                'all': _safe_int(r.active),
                'starred': _safe_int(r.starred),
                'pinned': _safe_int(r.pinned),
                'archive': _safe_int(r.archived),
                'unassigned': _safe_int(r.unassigned),
                'short': _safe_int(r.short),
                'frequently_used': _safe_int(r.frequently_used)
            }
        }
    except Exception as e:
        logger.error("Stats query failed: %s", e)
        stats = {'overview': {}, 'counts': {}}

    try:
        from app.tags.service import get_tags_with_counts
        stats['tags'] = get_tags_with_counts(user_id)
    except Exception:
        stats['tags'] = []
    try:
        from app.folders.service import get_user_folders, serialize_folder
        stats['folders'] = [serialize_folder(f, counts=True) for f in get_user_folders(user_id)]
    except Exception:
        stats['folders'] = []

    cache.put(key, stats, K.TTL_STATS)
    return stats


def get_home_data(user_id: str) -> Dict[str, Any]:
    key = K.DASH_HOME.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    recent = (
        Link.query.options(joinedload(Link.folder))
        .filter(Link.user_id == user_id, Link.soft_deleted == False, Link.archived_at.is_(None))
        .order_by(desc(Link.created_at))
        .limit(10)
        .all()
    )
    
    week_ago = datetime.utcnow() - timedelta(days=7)
    na = Link.archived_at.is_(None)
    
    total = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False, na).count()
    folders_count = Folder.query.filter(Folder.user_id == user_id, Folder.soft_deleted == False).count()
    starred_count = Link.query.filter(
        Link.user_id == user_id, Link.soft_deleted == False, na, Link.starred == True
    ).count()
    this_week = Link.query.filter(
        Link.user_id == user_id, Link.soft_deleted == False, Link.created_at >= week_ago
    ).count()
    clicks = (
        db.session.query(func.coalesce(func.sum(Link.click_count), 0))
        .filter(Link.user_id == user_id, Link.soft_deleted == False, Link.link_type == 'shortened')
        .scalar()
    )

    folders = (
        Folder.query.filter(Folder.user_id == user_id, Folder.soft_deleted == False)
        .order_by(desc(Folder.pinned), desc(Folder.updated_at))
        .limit(6)
        .all()
    )

    activities = _get_recent_activity(user_id, limit=10)

    data = {
        'recent_links': [serialize_link(l) for l in recent],
        'quick_access': get_quick_access(user_id),
        'folders': [_serialize_folder_preview(f) for f in folders],
        'activities': activities,
        'stats': {
            'total_links': total,
            'total_folders': folders_count,
            'starred': starred_count,
            'this_week': this_week,
            'total_clicks': int(clicks or 0)
        }
    }
    cache.put(key, data, K.TTL_DASHBOARD)
    return data


def _serialize_folder_preview(folder: Folder) -> Dict[str, Any]:
    count = Link.query.filter(
        Link.folder_id == folder.id,
        Link.user_id == folder.user_id,
        Link.soft_deleted == False,
        Link.archived_at.is_(None)
    ).count()
    return {
        'id': folder.id,
        'name': folder.name,
        'icon': folder.icon or '📁',
        'color': folder.color,
        'count': count,
        'pinned': folder.pinned
    }


def _get_recent_activity(user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    try:
        from app.models.activity_log import ActivityLog
        from app.utils.time import relative_time
        
        activities = (
            ActivityLog.query
            .filter(ActivityLog.user_id == user_id)
            .order_by(desc(ActivityLog.created_at))
            .limit(limit)
            .all()
        )
        
        result = []
        for a in activities:
            action_parts = (a.action or '').split('.')
            action_type = action_parts[1] if len(action_parts) > 1 else action_parts[0]
            
            description = _build_activity_description(a)
            
            result.append({
                'id': a.id,
                'type': action_type,
                'action': a.action,
                'description': description,
                'time': relative_time(a.created_at) if a.created_at else '',
                'created_at': a.created_at.isoformat() if a.created_at else None
            })
        
        return result
    except Exception as e:
        logger.warning("Failed to get activity: %s", e)
        return []


def _build_activity_description(activity) -> str:
    action = activity.action or ''
    details = activity.details or {}
    title = details.get('title', '')
    
    verbs = {
        'link.created': 'Saved',
        'link.updated': 'Updated',
        'link.deleted': 'Deleted',
        'link.pinned': 'Pinned',
        'link.unpinned': 'Unpinned',
        'link.starred': 'Starred',
        'link.unstarred': 'Unstarred',
        'link.archived': 'Archived',
        'link.restored': 'Restored',
        'link.moved': 'Moved',
        'folder.created': 'Created folder',
        'folder.deleted': 'Deleted folder',
        'folder.updated': 'Updated folder',
        'bulk.delete': 'Deleted multiple links',
        'bulk.archive': 'Archived multiple links'
    }
    
    verb = verbs.get(action, action.replace('.', ' ').replace('_', ' ').title())
    
    if 'bulk' in action:
        count = details.get('count', 0)
        return f"{verb} ({count} items)"
    
    if title:
        return f'{verb} "{title[:50]}{"..." if len(title) > 50 else ""}"'
    
    return verb


def get_quick_access(user_id: str, limit: int = 8) -> List[Dict[str, Any]]:
    key = K.DASH_QUICK.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    items = []
    links = (
        Link.query.options(joinedload(Link.folder))
        .filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,
            Link.archived_at.is_(None),
            or_(Link.pinned == True, Link.starred == True, Link.frequently_used == True)
        )
        .order_by(desc(Link.pinned), desc(Link.frequently_used), desc(Link.starred), desc(Link.updated_at))
        .limit(limit)
        .all()
    )
    for link in links:
        items.append({'type': 'link', 'item': serialize_link(link)})

    folders = (
        Folder.query.filter(
            Folder.user_id == user_id,
            Folder.soft_deleted == False,
            Folder.pinned == True
        )
        .order_by(desc(Folder.updated_at))
        .limit(3)
        .all()
    )
    for f in folders:
        cnt = Link.query.filter(
            Link.user_id == user_id,
            Link.folder_id == f.id,
            Link.soft_deleted == False,
            Link.archived_at.is_(None)
        ).count()
        items.append({
            'type': 'folder',
            'item': {
                'id': f.id,
                'name': f.name,
                'color': f.color,
                'icon': f.icon,
                'link_count': cnt,
                'pinned': True
            }
        })

    result = items[:limit]
    cache.put(key, result, K.TTL_DASHBOARD)
    return result