# server/app/folders/service.py

import re
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import func, desc, asc, or_, case
from app.extensions import db
from app.models import Folder, Link, LinkTag
from app.dashboard.serializers import serialize_link
from app.cache.redis_layer import cache as redis_cache
from app.cache import keys as K

logger = logging.getLogger(__name__)

ICON_MAP = {
    'work': ('briefcase', '#3B82F6'), 'personal': ('user', '#10B981'),
    'projects': ('folder-open', '#F59E0B'), 'research': ('academic-cap', '#8B5CF6'),
    'tools': ('wrench', '#EF4444'), 'design': ('color-swatch', '#EC4899'),
    'development': ('code', '#06B6D4'), 'reading': ('book-open', '#84CC16'),
    'news': ('newspaper', '#F97316'), 'social': ('users', '#8B5CF6'),
    'shopping': ('shopping-bag', '#06B6D4'), 'travel': ('globe', '#10B981'),
    'finance': ('currency-dollar', '#059669'), 'docs': ('document', '#6B7280'),
}


def _suggest_props(name: str) -> Tuple[str, str]:
    nl = name.lower()
    for kw, (icon, color) in ICON_MAP.items():
        if kw in nl:
            return icon, color
    return 'folder', '#6B7280'


def _next_position(user_id: str) -> int:
    r = db.session.query(func.max(Folder.position)).filter_by(
        user_id=user_id, soft_deleted=False
    ).scalar()
    return (r or 0) + 1


def _generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return (slug or 'folder')[:100]


def _unique_slug(user_id: str, base_slug: str, exclude_id: int = None) -> str:
    slug = base_slug
    counter = 1
    while True:
        query = Folder.query.filter_by(user_id=user_id, slug=slug, soft_deleted=False)
        if exclude_id:
            query = query.filter(Folder.id != exclude_id)
        if not query.first():
            return slug
        slug = f'{base_slug}-{counter}'
        counter += 1


def _ensure_slug(folder: Folder) -> str:
    if folder.slug:
        return folder.slug
    base = _generate_slug(folder.name)
    folder.slug = _unique_slug(folder.user_id, base, exclude_id=folder.id)
    return folder.slug


def ensure_slugs(user_id: str, folders: List[Folder]):
    updated = False
    for f in folders:
        if not f.slug:
            _ensure_slug(f)
            updated = True
    if updated:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

def _get_all_folder_counts(user_id: str) -> Dict[int, int]:
    """Single query returns link counts for every folder the user owns."""
    rows = (
        db.session.query(
            Link.folder_id,
            func.count(Link.id)
        )
        .filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,
            Link.archived_at.is_(None),
            Link.folder_id.isnot(None),
        )
        .group_by(Link.folder_id)
        .all()
    )
    return {folder_id: count for folder_id, count in rows}


def _get_folder_map(user_id: str) -> Dict[int, Folder]:
    """Load all user folders once."""
    folders = Folder.query.filter_by(
        user_id=user_id, soft_deleted=False
    ).all()
    ensure_slugs(user_id, folders)
    return {f.id: f for f in folders}


def _build_breadcrumb_fast(folder_map: Dict[int, Folder], folder_id: int) -> List[Dict[str, Any]]:
    crumbs = []
    current_id = folder_id
    visited = set()
    while current_id and current_id not in visited and current_id in folder_map:
        visited.add(current_id)
        f = folder_map[current_id]
        crumbs.insert(0, {
            'id': f.id,
            'name': f.name,
            'icon': f.icon,
            'slug': f.slug or _generate_slug(f.name),
        })
        current_id = f.parent_id
    return crumbs


def _get_folder_stats(user_id: str, folder_id: int) -> Dict[str, Any]:
    """Single query for all folder stats."""
    row = db.session.query(
        func.count(case((Link.archived_at.is_(None), Link.id))).label('link_count'),
        func.count(case((Link.archived_at.isnot(None), Link.id))).label('archived_count'),
        func.coalesce(func.sum(Link.click_count), 0).label('total_clicks'),
    ).filter(
        Link.folder_id == folder_id,
        Link.user_id == user_id,
        Link.soft_deleted == False,
    ).one()

    return {
        'link_count': row.link_count or 0,
        'archived_count': row.archived_count or 0,
        'total_clicks': int(row.total_clicks or 0),
    }


