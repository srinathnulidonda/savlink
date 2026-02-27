# server/app/links/bulk.py

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.extensions import db
from app.models import Link, Folder, Tag, LinkTag
from app.cache.invalidation import on_link_change, on_bulk_change

logger = logging.getLogger(__name__)

ALLOWED_ACTIONS = {
    'archive', 'restore', 'delete', 'pin', 'unpin',
    'star', 'unstar', 'move_folder', 'add_tags',
    'remove_tags', 'toggle_active', 'mark_frequent',
    'unmark_frequent',
}


def execute_bulk(user_id: str, action: str, link_ids: List[int], params: Dict[str, Any] = None) -> Dict[str, Any]:
    if action not in ALLOWED_ACTIONS:
        return {'error': f'Unknown action: {action}. Allowed: {", ".join(sorted(ALLOWED_ACTIONS))}'}

    params = params or {}
    links = Link.query.filter(
        Link.id.in_(link_ids), Link.user_id == user_id, Link.soft_deleted == False,
    ).all()

    if not links:
        return {'error': 'No matching links found'}

    found_ids = {l.id for l in links}
    missing = [lid for lid in link_ids if lid not in found_ids]
    now = datetime.utcnow()

    handler = _HANDLERS.get(action)
    if not handler:
        return {'error': f'Handler not found for {action}'}

    affected = handler(links, now, user_id, params)

    db.session.commit()
    on_bulk_change(user_id)

    _log_bulk(user_id, action, [l.id for l in links])

    return {
        'action': action,
        'affected': affected,
        'total_requested': len(link_ids),
        'total_found': len(links),
        'missing_ids': missing,
    }


#  handlers 

def _bulk_archive(links, now, user_id, params):
    count = 0
    for l in links:
        if l.archived_at is None:
            l.archived_at = now
            l.pinned = False
            l.pinned_at = None
            l.updated_at = now
            count += 1
    return count


def _bulk_restore(links, now, user_id, params):
    count = 0
    for l in links:
        if l.archived_at is not None:
            l.archived_at = None
            l.updated_at = now
            count += 1
    return count


def _bulk_delete(links, now, user_id, params):
    ids = [l.id for l in links]
    LinkTag.query.filter(LinkTag.link_id.in_(ids), LinkTag.user_id == user_id).delete(synchronize_session='fetch')
    for l in links:
        l.soft_deleted = True
        l.updated_at = now
    return len(links)


def _bulk_pin(links, now, user_id, params):
    for l in links:
        l.pinned = True
        l.pinned_at = now
        l.updated_at = now
    return len(links)


def _bulk_unpin(links, now, user_id, params):
    for l in links:
        l.pinned = False
        l.pinned_at = None
        l.updated_at = now
    return len(links)


def _bulk_star(links, now, user_id, params):
    for l in links:
        l.starred = True
        l.updated_at = now
    return len(links)


def _bulk_unstar(links, now, user_id, params):
    for l in links:
        l.starred = False
        l.updated_at = now
    return len(links)


def _bulk_move_folder(links, now, user_id, params):
    folder_id = params.get('folder_id')
    if folder_id is not None:
        if not Folder.query.filter_by(id=folder_id, user_id=user_id, soft_deleted=False).first():
            return 0
    for l in links:
        l.folder_id = folder_id
        l.updated_at = now
    return len(links)


def _bulk_add_tags(links, now, user_id, params):
    tag_ids = params.get('tag_ids', [])
    if not tag_ids:
        return 0
    valid = {t.id for t in Tag.query.filter(Tag.id.in_(tag_ids), Tag.user_id == user_id).all()}
    count = 0
    for l in links:
        existing = {r[0] for r in db.session.query(LinkTag.tag_id).filter_by(link_id=l.id, user_id=user_id).all()}
        for tid in valid - existing:
            db.session.add(LinkTag(link_id=l.id, tag_id=tid, user_id=user_id))
            count += 1
    return count


def _bulk_remove_tags(links, now, user_id, params):
    tag_ids = params.get('tag_ids', [])
    if not tag_ids:
        return 0
    ids = [l.id for l in links]
    deleted = LinkTag.query.filter(
        LinkTag.link_id.in_(ids), LinkTag.tag_id.in_(tag_ids), LinkTag.user_id == user_id,
    ).delete(synchronize_session='fetch')
    return deleted


def _bulk_toggle_active(links, now, user_id, params):
    for l in links:
        l.is_active = not l.is_active
        l.updated_at = now
    return len(links)


def _bulk_mark_frequent(links, now, user_id, params):
    for l in links:
        l.frequently_used = True
        l.updated_at = now
    return len(links)


def _bulk_unmark_frequent(links, now, user_id, params):
    for l in links:
        l.frequently_used = False
        l.updated_at = now
    return len(links)


_HANDLERS = {
    'archive': _bulk_archive, 'restore': _bulk_restore, 'delete': _bulk_delete,
    'pin': _bulk_pin, 'unpin': _bulk_unpin, 'star': _bulk_star, 'unstar': _bulk_unstar,
    'move_folder': _bulk_move_folder, 'add_tags': _bulk_add_tags,
    'remove_tags': _bulk_remove_tags, 'toggle_active': _bulk_toggle_active,
    'mark_frequent': _bulk_mark_frequent, 'unmark_frequent': _bulk_unmark_frequent,
}


def _log_bulk(user_id, action, link_ids):
    try:
        from app.activity.service import log_activity
        log_activity(user_id, f'bulk.{action}', 'link', None, {'link_ids': link_ids, 'count': len(link_ids)})
    except Exception:
        pass