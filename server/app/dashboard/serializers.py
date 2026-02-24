# server/app/dashboard/serializers.py
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.models import Link
from app.utils.url import extract_domain, extract_display_url, build_favicon_url
from app.utils.time import relative_time


def _short_base() -> str:
    api = os.environ.get('API_URL') or os.environ.get('RENDER_EXTERNAL_URL', '')
    return f'{api}/r' if api else '/r'


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _safe_bool(obj, attr, default=False):
    try:
        return bool(getattr(obj, attr, default))
    except Exception:
        return default


def serialize_link(link: Link) -> Dict[str, Any]:
    domain = extract_domain(link.original_url)
    page_meta = (link.metadata_ or {}).get('page_metadata', {})
    now = datetime.utcnow()

    data = {
        'id': link.id,
        'title': link.title or extract_display_url(link.original_url),
        'original_url': link.original_url,
        'display_url': extract_display_url(link.original_url),
        'link_type': link.link_type,
        'is_active': link.is_active,
        'created_at': _iso(link.created_at),
        'updated_at': _iso(link.updated_at),
        'relative_time': relative_time(link.created_at),
        'pinned': link.pinned,
        'pinned_at': _iso(link.pinned_at),
        'starred': _safe_bool(link, 'starred'),
        'frequently_used': _safe_bool(link, 'frequently_used'),
        'archived': link.archived_at is not None,
        'archived_at': _iso(link.archived_at),
        'folder_id': link.folder_id,
        'folder': _folder_ref(link),
        'tags': [{'id': t.id, 'name': t.name, 'color': t.color} for t in (link.tags or [])],
        'notes': link.notes,
        'has_notes': bool(link.notes),
        'preview': {
            'domain': domain,
            'favicon': page_meta.get('favicon') or build_favicon_url(link.original_url),
            'image': page_meta.get('image'),
            'site_name': page_meta.get('site_name'),
            'description': page_meta.get('description'),
        },
    }

    if link.link_type == 'shortened':
        base = _short_base()
        meta = link.metadata_ or {}
        click_limit = meta.get('click_limit')
        data.update({
            'slug': link.slug,
            'short_url': f'{base}/{link.slug}' if link.slug else None,
            'click_count': link.click_count or 0,
            'expires_at': _iso(link.expires_at),
            'is_expired': bool(link.expires_at and now > link.expires_at),
            'is_password_protected': bool(getattr(link, 'password_hash', None)),
        })
        if click_limit:
            clicks = link.click_count or 0
            data['click_limit'] = click_limit
            data['clicks_remaining'] = max(0, click_limit - clicks)

    return data


def serialize_links(links: List[Link]) -> List[Dict[str, Any]]:
    return [serialize_link(l) for l in links]


def _folder_ref(link: Link) -> Optional[Dict[str, Any]]:
    if not link.folder_id:
        return None
    try:
        f = link.folder
        return {'id': f.id, 'name': f.name, 'color': f.color, 'icon': getattr(f, 'icon', None)} if f else None
    except Exception:
        return None