def serialize_folder(folder: Folder, counts: bool = False,
                     precomputed_counts: Dict[int, int] = None) -> Dict[str, Any]:
    data = {
        'id': folder.id,
        'name': folder.name,
        'slug': folder.slug or _generate_slug(folder.name),
        'color': folder.color,
        'icon': folder.icon,
        'position': folder.position,
        'parent_id': folder.parent_id,
        'pinned': folder.pinned,
        'created_at': folder.created_at.isoformat() if folder.created_at else None,
        'updated_at': folder.updated_at.isoformat() if folder.updated_at else None,
    }
    if counts:
        if precomputed_counts is not None:
            data['link_count'] = precomputed_counts.get(folder.id, 0)
        else:
            data['link_count'] = Link.query.filter_by(
                folder_id=folder.id, user_id=folder.user_id,
                soft_deleted=False, archived_at=None
            ).count()
    return data


def _serialize_many(folders: List[Folder], user_id: str,
                    counts: bool = True) -> List[Dict[str, Any]]:
    """Serialize multiple folders with batch counts (1 query total)."""
    if not counts:
        return [serialize_folder(f, counts=False) for f in folders]

    count_map = _get_all_folder_counts(user_id)
    return [serialize_folder(f, counts=True, precomputed_counts=count_map)
            for f in folders]



#  OPTIMIZED get_folder_detail — 3 queries total


def get_folder_detail(user_id: str, folder_id: int) -> Optional[Dict[str, Any]]:
    # Query 1: All user folders
    folder_map = _get_folder_map(user_id)

    folder = folder_map.get(folder_id)
    if not folder:
        return None

    # Children from map
    children = [
        f for f in folder_map.values()
        if f.parent_id == folder_id
    ]
    children.sort(key=lambda f: (f.position or 0, f.created_at or datetime.min))

    # Parent from map
    parent = None
    if folder.parent_id and folder.parent_id in folder_map:
        p = folder_map[folder.parent_id]
        parent = {
            'id': p.id, 'name': p.name, 'icon': p.icon,
            'color': p.color, 'slug': p.slug,
        }

    # Query 2: Batch counts for all folders
    count_map = _get_all_folder_counts(user_id)

    # Query 3: Stats for this folder
    stats = _get_folder_stats(user_id, folder_id)
    stats['subfolder_count'] = len(children)

    # Breadcrumb from map
    breadcrumb = _build_breadcrumb_fast(folder_map, folder_id)

    return {
        'folder': serialize_folder(folder, counts=False),
        'children': [serialize_folder(c, counts=True, precomputed_counts=count_map)
                     for c in children],
        'parent': parent,
        'stats': stats,
        'breadcrumb': breadcrumb,
    }


def get_folder_full(user_id: str, slug: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    folder = Folder.query.filter_by(
        slug=slug, user_id=user_id, soft_deleted=False
    ).first()
    if not folder:
        return None

    detail = get_folder_detail(user_id, folder.id)
    if not detail:
        return None

    links_data = _get_links_for_folder(user_id, folder.id, params)

    return {
        **detail,
        'links': links_data['links'],
        'links_meta': links_data['meta'],
    }


def _get_links_for_folder(user_id: str, folder_id: int,
                          params: Dict[str, Any]) -> Dict[str, Any]:
    query = Link.query.filter(
        Link.user_id == user_id,
        Link.folder_id == folder_id,
        Link.soft_deleted == False,
        Link.archived_at.is_(None),
    )

    search = params.get('search', '').strip()
    if search:
        pattern = f'%{search}%'
        query = query.filter(or_(
            Link.title.ilike(pattern),
            Link.original_url.ilike(pattern),
            Link.notes.ilike(pattern),
        ))

    sort_field = params.get('sort', 'created_at')
    sort_order = params.get('order', 'desc')
    sort_col = {
        'created_at': Link.created_at,
        'updated_at': Link.updated_at,
        'title': Link.title,
        'click_count': Link.click_count,
    }.get(sort_field, Link.created_at)

    order_fn = desc if sort_order == 'desc' else asc
    query = query.order_by(desc(Link.pinned), order_fn(sort_col))

    limit = params.get('limit', 30)
    offset = 0
    cursor = params.get('cursor')
    if cursor:
        try:
            offset = max(0, int(cursor))
        except (ValueError, TypeError):
            pass

    total = None
    if not cursor:
        total = query.count()

    items = query.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]

    return {
        'links': [serialize_link(l) for l in items],
        'meta': {
            'total': total,
            'has_more': has_more,
            'next_cursor': str(offset + limit) if has_more else None,
        },
    }



