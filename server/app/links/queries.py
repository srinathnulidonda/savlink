# server/app/links/queries.py
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy import or_, func, desc, case
from sqlalchemy.orm import joinedload
from app.models import Link, LinkTag
from app.extensions import db


def base_query(user_id: str):
    return Link.query.options(joinedload(Link.folder)).filter(
        Link.user_id == user_id, Link.soft_deleted == False)


def view_all(user_id: str):
    return base_query(user_id).filter(Link.archived_at.is_(None)).order_by(
        desc(Link.pinned), desc(Link.starred), desc(Link.updated_at))


def view_recent(user_id: str):
    cutoff = datetime.utcnow() - timedelta(days=7)
    return base_query(user_id).filter(
        Link.archived_at.is_(None),
        or_(Link.created_at >= cutoff, Link.updated_at >= cutoff)
    ).order_by(desc(Link.updated_at))


def view_starred(user_id: str):
    return base_query(user_id).filter(
        Link.starred == True, Link.archived_at.is_(None)
    ).order_by(desc(Link.pinned_at), desc(Link.updated_at))


def view_pinned(user_id: str):
    return base_query(user_id).filter(
        Link.pinned == True, Link.archived_at.is_(None)
    ).order_by(desc(Link.pinned_at), desc(Link.created_at))


def view_archive(user_id: str):
    return base_query(user_id).filter(Link.archived_at.isnot(None)).order_by(desc(Link.archived_at))


def view_expired(user_id: str):
    return base_query(user_id).filter(
        Link.link_type == 'shortened', Link.expires_at.isnot(None),
        Link.expires_at <= datetime.utcnow()
    ).order_by(desc(Link.expires_at))


def view_short(user_id: str):
    return base_query(user_id).filter(
        Link.link_type == 'shortened', Link.archived_at.is_(None)
    ).order_by(desc(Link.created_at))


VIEW_MAP = {
    'all': view_all, 'recent': view_recent, 'starred': view_starred,
    'pinned': view_pinned, 'archive': view_archive, 'expired': view_expired,
    'short': view_short,
}


def apply_search(query, term: str):
    if not term or not term.strip():
        return query
    pattern = f'%{term.strip()}%'
    return query.filter(or_(
        Link.title.ilike(pattern), Link.original_url.ilike(pattern),
        Link.notes.ilike(pattern), Link.slug.ilike(pattern),
    ))


def apply_filters(query, filters: Dict[str, Any]):
    if filters.get('folder_id'):
        query = query.filter(Link.folder_id == filters['folder_id'])
    elif filters.get('unassigned_only'):
        query = query.filter(Link.folder_id.is_(None))
    if filters.get('link_type'):
        query = query.filter(Link.link_type == filters['link_type'])
    if filters.get('starred_only'):
        query = query.filter(Link.starred == True)
    if filters.get('pinned_only'):
        query = query.filter(Link.pinned == True)
    if filters.get('tag_ids'):
        sub = db.session.query(LinkTag.link_id).filter(
            LinkTag.tag_id.in_(filters['tag_ids'])).distinct().subquery()
        query = query.filter(Link.id.in_(db.session.query(sub)))
    return query


def paginate(query, cursor: Optional[str], limit: int) -> Tuple[List[Link], Optional[str]]:
    offset = 0
    if cursor:
        try:
            offset = max(0, int(cursor))
        except (ValueError, TypeError):
            pass
    items = query.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]
    return items, str(offset + limit) if has_more else None


def count_views(user_id: str) -> Dict[str, int]:
    b = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False)
    na = Link.archived_at.is_(None)
    week_ago = datetime.utcnow() - timedelta(days=7)
    return {
        'all': b.filter(na).count(),
        'recent': b.filter(na, or_(Link.created_at >= week_ago, Link.updated_at >= week_ago)).count(),
        'starred': b.filter(na, Link.starred == True).count(),
        'pinned': b.filter(na, Link.pinned == True).count(),
        'archive': b.filter(Link.archived_at.isnot(None)).count(),
        'short': b.filter(na, Link.link_type == 'shortened').count(),
        'unassigned': b.filter(na, Link.folder_id.is_(None)).count(),
    }