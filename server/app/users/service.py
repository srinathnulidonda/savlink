# server/app/users/service.py

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import func
from app.extensions import db
from app.models import User, Link, Folder, Tag, LinkTag
from app.models.user_preferences import UserPreferences
from app.cache.redis_layer import cache
from app.cache import keys as K
from app.cache.invalidation import on_user_change, on_bulk_change

logger = logging.getLogger(__name__)


#  Lookup 

def get_user_by_id(user_id: str) -> Optional[User]:
    return User.query.filter_by(id=user_id).first()


def get_user_by_email(email: str) -> Optional[User]:
    return User.query.filter_by(email=email).first()


#  Profile 

def get_full_profile(user_id: str) -> Optional[Dict[str, Any]]:
    key = K.USER_PROFILE.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    user = get_user_by_id(user_id)
    if not user:
        return None

    prefs = _get_or_create_preferences(user_id)
    profile = {
        **user.to_dict(),
        'preferences': prefs.to_dict(),
        'stats_summary': _quick_stats(user_id),
    }
    cache.put(key, profile, K.TTL_USER)
    return profile


def update_profile(user_id: str, data: Dict[str, Any]):
    user = get_user_by_id(user_id)
    if not user:
        return None, 'User not found'

    allowed = {'name', 'avatar_url'}
    for field in allowed:
        if field in data:
            val = data[field]
            if field == 'name':
                val = val.strip()[:255] if val else None
            if field == 'avatar_url':
                val = val.strip()[:2000] if val else None
            setattr(user, field, val)

    db.session.commit()
    on_user_change(user_id)
    return get_full_profile(user_id), None


def update_avatar(user_id: str, avatar_url: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False
    user.avatar_url = avatar_url.strip()[:2000]
    db.session.commit()
    on_user_change(user_id)
    return True


#  Preferences 

def _get_or_create_preferences(user_id: str) -> UserPreferences:
    prefs = UserPreferences.query.filter_by(user_id=user_id).first()
    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.session.add(prefs)
        db.session.commit()
    return prefs


def get_preferences(user_id: str) -> Dict[str, Any]:
    key = K.USER_PREFS.format(user_id)
    cached = cache.get(key)
    if cached:
        return cached

    prefs = _get_or_create_preferences(user_id)
    data = prefs.to_dict()
    cache.put(key, data, K.TTL_USER)
    return data


def update_preferences(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    prefs = _get_or_create_preferences(user_id)

    for field, value in data.items():
        if field not in UserPreferences.EDITABLE_FIELDS:
            continue
        if field in UserPreferences.BOOL_FIELDS:
            value = bool(value)
        if field == 'links_per_page':
            value = max(10, min(int(value), 100))
        if field == 'theme' and value not in ('light', 'dark', 'system'):
            continue
        if field == 'default_view' and value not in ('all', 'recent', 'starred', 'pinned'):
            continue
        if field == 'default_link_type' and value not in ('saved', 'shortened'):
            continue
        if field == 'date_format' and value not in ('relative', 'absolute', 'iso'):
            continue
        setattr(prefs, field, value)

    prefs.updated_at = datetime.utcnow()
    db.session.commit()
    on_user_change(user_id)
    return prefs.to_dict()


def reset_preferences(user_id: str) -> Dict[str, Any]:
    prefs = UserPreferences.query.filter_by(user_id=user_id).first()
    if prefs:
        db.session.delete(prefs)
        db.session.commit()
    new_prefs = _get_or_create_preferences(user_id)
    on_user_change(user_id)
    return new_prefs.to_dict()


#  Emergency Access 

def enable_emergency_access(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False
    user.emergency_enabled = True
    db.session.commit()
    on_user_change(user_id)
    _log(user_id, 'user.emergency_enabled', 'user')
    return True


def disable_emergency_access(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False
    user.emergency_enabled = False
    db.session.commit()
    on_user_change(user_id)
    _log(user_id, 'user.emergency_disabled', 'user')
    return True


def get_emergency_status(user_id: str) -> Dict[str, Any]:
    user = get_user_by_id(user_id)
    if not user:
        return {'enabled': False}
    from app.models import EmergencyToken
    active_tokens = EmergencyToken.query.filter(
        EmergencyToken.user_id == user_id,
        EmergencyToken.used_at.is_(None),
        EmergencyToken.expires_at > datetime.utcnow(),
    ).count()
    return {
        'enabled': user.emergency_enabled,
        'active_tokens': active_tokens,
    }


#  Stats 

def _quick_stats(user_id: str) -> Dict[str, Any]:
    na = Link.archived_at.is_(None)
    total = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False, na).count()
    folders = Folder.query.filter_by(user_id=user_id, soft_deleted=False).count()
    tags = Tag.query.filter_by(user_id=user_id).count()
    return {'total_links': total, 'total_folders': folders, 'total_tags': tags}


def get_user_stats(user_id: str, days: int = 30) -> Dict[str, Any]:
    key = K.USER_STATS.format(user_id)
    cached = cache.get(key)
    if cached and cached.get('period_days') == days:
        return cached

    cutoff = datetime.utcnow() - timedelta(days=days)
    na = Link.archived_at.is_(None)

    total = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False).count()
    active = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False, na, Link.is_active == True).count()
    archived = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False, Link.archived_at.isnot(None)).count()
    in_trash = Link.query.filter_by(user_id=user_id, soft_deleted=True).count()

    created_period = Link.query.filter(
        Link.user_id == user_id, Link.soft_deleted == False, Link.created_at >= cutoff
    ).count()
    clicks = db.session.query(func.coalesce(func.sum(Link.click_count), 0)).filter(
        Link.user_id == user_id, Link.link_type == 'shortened', Link.soft_deleted == False
    ).scalar()

    folders = Folder.query.filter_by(user_id=user_id, soft_deleted=False).count()
    tags = Tag.query.filter_by(user_id=user_id).count()
    starred = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False, na, Link.starred == True).count()
    pinned = Link.query.filter(Link.user_id == user_id, Link.soft_deleted == False, na, Link.pinned == True).count()

    # Links created by day
    daily = (
        db.session.query(
            func.date(Link.created_at).label('day'), func.count(Link.id),
        )
        .filter(Link.user_id == user_id, Link.soft_deleted == False, Link.created_at >= cutoff)
        .group_by('day')
        .order_by('day')
        .all()
    )

    # Top folders
    top_folders = (
        db.session.query(Folder.name, func.count(Link.id))
        .join(Link, Link.folder_id == Folder.id)
        .filter(Folder.user_id == user_id, Folder.soft_deleted == False, Link.soft_deleted == False)
        .group_by(Folder.id, Folder.name)
        .order_by(func.count(Link.id).desc())
        .limit(5)
        .all()
    )

    stats = {
        'total_links': total,
        'active_links': active,
        'archived_links': archived,
        'trashed_links': in_trash,
        'total_folders': folders,
        'total_tags': tags,
        'starred_links': starred,
        'pinned_links': pinned,
        'total_clicks': int(clicks or 0),
        'links_created_period': created_period,
        'period_days': days,
        'daily_created': {str(d): c for d, c in daily},
        'top_folders': [{'name': n, 'count': c} for n, c in top_folders],
        'account_age_days': None,
    }

    user = get_user_by_id(user_id)
    if user and user.created_at:
        stats['account_age_days'] = (datetime.utcnow() - user.created_at).days

    cache.put(key, stats, K.TTL_STATS)
    return stats


