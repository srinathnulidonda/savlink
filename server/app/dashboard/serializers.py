# server/app/dashboard/serializers.py
from app.utils.url import extract_domain, get_short_link_url, build_favicon_url
from app.utils.time import relative_time


def serialize_link(link):
    meta = link.metadata_ or {}
    page = meta.get('page_metadata', {})
    domain = page.get('domain') or extract_domain(link.original_url)
    favicon = page.get('favicon') or build_favicon_url(link.original_url)

    return {
        'id': link.id,
        'original_url': link.original_url,
        'title': link.title or page.get('title') or domain,
        'notes': link.notes,
        'notes_preview': _preview(link.notes, 120),
        'description': page.get('description'),
        'link_type': link.link_type,
        'slug': link.slug,
        'short_url': get_short_link_url(link.slug) if link.slug else None,
        'domain': domain,
        'favicon': favicon,
        'favicons': page.get('favicons', []),
        'image': page.get('image'),
        'site_name': page.get('site_name'),
        'is_active': link.is_active,
        'pinned': link.pinned,
        'starred': link.starred,
        'frequently_used': link.frequently_used,
        'archived': link.archived_at is not None,
        'archived_at': _iso(link.archived_at),
        'expires_at': _iso(link.expires_at),
        'created_at': _iso(link.created_at),
        'updated_at': _iso(link.updated_at),
        'relative_time': relative_time(link.created_at),
        'click_count': link.click_count or 0,
        'folder_id': link.folder_id,
        'folder_name': link.folder.name if link.folder else None,
        'tags': [t.name for t in (link.tags or [])],
        'is_public': not bool(link.password_hash),
        'password_protected': bool(link.password_hash),
        'content_type': page.get('content_type'),
        'reading_time': page.get('reading_time_minutes'),
        'word_count': page.get('word_count'),
        'author': page.get('author'),
        'published_at': page.get('published_at'),
    }


def serialize_link_minimal(link):
    meta = link.metadata_ or {}
    page = meta.get('page_metadata', {})
    domain = page.get('domain') or extract_domain(link.original_url)

    return {
        'id': link.id,
        'original_url': link.original_url,
        'title': link.title or page.get('title') or domain,
        'domain': domain,
        'favicon': page.get('favicon') or build_favicon_url(link.original_url),
        'link_type': link.link_type,
        'slug': link.slug,
        'short_url': get_short_link_url(link.slug) if link.slug else None,
        'pinned': link.pinned,
        'starred': link.starred,
        'click_count': link.click_count or 0,
        'created_at': _iso(link.created_at),
        'relative_time': relative_time(link.created_at),
        'tags': [t.name for t in (link.tags or [])],
    }


def _iso(dt):
    return dt.isoformat() if dt else None


def _preview(text, max_len=120):
    if not text:
        return None
    if len(text) <= max_len:
        return text
    return text[:max_len].rsplit(' ', 1)[0] + '…'