# server/app/trash/service.py

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from app.extensions import db
from app.models import Link, Folder, LinkTag
from app.cache.invalidation import on_link_change, on_folder_change, on_bulk_change
from app.dashboard.serializers import serialize_link

logger = logging.getLogger(__name__)

TRASH_RETENTION_DAYS = 30


def get_trash(user_id: str, entity_type: str = 'all',
              limit: int = 30, cursor: Optional[str] = None) -> Dict[str, Any]:
    offset = 0
    if cursor:
        try:
            offset = max(0, int(cursor))
        except (ValueError, TypeError):
            pass

    items = []

    if entity_type in ('all', 'link'):
        links = (
            Link.query
            .filter(Link.user_id == user_id, Link.soft_deleted == True)
            .order_by(Link.updated_at.desc())
            .offset(offset)
            .limit(limit + 1)
            .all()
        )
        has_more_links = len(links) > limit
        for l in links[:limit]:
            d = serialize_link(l)
            d['trash_type'] = 'link'
            d['deleted_at'] = l.updated_at.isoformat() if l.updated_at else None
            d['auto_delete_at'] = (
                (l.updated_at + timedelta(days=TRASH_RETENTION_DAYS)).isoformat()
                if l.updated_at else None
            )
            items.append(d)

    if entity_type in ('all', 'folder'):
        from app.folders.service import serialize_folder
        folders = (
            Folder.query
            .filter(Folder.user_id == user_id, Folder.soft_deleted == True)
            .order_by(Folder.updated_at.desc())
            .limit(limit)
            .all()
        )
        for f in folders:
            d = serialize_folder(f)
            d['trash_type'] = 'folder'
            d['deleted_at'] = f.updated_at.isoformat() if f.updated_at else None
            items.append(d)

    has_more = len(items) > limit
    items = items[:limit]

    return {
        'items': items,
        'has_more': has_more,
        'next_cursor': str(offset + limit) if has_more else None,
    }


def get_trash_stats(user_id: str) -> Dict[str, Any]:
    link_count = Link.query.filter_by(user_id=user_id, soft_deleted=True).count()
    folder_count = Folder.query.filter_by(user_id=user_id, soft_deleted=True).count()

    cutoff = datetime.utcnow() - timedelta(days=TRASH_RETENTION_DAYS)
    expiring_soon = Link.query.filter(
        Link.user_id == user_id, Link.soft_deleted == True,
        Link.updated_at < cutoff + timedelta(days=3),
    ).count()

    return {
        'total_items': link_count + folder_count,
        'links': link_count,
        'folders': folder_count,
        'expiring_soon': expiring_soon,
        'retention_days': TRASH_RETENTION_DAYS,
    }


def restore_from_trash(user_id: str, item_id: int, entity_type: str = 'link') -> bool:
    if entity_type == 'link':
        link = Link.query.filter_by(id=item_id, user_id=user_id, soft_deleted=True).first()
        if not link:
            return False
        link.soft_deleted = False
        link.archived_at = None
        link.updated_at = datetime.utcnow()
        db.session.commit()
        on_link_change(user_id, item_id)
        _log(user_id, 'link.restored_from_trash', 'link', item_id)
        return True

    elif entity_type == 'folder':
        folder = Folder.query.filter_by(id=item_id, user_id=user_id, soft_deleted=True).first()
        if not folder:
            return False
        folder.soft_deleted = False
        folder.updated_at = datetime.utcnow()
        db.session.commit()
        on_folder_change(user_id)
        _log(user_id, 'folder.restored_from_trash', 'folder', item_id)
        return True

    return False


def restore_bulk(user_id: str, items: List[Dict]) -> Dict[str, Any]:
    restored = 0
    failed = 0
    for item in items[:100]:
        item_id = item.get('id')
        entity_type = item.get('type', 'link')
        if item_id and restore_from_trash(user_id, item_id, entity_type):
            restored += 1
        else:
            failed += 1
    return {'restored': restored, 'failed': failed}


def permanent_delete(user_id: str, item_id: int, entity_type: str = 'link') -> bool:
    if entity_type == 'link':
        link = Link.query.filter_by(id=item_id, user_id=user_id, soft_deleted=True).first()
        if not link:
            return False
        LinkTag.query.filter_by(link_id=item_id, user_id=user_id).delete()
        from app.models.share_link import ShareLink
        ShareLink.query.filter_by(link_id=item_id, user_id=user_id).delete()
        db.session.delete(link)
        db.session.commit()
        on_link_change(user_id, item_id)
        _log(user_id, 'link.permanent_delete', 'link', item_id)
        return True

    elif entity_type == 'folder':
        folder = Folder.query.filter_by(id=item_id, user_id=user_id, soft_deleted=True).first()
        if not folder:
            return False
        db.session.delete(folder)
        db.session.commit()
        on_folder_change(user_id)
        _log(user_id, 'folder.permanent_delete', 'folder', item_id)
        return True

    return False


def empty_trash(user_id: str) -> Dict[str, Any]:
    links = Link.query.filter_by(user_id=user_id, soft_deleted=True).all()
    link_ids = [l.id for l in links]
    if link_ids:
        LinkTag.query.filter(LinkTag.link_id.in_(link_ids), LinkTag.user_id == user_id).delete(synchronize_session='fetch')
        from app.models.share_link import ShareLink
        ShareLink.query.filter(ShareLink.link_id.in_(link_ids), ShareLink.user_id == user_id).delete(synchronize_session='fetch')

    link_count = Link.query.filter_by(user_id=user_id, soft_deleted=True).delete(synchronize_session='fetch')
    folder_count = Folder.query.filter_by(user_id=user_id, soft_deleted=True).delete(synchronize_session='fetch')
    db.session.commit()
    on_bulk_change(user_id)
    _log(user_id, 'trash.emptied', 'user', None, links=link_count, folders=folder_count)
    return {'deleted_links': link_count, 'deleted_folders': folder_count}


def auto_cleanup(user_id: str = None) -> Dict[str, Any]:
    cutoff = datetime.utcnow() - timedelta(days=TRASH_RETENTION_DAYS)
    q = Link.query.filter(Link.soft_deleted == True, Link.updated_at < cutoff)
    if user_id:
        q = q.filter(Link.user_id == user_id)

    links = q.all()
    link_ids = [l.id for l in links]
    if link_ids:
        LinkTag.query.filter(LinkTag.link_id.in_(link_ids)).delete(synchronize_session='fetch')

    count = q.delete(synchronize_session='fetch')

    fq = Folder.query.filter(Folder.soft_deleted == True, Folder.updated_at < cutoff)
    if user_id:
        fq = fq.filter(Folder.user_id == user_id)
    folder_count = fq.delete(synchronize_session='fetch')

    db.session.commit()
    if user_id:
        on_bulk_change(user_id)
    return {'deleted_links': count, 'deleted_folders': folder_count, 'cutoff': cutoff.isoformat()}


def _log(user_id, action, entity_type, entity_id, **details):
    try:
        from app.activity.service import log_activity
        log_activity(user_id, action, entity_type, entity_id, details or None)
    except Exception:
        pass