#  Export 

def export_user_data(user_id: str) -> Dict[str, Any]:
    user = get_user_by_id(user_id)
    if not user:
        return {}

    links = Link.query.filter_by(user_id=user_id, soft_deleted=False).all()
    folders = Folder.query.filter_by(user_id=user_id, soft_deleted=False).all()
    tags = Tag.query.filter_by(user_id=user_id).all()
    prefs = _get_or_create_preferences(user_id)

    return {
        'user': user.to_dict(),
        'preferences': prefs.to_dict(),
        'links': [
            {
                'title': l.title, 'url': l.original_url, 'type': l.link_type,
                'slug': l.slug, 'notes': l.notes, 'pinned': l.pinned,
                'starred': l.starred, 'click_count': l.click_count,
                'created_at': l.created_at.isoformat() if l.created_at else None,
                'folder': l.folder.name if l.folder else None,
                'tags': [t.name for t in (l.tags or [])],
            }
            for l in links
        ],
        'folders': [{'name': f.name, 'color': f.color, 'icon': f.icon} for f in folders],
        'tags': [{'name': t.name, 'color': t.color} for t in tags],
        'exported_at': datetime.utcnow().isoformat(),
    }


#  Account Deletion 

def delete_account(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False

    try:
        # Delete in dependency order
        from app.models.activity_log import ActivityLog
        from app.models.share_link import ShareLink
        from app.models import EmergencyToken

        link_ids = [l.id for l in Link.query.filter_by(user_id=user_id).all()]
        if link_ids:
            LinkTag.query.filter(LinkTag.link_id.in_(link_ids)).delete(synchronize_session='fetch')
            ShareLink.query.filter(ShareLink.link_id.in_(link_ids)).delete(synchronize_session='fetch')

        Link.query.filter_by(user_id=user_id).delete(synchronize_session='fetch')
        Folder.query.filter_by(user_id=user_id).delete(synchronize_session='fetch')
        Tag.query.filter_by(user_id=user_id).delete(synchronize_session='fetch')
        ActivityLog.query.filter_by(user_id=user_id).delete(synchronize_session='fetch')
        EmergencyToken.query.filter_by(user_id=user_id).delete(synchronize_session='fetch')
        ShareLink.query.filter_by(user_id=user_id).delete(synchronize_session='fetch')
        UserPreferences.query.filter_by(user_id=user_id).delete(synchronize_session='fetch')

        db.session.delete(user)
        db.session.commit()

        on_bulk_change(user_id)
        logger.info("Account deleted: %s", user_id[:8])
        return True

    except Exception as e:
        logger.error("Account deletion failed for %s: %s", user_id[:8], e)
        db.session.rollback()
        return False


def _log(user_id, action, entity_type, entity_id=None, **details):
    try:
        from app.activity.service import log_activity
        log_activity(user_id, action, entity_type, entity_id, details or None)
    except Exception:
        pass