#  EXISTING — now using batch counts


def create_folder(user_id: str, data: Dict[str, Any]) -> Tuple[Optional[Folder], Optional[str]]:
    name = data.get('name', '').strip()
    if not name or len(name) > 255:
        return None, 'Invalid folder name'
    parent_id = data.get('parent_id')
    if parent_id and not Folder.query.filter_by(
        id=parent_id, user_id=user_id, soft_deleted=False
    ).first():
        return None, 'Parent folder not found'
    if Folder.query.filter_by(
        user_id=user_id, name=name, soft_deleted=False, parent_id=parent_id
    ).first():
        return None, 'Folder already exists'
    icon, color = _suggest_props(name)
    base_slug = _generate_slug(name)
    slug = _unique_slug(user_id, base_slug)
    folder = Folder(
        user_id=user_id, parent_id=parent_id, name=name, slug=slug,
        color=data.get('color') or color, icon=data.get('icon') or icon,
        position=_next_position(user_id), pinned=data.get('pinned', False),
    )
    db.session.add(folder)
    db.session.commit()
    return folder, None


def get_user_folders(user_id: str) -> List[Folder]:
    folders = Folder.query.filter_by(
        user_id=user_id, soft_deleted=False
    ).order_by(Folder.position, Folder.created_at).all()
    ensure_slugs(user_id, folders)
    return folders


def get_folder_by_slug(user_id: str, slug: str) -> Optional[Dict[str, Any]]:
    folder = Folder.query.filter_by(
        slug=slug, user_id=user_id, soft_deleted=False
    ).first()
    if not folder:
        return None
    return get_folder_detail(user_id, folder.id)


