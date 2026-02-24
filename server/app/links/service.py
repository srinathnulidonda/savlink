# server/app/links/service.py
import re
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from app.extensions import db
from app.models import Link, Folder, Tag, LinkTag
from app.utils.slug import generate_unique_slug, is_slug_available
from app.utils.crypto import hash_password
from app.cache.invalidation import on_link_change, on_tag_change

logger = logging.getLogger(__name__)

URL_RE = re.compile(
    r'^https?://'
    r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|localhost|\d{1,3}(?:\.\d{1,3}){3})'
    r'(?::\d+)?(?:/?|[/?]\S+)$', re.IGNORECASE)

EXPIRY_RE = re.compile(r'^(\d+)([hdwmy])$')


def _get_link(link_id: int, user_id: str) -> Optional[Link]:
    return Link.query.filter_by(id=link_id, user_id=user_id, soft_deleted=False).first()


def _validate_url(url: str) -> bool:
    return bool(URL_RE.match(url))


def _parse_expiration(raw: str) -> Tuple[Optional[datetime], Optional[str]]:
    if 'T' in raw or 'Z' in raw:
        try:
            return datetime.fromisoformat(raw.replace('Z', '+00:00')), None
        except ValueError:
            return None, 'Invalid ISO date'
    m = EXPIRY_RE.match(raw.lower())
    if not m:
        return None, 'Invalid format — use e.g. 7d, 24h, 1w'
    n, u = int(m.group(1)), m.group(2)
    deltas = {
        'h': timedelta(hours=n), 'd': timedelta(days=n), 'w': timedelta(weeks=n),
        'm': timedelta(days=n * 30), 'y': timedelta(days=n * 365),
    }
    return datetime.utcnow() + deltas[u], None


def _append_utm(url: str, params: Dict[str, str]) -> str:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    mapping = {
        'source': 'utm_source', 'medium': 'utm_medium', 'campaign': 'utm_campaign',
        'term': 'utm_term', 'content': 'utm_content',
    }
    for k, utm_k in mapping.items():
        if params.get(k):
            qs[utm_k] = [params[k]]
    return urlunparse(parsed._replace(query=urlencode(qs, doseq=True)))


def _log(user_id, action, entity_type, entity_id=None, **details):
    try:
        from app.activity.service import log_activity
        log_activity(user_id, action, entity_type, entity_id, details or None)
    except Exception:
        pass


# ── Duplicate detection ──────────────────────────────────────────────

def check_duplicate(user_id: str, url: str) -> Optional[Dict]:
    normalized = url.strip().rstrip('/')
    existing = Link.query.filter(
        Link.user_id == user_id, Link.soft_deleted == False,
        (Link.original_url == normalized) |
        (Link.original_url == normalized + '/') |
        (Link.original_url == url)
    ).first()
    if not existing:
        return None
    return {
        'exists': True,
        'existing_link_id': existing.id,
        'existing_title': existing.title,
        'is_archived': existing.archived_at is not None,
    }


# ── Read ─────────────────────────────────────────────────────────────

def get_link_detail(user_id: str, link_id: int) -> Optional[Link]:
    return _get_link(link_id, user_id)


# ── Create ───────────────────────────────────────────────────────────

def create_link(user_id: str, data: Dict[str, Any]) -> Tuple[Optional[Link], Optional[Dict]]:
    url = data.get('original_url', '').strip()
    if not url:
        return None, {'error': 'original_url is required'}
    if not _validate_url(url):
        return None, {'error': 'Invalid URL format'}

    link_type = data.get('link_type', 'saved')
    if link_type not in ('saved', 'shortened'):
        return None, {'error': 'link_type must be saved or shortened'}

    dup = check_duplicate(user_id, url)

    slug = None
    if link_type == 'shortened':
        slug = data.get('slug', '').strip().lower() or None
        if slug:
            if not is_slug_available(slug):
                return None, {'error': 'Slug already taken'}
        else:
            slug = generate_unique_slug()

    folder_id = data.get('folder_id')
    if folder_id is not None:
        if not Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first():
            return None, {'error': 'Folder not found'}

    expires_at = None
    if link_type == 'shortened' and data.get('expires_at'):
        expires_at, err = _parse_expiration(data['expires_at'])
        if err:
            return None, {'error': err}

    meta = data.get('metadata', {})
    if link_type == 'shortened' and data.get('utm_params'):
        url = _append_utm(url, data['utm_params'])
        meta['utm_params'] = data['utm_params']

    pw_hash = None
    if link_type == 'shortened' and data.get('password'):
        pw_hash = hash_password(data['password'])
        meta['password_protected'] = True

    if data.get('click_limit'):
        meta['click_limit'] = data['click_limit']

    link = Link(
        user_id=user_id, folder_id=folder_id, original_url=url, link_type=link_type,
        slug=slug, title=data.get('title', '').strip() or None,
        notes=data.get('notes', '').strip() or None, expires_at=expires_at,
        is_active=True, pinned=data.get('pinned', False), starred=data.get('starred', False),
        frequently_used=data.get('frequently_used', False),
        soft_deleted=False, metadata_=meta, password_hash=pw_hash,
    )
    db.session.add(link)
    db.session.flush()

    tag_ids = data.get('tag_ids', [])
    if tag_ids:
        _add_tags(user_id, link.id, tag_ids)

    db.session.commit()
    on_link_change(user_id)
    _log(user_id, 'link.created', 'link', link.id, title=link.title, link_type=link_type)

    extra = {'duplicate_warning': dup} if dup else None
    return link, extra


