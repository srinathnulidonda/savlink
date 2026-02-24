# server/app/dashboard/views.py
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy import or_, func, desc, asc
from sqlalchemy.orm import joinedload
from app.models import Link, Folder, LinkTag, Tag
from app.extensions import db
from app.dashboard.serializers import serialize_link

logger = logging.getLogger(__name__)

VALID_VIEWS = {'all', 'recent', 'starred', 'pinned', 'archive', 'expired', 'short'}
SORT_MAP = {'created_at': Link.created_at, 'updated_at': Link.updated_at,
            'title': Link.title, 'click_count': Link.click_count}


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
    meta = {'view': view, 'count': len(links), 'has_more': next_cursor is not None,
            'next_cursor': next_cursor, 'sort': sort, 'order': order}
    return links, next_cursor, meta


def _when(cond):
    return db.case((cond, 1), else_=0)


def _safe_int(v):
    return int(v) if v else 0


def get_stats(user_id: str) -> Dict[str, Any]:
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
            db.func.coalesce(func.sum(db.case((Link.link_type == 'shortened', Link.click_count), else_=0)), 0).label('clicks'),
        ).filter(Link.user_id == user_id, Link.soft_deleted == False).one()

        stats = {
            'overview': {'total_links': _safe_int(r.total), 'active_links': _safe_int(r.active),
                         'total_clicks': _safe_int(r.clicks), 'this_week': _safe_int(r.this_week)},
            'counts': {'all': _safe_int(r.active), 'starred': _safe_int(r.starred),
                       'pinned': _safe_int(r.pinned), 'archive': _safe_int(r.archived),
                       'unassigned': _safe_int(r.unassigned), 'short': _safe_int(r.short)},
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

    return stats


def get_home_data(user_id: str) -> Dict[str, Any]:
    recent = Link.query.options(joinedload(Link.folder)).filter(
        Link.user_id == user_id, Link.soft_deleted == False, Link.archived_at.is_(None)
    ).order_by(desc(Link.created_at)).limit(10).all()

    week_ago = datetime.utcnow() - timedelta(days=7)
    na = Link.archived_at.is_(None)
    total = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False, na).count()
    folders = Folder.query.filter(Folder.user_id == user_id, Folder.soft_deleted == False).count()
    this_week = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False, Link.created_at >= week_ago).count()
    clicks = db.session.query(func.coalesce(func.sum(Link.click_count), 0)).filter(
        Link.user_id == user_id, Link.soft_deleted == False, Link.link_type == 'shortened').scalar()

    return {
        'recent_links': [serialize_link(l) for l in recent],
        'quick_access': get_quick_access(user_id),
        'stats': {'total_links': total, 'total_folders': folders,
                  'this_week': this_week, 'total_clicks': int(clicks or 0)},
    }


def get_quick_access(user_id: str, limit: int = 8) -> List[Dict[str, Any]]:
    items = []
    links = Link.query.options(joinedload(Link.folder)).filter(
        Link.user_id == user_id, Link.soft_deleted == False, Link.archived_at.is_(None),
        or_(Link.pinned == True, Link.starred == True)
    ).order_by(desc(Link.pinned), desc(Link.starred), desc(Link.updated_at)).limit(limit).all()

    for link in links:
        items.append({'type': 'link', 'item': serialize_link(link)})

    folders = Folder.query.filter(
        Folder.user_id == user_id, Folder.soft_deleted == False, Folder.pinned == True
    ).order_by(desc(Folder.updated_at)).limit(3).all()

    for f in folders:
        cnt = Link.query.filter(Link.user_id == user_id, Link.folder_id == f.id,
                                Link.soft_deleted == False, Link.archived_at.is_(None)).count()
        items.append({'type': 'folder', 'item': {
            'id': f.id, 'name': f.name, 'color': f.color, 'icon': f.icon,
            'link_count': cnt, 'pinned': True}})

    return items[:limit]