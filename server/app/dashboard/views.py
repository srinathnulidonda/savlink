# server/app/dashboard/views.py
# Query building, filtering, sorting, pagination, and stats

from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy import and_, or_, func, desc, asc, text
from sqlalchemy.orm import joinedload
from app.models import Link, Folder, Tag, LinkTag
from app.extensions import db
import logging

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────

VALID_VIEWS = {'all', 'recent', 'starred', 'pinned', 'archive', 'expired'}

SORT_COLUMNS = {
    'created_at': Link.created_at,
    'updated_at': Link.updated_at,
    'title': Link.title,
    'click_count': Link.click_count,
}

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


# ─── Main Entry Point ────────────────────────────────────────────────

def resolve_view(
    user_id: str,
    view: str = 'all',
    search: Optional[str] = None,
    cursor: Optional[str] = None,
    limit: int = DEFAULT_LIMIT,
    sort: str = 'created_at',
    order: str = 'desc',
    **filters,
) -> Tuple[List[Link], Optional[str], Dict[str, Any]]:
    """
    Build and execute a filtered, sorted, paginated link query.

    Returns (links, next_cursor, meta).
    """
    # Validate inputs
    if view not in VALID_VIEWS:
        view = 'all'
    limit = max(1, min(limit, MAX_LIMIT))
    if sort not in SORT_COLUMNS:
        sort = 'created_at'
    if order not in ('asc', 'desc'):
        order = 'desc'

    # Build query with eager loading
    query = Link.query.options(
        joinedload(Link.folder),
    ).filter(
        Link.user_id == user_id,
        Link.soft_deleted == False,  # noqa: E712
    )

    # View filter
    query = _apply_view(query, view)

    # Additional filters
    query = _apply_filters(query, filters)

    # Search
    if search:
        query = _apply_search(query, search)

    # Sorting
    query = _apply_sort(query, sort, order, view)

    # Pagination
    links, next_cursor = _paginate(query, cursor, limit)

    meta = {
        'view': view,
        'count': len(links),
        'has_more': next_cursor is not None,
        'next_cursor': next_cursor,
        'sort': sort,
        'order': order,
    }

    return links, next_cursor, meta


# ─── Stats ────────────────────────────────────────────────────────────

def get_stats(user_id: str) -> Dict[str, Any]:
    """
    Dashboard statistics — single efficient query for counts.
    """
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    not_archived = Link.archived_at.is_(None)

    try:
        row = db.session.query(
            func.count(Link.id).label('total'),
            func.sum(_when(and_(not_archived, Link.is_active == True))).label('active'),    # noqa: E712
            func.sum(_when(and_(Link.starred == True, not_archived))).label('starred'),      # noqa: E712
            func.sum(_when(and_(Link.pinned == True, not_archived))).label('pinned'),        # noqa: E712
            func.sum(_when(Link.archived_at.isnot(None))).label('archived'),
            func.sum(_when(and_(Link.folder_id.is_(None), not_archived))).label('unassigned'),
            func.sum(_when(Link.created_at >= week_ago)).label('this_week'),
            func.coalesce(
                func.sum(
                    db.case(
                        (Link.link_type == 'shortened', Link.click_count),
                        else_=0,
                    )
                ),
                0,
            ).label('total_clicks'),
        ).filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,  # noqa: E712
        ).one()

        counts = {
            'all': _int(row.active) + _int(row.archived),  # non-deleted total
            'starred': _int(row.starred),
            'pinned': _int(row.pinned),
            'archive': _int(row.archived),
            'unassigned': _int(row.unassigned),
        }

        stats = {
            'overview': {
                'total_links': _int(row.total),
                'active_links': _int(row.active),
                'total_clicks': _int(row.total_clicks),
                'this_week': _int(row.this_week),
            },
            'counts': counts,
        }

    except Exception as e:
        logger.error(f"Stats query failed, falling back: {e}", exc_info=True)
        stats = _fallback_stats(user_id, week_ago)

    # Folder stats (optional dependency)
    try:
        from app.folders.service import get_folder_with_counts
        stats['folders'] = get_folder_with_counts(user_id)
    except (ImportError, Exception):
        stats['folders'] = _simple_folder_stats(user_id)

    # Tag stats (optional dependency)
    try:
        from app.tags.service import get_tags_with_counts
        stats['tags'] = get_tags_with_counts(user_id)
    except (ImportError, Exception):
        stats['tags'] = _simple_tag_stats(user_id)

    return stats


# ─── Query Helpers ────────────────────────────────────────────────────

def _when(condition):
    """CASE WHEN condition THEN 1 ELSE 0 — for conditional counting."""
    return db.case((condition, 1), else_=0)


def _int(val) -> int:
    """Safely convert a possibly-None aggregate to int."""
    return int(val) if val else 0


def _apply_view(query, view: str):
    """Apply view-specific WHERE clauses."""
    if view == 'all':
        return query.filter(Link.archived_at.is_(None))
    elif view == 'recent':
        cutoff = datetime.utcnow() - timedelta(days=7)
        return query.filter(Link.archived_at.is_(None), Link.created_at >= cutoff)
    elif view == 'starred':
        return query.filter(Link.starred == True, Link.archived_at.is_(None))  # noqa: E712
    elif view == 'pinned':
        return query.filter(Link.pinned == True, Link.archived_at.is_(None))   # noqa: E712
    elif view == 'archive':
        return query.filter(Link.archived_at.isnot(None))
    elif view == 'expired':
        return query.filter(
            Link.link_type == 'shortened',
            Link.expires_at.isnot(None),
            Link.expires_at <= datetime.utcnow(),
        )
    return query.filter(Link.archived_at.is_(None))