# ── Update ───────────────────────────────────────────────────────────

def update_link(user_id: str, link_id: int, data: Dict[str, Any]) -> Tuple[Optional[Link], Optional[str]]:
    link = _get_link(link_id, user_id)
    if not link:
        return None, 'Link not found'

    changes = []

    if 'title' in data:
        old = link.title
        link.title = data['title'].strip() if data['title'] else None
        if link.title != old:
            changes.append('title')

    if 'notes' in data:
        link.notes = data['notes'].strip() if data['notes'] else None
        changes.append('notes')

    if 'original_url' in data:
        url = data['original_url'].strip()
        if not url or not _validate_url(url):
            return None, 'Invalid URL'
        link.original_url = url
        changes.append('url')

    if 'pinned' in data:
        link.pinned = bool(data['pinned'])
        link.pinned_at = datetime.utcnow() if link.pinned else None
        changes.append('pinned')

    if 'starred' in data:
        link.starred = bool(data['starred'])
        changes.append('starred')

    if 'frequently_used' in data:
        link.frequently_used = bool(data['frequently_used'])
        changes.append('frequently_used')

    if link.link_type == 'shortened':
        if 'slug' in data:
            new_slug = data['slug'].strip().lower()
            if new_slug != link.slug and not is_slug_available(new_slug):
                return None, 'Slug already taken'
            link.slug = new_slug
            changes.append('slug')
        if 'expires_at' in data:
            if data['expires_at']:
                exp, err = _parse_expiration(data['expires_at'])
                if err:
                    return None, err
                link.expires_at = exp
            else:
                link.expires_at = None
            changes.append('expires_at')
        if 'password' in data:
            if data['password']:
                link.password_hash = hash_password(data['password'])
                meta = link.metadata_ or {}
                meta['password_protected'] = True
                link.metadata_ = meta
            else:
                link.password_hash = None
                meta = link.metadata_ or {}
                meta.pop('password_protected', None)
                link.metadata_ = meta
            changes.append('password')

    if 'folder_id' in data:
        fid = data['folder_id']
        if fid is not None and not Folder.query.filter_by(id=fid, user_id=user_id, soft_deleted=False).first():
            return None, 'Folder not found'
        link.folder_id = fid
        changes.append('folder')

    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    if changes:
        _log(user_id, 'link.updated', 'link', link_id, fields=changes)

    return link, None


# ── Pin / Star / Frequent ───────────────────────────────────────────

def set_pin(user_id: str, link_id: int, pinned: bool) -> Tuple[bool, Optional[str]]:
    link = _get_link(link_id, user_id)
    if not link:
        return False, 'Link not found'
    link.pinned = pinned
    link.pinned_at = datetime.utcnow() if pinned else None
    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.pinned' if pinned else 'link.unpinned', 'link', link_id)
    return True, None


def set_star(user_id: str, link_id: int, starred: bool) -> Tuple[bool, Optional[str]]:
    link = _get_link(link_id, user_id)
    if not link:
        return False, 'Link not found'
    link.starred = starred
    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.starred' if starred else 'link.unstarred', 'link', link_id)
    return True, None


def toggle_frequently_used(user_id: str, link_id: int) -> Tuple[Optional[bool], Optional[str]]:
    link = _get_link(link_id, user_id)
    if not link:
        return None, 'Link not found'
    link.frequently_used = not link.frequently_used
    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.frequent_toggled', 'link', link_id, state=link.frequently_used)
    return link.frequently_used, None


# ── Archive / Restore ────────────────────────────────────────────────

def archive_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    link = _get_link(link_id, user_id)
    if not link:
        return False, 'Link not found'
    link.archived_at = datetime.utcnow()
    link.pinned = False
    link.pinned_at = None
    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.archived', 'link', link_id)
    return True, None