def get_folder_links_by_slug(user_id: str, slug: str,
                             params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    folder = Folder.query.filter_by(
        slug=slug, user_id=user_id, soft_deleted=False
    ).first()
    if not folder:
        return None
    return get_folder_links(user_id, folder.id, params)


def get_folder_links(user_id: str, folder_id: int,
                     params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    folder = Folder.query.filter_by(
        id=folder_id, user_id=user_id, soft_deleted=False
    ).first()
    if not folder:
        return None
    return _get_links_for_folder(user_id, folder_id, params)


def update_folder(user_id: str, folder_id: int,
                  data: Dict[str, Any]) -> Optional[Folder]:
    folder = Folder.query.filter_by(
        id=folder_id, user_id=user_id, soft_deleted=False
    ).first()
    if not folder:
        return None
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return None
        if Folder.query.filter(
            Folder.user_id == user_id, Folder.name == name,
            Folder.id != folder_id, Folder.soft_deleted == False
        ).first():
            return None
        folder.name = name
        base_slug = _generate_slug(name)
        folder.slug = _unique_slug(user_id, base_slug, exclude_id=folder_id)
    for field in ('color', 'icon', 'position', 'pinned'):
        if field in data:
            setattr(folder, field,
                    bool(data[field]) if field == 'pinned' else data[field])
    folder.updated_at = datetime.utcnow()
    db.session.commit()
    return folder


def soft_delete_folder(user_id: str, folder_id: int) -> bool:
    folder = Folder.query.filter_by(
        id=folder_id, user_id=user_id, soft_deleted=False
    ).first()
    if not folder:
        return False
    Folder.query.filter_by(
        parent_id=folder_id, user_id=user_id, soft_deleted=False
    ).update({'parent_id': folder.parent_id})
    Link.query.filter_by(
        folder_id=folder_id, user_id=user_id
    ).update({'folder_id': None})
    folder.soft_deleted = True
    db.session.commit()
    return True


def toggle_folder_pin(user_id: str, folder_id: int) -> Optional[bool]:
    folder = Folder.query.filter_by(
        id=folder_id, user_id=user_id, soft_deleted=False
    ).first()
    if not folder:
        return None
    folder.pinned = not folder.pinned
    db.session.commit()
    return folder.pinned


def move_folder(user_id: str, folder_id: int,
                new_parent_id: Optional[int]) -> bool:
    folder = Folder.query.filter_by(
        id=folder_id, user_id=user_id, soft_deleted=False
    ).first()
    if not folder:
        return False
    if new_parent_id:
        if not Folder.query.filter_by(
            id=new_parent_id, user_id=user_id, soft_deleted=False
        ).first():
            return False
        current = new_parent_id
        while current:
            if current == folder_id:
                return False
            p = Folder.query.filter_by(
                id=current, user_id=user_id, soft_deleted=False
            ).first()
            current = p.parent_id if p else None
    folder.parent_id = new_parent_id
    db.session.commit()
    return True


def get_folder_tree(user_id: str) -> List[Dict[str, Any]]:
    folders = get_user_folders(user_id)
    count_map = _get_all_folder_counts(user_id)

    fmap = {}
    for f in folders:
        fmap[f.id] = serialize_folder(f, counts=True,
                                      precomputed_counts=count_map)
        fmap[f.id]['children'] = []
    roots = []
    for f in folders:
        node = fmap[f.id]
        if f.parent_id and f.parent_id in fmap:
            fmap[f.parent_id]['children'].append(node)
        else:
            roots.append(node)
    return roots


def get_root_items(user_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
    search = params.get('search', '').strip()
    sort_field = params.get('sort', 'created_at')
    sort_order = params.get('order', 'desc')
    limit = params.get('limit', 30)
    type_filter = params.get('type_filter', '').strip()
    tag_ids_raw = params.get('tag_ids', '').strip()
    order_fn = desc if sort_order == 'desc' else asc

    folder_query = Folder.query.filter_by(
        user_id=user_id, parent_id=None, soft_deleted=False
    )
    if search:
        folder_query = folder_query.filter(Folder.name.ilike(f'%{search}%'))

    folder_sort = {
        'name': Folder.name, 'title': Folder.name,
        'created_at': Folder.created_at, 'updated_at': Folder.updated_at,
    }.get(sort_field, Folder.created_at)
    root_folders = folder_query.order_by(
        desc(Folder.pinned), order_fn(folder_sort)
    ).all()
    ensure_slugs(user_id, root_folders)

    # Batch counts — 1 query for all folders
    count_map = _get_all_folder_counts(user_id)

    link_query = Link.query.filter(
        Link.user_id == user_id, Link.folder_id.is_(None),
        Link.soft_deleted == False, Link.archived_at.is_(None),
    )
    if search:
        pat = f'%{search}%'
        link_query = link_query.filter(or_(
            Link.title.ilike(pat), Link.original_url.ilike(pat),
            Link.notes.ilike(pat),
        ))
    if type_filter and type_filter in ('saved', 'shortened'):
        link_query = link_query.filter(Link.link_type == type_filter)
    if tag_ids_raw:
        try:
            ids = [int(x) for x in tag_ids_raw.split(',') if x.strip()]
            if ids:
                sub = db.session.query(LinkTag.link_id).filter(
                    LinkTag.tag_id.in_(ids)
                ).distinct().subquery()
                link_query = link_query.filter(
                    Link.id.in_(db.session.query(sub))
                )
        except ValueError:
            pass

    link_sort = {
        'created_at': Link.created_at, 'updated_at': Link.updated_at,
        'title': Link.title, 'name': Link.title,
        'click_count': Link.click_count,
    }.get(sort_field, Link.created_at)
    link_query = link_query.order_by(desc(Link.pinned), order_fn(link_sort))

    offset = 0
    cursor = params.get('cursor')
    if cursor:
        try:
            offset = max(0, int(cursor))
        except (ValueError, TypeError):
            pass

    total_links = link_query.count()
    items = link_query.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]

    all_folders = Folder.query.filter_by(
        user_id=user_id, soft_deleted=False
    ).count()
    all_links = Link.query.filter(
        Link.user_id == user_id, Link.soft_deleted == False,
        Link.archived_at.is_(None)
    ).count()

    return {
        'folders': [serialize_folder(f, counts=True,
                                     precomputed_counts=count_map)
                    for f in root_folders],
        'links': [serialize_link(l) for l in items],
        'meta': {
            'total': total_links,
            'has_more': has_more,
            'next_cursor': str(offset + limit) if has_more else None,
        },
        'stats': {
            'total_folders': all_folders,
            'total_links': all_links,
            'root_folders': len(root_folders),
            'unassigned_links': total_links,
        },
    }