# server/app/dashboard/service.py
# Production link serialization — lean, efficient, no over-engineering

from datetime import datetime
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
from app.models import Link
import os
import logging

logger = logging.getLogger(__name__)


# ─── Inline Utilities (zero external dependencies) ───────────────────

def _extract_domain(url: str) -> str:
    """Extract clean domain from URL."""
    try:
        host = urlparse(url).hostname or ''
        return host.removeprefix('www.')
    except Exception:
        return ''


def _display_url(url: str) -> str:
    """Human-readable URL (no protocol, no trailing slash)."""
    try:
        p = urlparse(url)
        host = (p.hostname or '').removeprefix('www.')
        path = p.path.rstrip('/')
        return f"{host}{path}" if path and path != '/' else host
    except Exception:
        return url


def _favicon_url(url: str) -> Optional[str]:
    """Google Favicon API URL."""
    domain = _extract_domain(url)
    return f'https://www.google.com/s2/favicons?domain={domain}&sz=32' if domain else None


def _short_link_base() -> str:
    """Base URL for short links."""
    api_url = os.environ.get('API_URL') or os.environ.get('RENDER_EXTERNAL_URL', '')
    return f'{api_url}/r' if api_url else '/r'


def _iso(dt: Optional[datetime]) -> Optional[str]:
    """ISO format or None."""
    return dt.isoformat() if dt else None


def _relative_time(dt: Optional[datetime]) -> Optional[str]:
    """Human-readable relative time."""
    if not dt:
        return None
    seconds = (datetime.utcnow() - dt).total_seconds()
    if seconds < 0:
        return 'Just now'
    if seconds < 60:
        return 'Just now'
    minutes = int(seconds / 60)
    if minutes < 60:
        return f'{minutes}m ago'
    hours = int(minutes / 60)
    if hours < 24:
        return f'{hours}h ago'
    days = int(hours / 24)
    if days == 1:
        return 'Yesterday'
    if days < 7:
        return f'{days}d ago'
    weeks = int(days / 7)
    if weeks < 5:
        return f'{weeks}w ago'
    months = int(days / 30)
    if months < 12:
        return f'{months}mo ago'
    years = int(days / 365)
    return f'{years}y ago'


def _safe_bool(obj, attr: str, default: bool = False) -> bool:
    """Safely read a boolean attribute (handles missing columns)."""
    try:
        return bool(getattr(obj, attr, default))
    except Exception:
        return default


# ─── Serialization ────────────────────────────────────────────────────

def serialize_link(
    link: Link,
    include_preview: bool = True,
    include_short_data: bool = True,
) -> Dict[str, Any]:
    """
    Serialize a Link model to a clean API dict.
    
    Designed for:
    - Dashboard link cards
    - Search results
    - Quick access items
    """
    data = {
        # Core
        'id': link.id,
        'title': link.title or _display_url(link.original_url),
        'original_url': link.original_url,
        'display_url': _display_url(link.original_url),
        'link_type': link.link_type,
        'is_active': link.is_active,

        # Timestamps
        'created_at': _iso(link.created_at),
        'updated_at': _iso(link.updated_at),
        'relative_time': _relative_time(link.created_at),

        # Status flags
        'pinned': link.pinned,
        'pinned_at': _iso(link.pinned_at),
        'starred': _safe_bool(link, 'starred'),
        'frequently_used': _safe_bool(link, 'frequently_used'),
        'archived': link.archived_at is not None,
        'archived_at': _iso(link.archived_at),

        # Folder
        'folder_id': link.folder_id,
        'folder': _serialize_folder_ref(link),

        # Tags (uses model's selectin-loaded relationship)
        'tags': _serialize_tags(link),

        # Notes
        'notes': link.notes,
        'has_notes': bool(link.notes),
    }

    # Short link specific fields
    if include_short_data and link.link_type == 'shortened':
        data.update(_serialize_short_link(link))

    # Preview / metadata
    if include_preview:
        data['preview'] = _build_preview(link)

    return data


def serialize_links(
    links: List[Link],
    include_preview: bool = True,
) -> List[Dict[str, Any]]:
    """Batch-serialize links. Eager-loaded relationships prevent N+1."""
    return [serialize_link(link, include_preview=include_preview) for link in links]


def serialize_link_minimal(link: Link) -> Dict[str, Any]:
    """Minimal serialization for search results / autocomplete."""
    return {
        'id': link.id,
        'title': link.title or _display_url(link.original_url),
        'display_url': _display_url(link.original_url),
        'link_type': link.link_type,
        'domain': _extract_domain(link.original_url),
        'favicon': _favicon_url(link.original_url),
        'pinned': link.pinned,
        'starred': _safe_bool(link, 'starred'),
        'relative_time': _relative_time(link.created_at),
    }


# ─── Sub-serializers ─────────────────────────────────────────────────

def _serialize_folder_ref(link: Link) -> Optional[Dict[str, Any]]:
    """Serialize the folder reference on a link (if any)."""
    if not link.folder_id:
        return None
    try:
        f = link.folder
        if f:
            return {
                'id': f.id,
                'name': f.name,
                'color': f.color,
                'icon': getattr(f, 'icon', None),
            }
    except Exception:
        pass
    return None


def _serialize_tags(link: Link) -> List[Dict[str, Any]]:
    """Serialize tags from the eager-loaded relationship."""
    try:
        return [
            {'id': t.id, 'name': t.name, 'color': t.color}
            for t in (link.tags or [])
        ]
    except Exception:
        return []


def _serialize_short_link(link: Link) -> Dict[str, Any]:
    """Short-link-specific fields."""
    base = _short_link_base()
    now = datetime.utcnow()
    meta = link.metadata_ or {}

    data = {
        'slug': link.slug,
        'short_url': f'{base}/{link.slug}' if link.slug else None,
        'click_count': link.click_count or 0,
        'expires_at': _iso(link.expires_at),
        'is_expired': bool(link.expires_at and now > link.expires_at),
        'is_password_protected': bool(getattr(link, 'password_hash', None)),
    }

    # Click limit from metadata
    click_limit = meta.get('click_limit')
    if click_limit:
        clicks = link.click_count or 0
        data['click_limit'] = click_limit
        data['clicks_remaining'] = max(0, click_limit - clicks)
        data['click_limit_reached'] = clicks >= click_limit

    # Daily click rate
    if link.created_at and (link.click_count or 0) > 0:
        days = max(1, (now - link.created_at).days)
        data['daily_click_rate'] = round(link.click_count / days, 2)

    return data


def _build_preview(link: Link) -> Dict[str, Any]:
    """Build preview data from URL + extracted metadata."""
    domain = _extract_domain(link.original_url)
    page_meta = (link.metadata_ or {}).get('page_metadata', {})

    preview = {
        'domain': domain,
        'favicon': page_meta.get('favicon') or _favicon_url(link.original_url),
        'image': page_meta.get('image'),
        'site_name': page_meta.get('site_name'),
        'description': page_meta.get('description'),
    }

    # Enrich with available metadata (only if present)
    if page_meta.get('author'):
        preview['author'] = page_meta['author']
    if page_meta.get('theme_color'):
        preview['theme_color'] = page_meta['theme_color']
    if page_meta.get('type') and page_meta['type'] != 'website':
        preview['content_type'] = page_meta['type']

    return preview