def restore_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    link = _get_link(link_id, user_id)
    if not link:
        return False, 'Link not found'
    link.archived_at = None
    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.restored', 'link', link_id)
    return True, None


def toggle_active(user_id: str, link_id: int) -> Tuple[Optional[bool], Optional[str]]:
    link = _get_link(link_id, user_id)
    if not link:
        return None, 'Link not found'
    link.is_active = not link.is_active
    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.toggled_active', 'link', link_id, is_active=link.is_active)
    return link.is_active, None


# ── Delete ───────────────────────────────────────────────────────────

def soft_delete_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    link = _get_link(link_id, user_id)
    if not link:
        return False, 'Link not found'
    LinkTag.query.filter_by(link_id=link_id, user_id=user_id).delete()
    link.soft_deleted = True
    link.deleted_at = datetime.utcnow()
    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.deleted', 'link', link_id, title=link.title)
    return True, None


# ── Duplicate ────────────────────────────────────────────────────────

def duplicate_link(user_id: str, link_id: int) -> Tuple[Optional[Link], Optional[str]]:
    original = _get_link(link_id, user_id)
    if not original:
        return None, 'Link not found'

    new_slug = None
    if original.link_type == 'shortened':
        new_slug = generate_unique_slug()

    clone = Link(
        user_id=user_id, folder_id=original.folder_id,
        original_url=original.original_url, link_type=original.link_type,
        slug=new_slug,
        title=f"{original.title or 'Untitled'} (copy)",
        notes=original.notes, is_active=True, soft_deleted=False,
        metadata_=dict(original.metadata_ or {}),
    )
    db.session.add(clone)
    db.session.flush()

    existing_tags = LinkTag.query.filter_by(link_id=link_id, user_id=user_id).all()
    for lt in existing_tags:
        db.session.add(LinkTag(link_id=clone.id, tag_id=lt.tag_id, user_id=user_id))

    db.session.commit()
    on_link_change(user_id)
    _log(user_id, 'link.duplicated', 'link', clone.id, original_id=link_id)
    return clone, None


# ── Move / Tags ──────────────────────────────────────────────────────

def move_to_folder(user_id: str, link_id: int, folder_id: Optional[int]) -> bool:
    link = _get_link(link_id, user_id)
    if not link:
        return False
    if folder_id is not None:
        if not Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first():
            return False
    old_folder = link.folder_id
    link.folder_id = folder_id
    link.updated_at = datetime.utcnow()
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.moved', 'link', link_id, from_folder=old_folder, to_folder=folder_id)
    return True


def _add_tags(user_id: str, link_id: int, tag_ids: List[int]):
    existing = {r[0] for r in db.session.query(LinkTag.tag_id).filter_by(link_id=link_id, user_id=user_id).all()}
    valid_tags = Tag.query.filter(Tag.id.in_(tag_ids), Tag.user_id == user_id).all()
    for tag in valid_tags:
        if tag.id not in existing:
            db.session.add(LinkTag(link_id=link_id, tag_id=tag.id, user_id=user_id))


def update_link_tags(user_id: str, link_id: int, add_ids: List[int], remove_ids: List[int]) -> bool:
    link = _get_link(link_id, user_id)
    if not link:
        return False
    if add_ids:
        _add_tags(user_id, link_id, add_ids)
    if remove_ids:
        LinkTag.query.filter(
            LinkTag.link_id == link_id, LinkTag.tag_id.in_(remove_ids), LinkTag.user_id == user_id
        ).delete(synchronize_session='fetch')
    db.session.commit()
    on_link_change(user_id, link_id)
    on_tag_change(user_id)
    _log(user_id, 'link.tags_updated', 'link', link_id, added=add_ids, removed=remove_ids)
    return True


# ── Expiration ───────────────────────────────────────────────────────

def get_expiring_links(user_id: str, days_ahead: int = 7) -> List[Link]:
    cutoff = datetime.utcnow() + timedelta(days=days_ahead)
    return Link.query.filter(
        Link.user_id == user_id, Link.link_type == 'shortened', Link.soft_deleted == False,
        Link.expires_at.isnot(None), Link.expires_at <= cutoff, Link.expires_at > datetime.utcnow()
    ).order_by(Link.expires_at).all()


def extend_link_expiry(user_id: str, link_id: int, days: int) -> bool:
    link = Link.query.filter_by(id=link_id, user_id=user_id, link_type='shortened', soft_deleted=False).first()
    if not link:
        return False
    base = link.expires_at or datetime.utcnow()
    link.expires_at = base + timedelta(days=days)
    db.session.commit()
    on_link_change(user_id, link_id)
    _log(user_id, 'link.expiry_extended', 'link', link_id, days=days)
    return True