def _apply_filters(query, filters: Dict[str, Any]):
    """Apply additional filter criteria."""

    # Folder
    if filters.get('folder_id'):
        query = query.filter(Link.folder_id == filters['folder_id'])
    elif filters.get('unassigned_only'):
        query = query.filter(Link.folder_id.is_(None))

    # System folder scope
    if filters.get('system_folder') == 'my_files':
        try:
            from app.folders.system import get_my_files_scope_query
            query = get_my_files_scope_query(filters.get('_user_id'))
        except (ImportError, Exception):
            pass  # Use existing query as-is

    # Status
    if filters.get('starred_only'):
        query = query.filter(Link.starred == True)   # noqa: E712
    if filters.get('pinned_only'):
        query = query.filter(Link.pinned == True)    # noqa: E712

    # Link type
    if filters.get('link_type'):
        query = query.filter(Link.link_type == filters['link_type'])

    # Tags (links with ANY of the specified tags)
    if filters.get('tag_ids'):
        tag_subq = (
            db.session.query(LinkTag.link_id)
            .filter(LinkTag.tag_id.in_(filters['tag_ids']))
            .distinct()
            .subquery()
        )
        query = query.filter(Link.id.in_(db.session.query(tag_subq)))

    return query


def _apply_search(query, search: str):
    """Full-text search across title, URL, notes, and slug."""
    term = f'%{search.strip()}%'
    return query.filter(
        or_(
            Link.title.ilike(term),
            Link.original_url.ilike(term),
            Link.notes.ilike(term),
            Link.slug.ilike(term),
        )
    )


def _apply_sort(query, sort: str, order: str, view: str):
    """Apply sorting with pinned-first for default views."""
    col = SORT_COLUMNS.get(sort, Link.created_at)
    direction = asc(col) if order == 'asc' else desc(col)

    # In default views, pinned items float to the top
    if view in ('all', 'recent') and sort == 'created_at' and order == 'desc':
        return query.order_by(
            desc(Link.pinned),
            desc(Link.starred),
            direction,
        )

    return query.order_by(direction)


def _paginate(query, cursor: Optional[str], limit: int):
    """
    Offset-based pagination encoded in an opaque cursor.
    
    Cursor = string representation of offset.
    Works with any sort order.
    """
    offset = 0
    if cursor:
        try:
            offset = max(0, int(cursor))
        except (ValueError, TypeError):
            offset = 0

    items = query.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit

    if has_more:
        items = items[:limit]

    next_cursor = str(offset + limit) if has_more else None
    return items, next_cursor


# ─── Fallback Stats (if CASE expression fails on older SQLAlchemy) ───

def _fallback_stats(user_id: str, week_ago: datetime) -> Dict[str, Any]:
    """Simple multi-query fallback for stats."""
    base = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False)  # noqa: E712
    na = Link.archived_at.is_(None)

    return {
        'overview': {
            'total_links': base.count(),
            'active_links': base.filter(na, Link.is_active == True).count(),   # noqa: E712
            'total_clicks': _int(
                db.session.query(func.sum(Link.click_count))
                .filter(Link.user_id == user_id, Link.soft_deleted == False, Link.link_type == 'shortened')
                .scalar()
            ),
            'this_week': base.filter(Link.created_at >= week_ago).count(),
        },
        'counts': {
            'all': base.filter(na).count(),
            'starred': base.filter(Link.starred == True, na).count(),        # noqa: E712
            'pinned': base.filter(Link.pinned == True, na).count(),          # noqa: E712
            'archive': base.filter(Link.archived_at.isnot(None)).count(),
            'unassigned': base.filter(Link.folder_id.is_(None), na).count(),
        },
    }


def _simple_folder_stats(user_id: str) -> List[Dict[str, Any]]:
    """Basic folder list with link counts (no external dependency)."""
    try:
        folders = Folder.query.filter(
            Folder.user_id == user_id,
            Folder.soft_deleted == False,  # noqa: E712
        ).order_by(Folder.position, Folder.name).all()

        result = []
        for f in folders:
            count = Link.query.filter(
                Link.user_id == user_id,
                Link.folder_id == f.id,
                Link.soft_deleted == False,  # noqa: E712
                Link.archived_at.is_(None),
            ).count()
            result.append({
                'id': f.id,
                'name': f.name,
                'color': f.color,
                'icon': getattr(f, 'icon', None),
                'link_count': count,
            })
        return result
    except Exception as e:
        logger.debug(f"Folder stats fallback failed: {e}")
        return []


def _simple_tag_stats(user_id: str) -> List[Dict[str, Any]]:
    """Basic tag list with usage counts (no external dependency)."""
    try:
        tags = Tag.query.filter(Tag.user_id == user_id).order_by(Tag.name).all()

        result = []
        for t in tags:
            count = LinkTag.query.filter(LinkTag.tag_id == t.id, LinkTag.user_id == user_id).count()
            result.append({
                'id': t.id,
                'name': t.name,
                'color': t.color,
                'link_count': count,
            })
        return result
    except Exception as e:
        logger.debug(f"Tag stats fallback failed: {e}")
        return []