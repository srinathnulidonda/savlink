# server/app/folders/service.py
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import func, desc, asc, or_
from app.extensions import db
from app.models import Folder, Link
from app.dashboard.serializers import serialize_link

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
    r = db.session.query(func.max(Folder.position)).filter_by(user_id=user_id, soft_deleted=False).scalar()
    return (r or 0) + 1


def create_folder(user_id: str, data: Dict[str, Any]) -> Tuple[Optional[Folder], Optional[str]]:
    name = data.get('name', '').strip()
    if not name or len(name) > 255:
        return None, 'Invalid folder name'
    parent_id = data.get('parent_id')
    if parent_id and not Folder.query.filter_by(id=parent_id, user_id=user_id, soft_deleted=False).first():
        return None, 'Parent folder not found'
    if Folder.query.filter_by(user_id=user_id, name=name, soft_deleted=False, parent_id=parent_id).first():
        return None, 'Folder already exists'
    icon, color = _suggest_props(name)
    folder = Folder(user_id=user_id, parent_id=parent_id, name=name,
                    color=data.get('color') or color, icon=data.get('icon') or icon,
                    position=_next_position(user_id), pinned=data.get('pinned', False))
    db.session.add(folder)
    db.session.commit()
    return folder, None


def get_user_folders(user_id: str) -> List[Folder]:
    return Folder.query.filter_by(user_id=user_id, soft_deleted=False).order_by(Folder.position, Folder.created_at).all()


def get_folder_detail(user_id: str, folder_id: int) -> Optional[Dict[str, Any]]:
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first()
    if not folder:
        return None

    children = Folder.query.filter_by(
        parent_id=folder_id, user_id=user_id, soft_deleted=False
    ).order_by(Folder.position, Folder.created_at).all()

    parent = None
    if folder.parent_id:
        p = Folder.query.filter_by(id=folder.parent_id, user_id=user_id, soft_deleted=False).first()
        if p:
            parent = {'id': p.id, 'name': p.name, 'icon': p.icon, 'color': p.color}

    link_count = Link.query.filter_by(
        folder_id=folder_id, user_id=user_id, soft_deleted=False, archived_at=None
    ).count()
    archived_count = Link.query.filter_by(
        folder_id=folder_id, user_id=user_id, soft_deleted=False
    ).filter(Link.archived_at.isnot(None)).count()
    total_clicks = db.session.query(func.coalesce(func.sum(Link.click_count), 0)).filter(
        Link.folder_id == folder_id, Link.user_id == user_id, Link.soft_deleted == False
    ).scalar()

    return {
        'folder': serialize_folder(folder, counts=False),
        'children': [serialize_folder(c, counts=True) for c in children],
        'parent': parent,
        'stats': {
            'link_count': link_count,
            'archived_count': archived_count,
            'total_clicks': int(total_clicks or 0),
            'subfolder_count': len(children),
        },
        'breadcrumb': _build_breadcrumb(user_id, folder),
    }


def _build_breadcrumb(user_id: str, folder: Folder) -> List[Dict[str, Any]]:
    crumbs = []
    current = folder
    visited = set()
    while current and current.id not in visited:
        visited.add(current.id)
        crumbs.insert(0, {'id': current.id, 'name': current.name, 'icon': current.icon})
        if current.parent_id:
            current = Folder.query.filter_by(
                id=current.parent_id, user_id=user_id, soft_deleted=False
            ).first()
        else:
            break
    return crumbs


def get_folder_links(user_id: str, folder_id: int, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first()
    if not folder:
        return None

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

    items = query.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]

    return {
        'links': [serialize_link(l) for l in items],
        'meta': {
            'total': query.count() if not cursor else None,
            'has_more': has_more,
            'next_cursor': str(offset + limit) if has_more else None,
        },
    }


def update_folder(user_id: str, folder_id: int, data: Dict[str, Any]) -> Optional[Folder]:
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first()
    if not folder:
        return None
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return None
        if Folder.query.filter(Folder.user_id == user_id, Folder.name == name,
                               Folder.id != folder_id, Folder.soft_deleted == False).first():
            return None
        folder.name = name
    for field in ('color', 'icon', 'position', 'pinned'):
        if field in data:
            setattr(folder, field, bool(data[field]) if field == 'pinned' else data[field])
    folder.updated_at = datetime.utcnow()
    db.session.commit()
    return folder


def soft_delete_folder(user_id: str, folder_id: int) -> bool:
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first()
    if not folder:
        return False
    Folder.query.filter_by(parent_id=folder_id, user_id=user_id, soft_deleted=False).update({'parent_id': folder.parent_id})
    Link.query.filter_by(folder_id=folder_id, user_id=user_id).update({'folder_id': None})
    folder.soft_deleted = True
    db.session.commit()
    return True


def toggle_folder_pin(user_id: str, folder_id: int) -> Optional[bool]:
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first()
    if not folder:
        return None
    folder.pinned = not folder.pinned
    db.session.commit()
    return folder.pinned


def move_folder(user_id: str, folder_id: int, new_parent_id: Optional[int]) -> bool:
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first()
    if not folder:
        return False
    if new_parent_id:
        if not Folder.query.filter_by(id=new_parent_id, user_id=user_id, soft_deleted=False).first():
            return False
        current = new_parent_id
        while current:
            if current == folder_id:
                return False
            p = Folder.query.filter_by(id=current, user_id=user_id, soft_deleted=False).first()
            current = p.parent_id if p else None
    folder.parent_id = new_parent_id
    db.session.commit()
    return True


def get_folder_tree(user_id: str) -> List[Dict[str, Any]]:
    folders = get_user_folders(user_id)
    fmap = {}
    for f in folders:
        fmap[f.id] = serialize_folder(f, counts=True)
        fmap[f.id]['children'] = []
    roots = []
    for f in folders:
        node = fmap[f.id]
        if f.parent_id and f.parent_id in fmap:
            fmap[f.parent_id]['children'].append(node)
        else:
            roots.append(node)
    return roots


def serialize_folder(folder: Folder, counts: bool = False) -> Dict[str, Any]:
    data = {
        'id': folder.id, 'name': folder.name, 'color': folder.color,
        'icon': folder.icon, 'position': folder.position, 'parent_id': folder.parent_id,
        'pinned': folder.pinned,
        'created_at': folder.created_at.isoformat() if folder.created_at else None,
        'updated_at': folder.updated_at.isoformat() if folder.updated_at else None,
    }
    if counts:
        data['link_count'] = Link.query.filter_by(
            folder_id=folder.id, user_id=folder.user_id, soft_deleted=False, archived_at=None).count()
    return data