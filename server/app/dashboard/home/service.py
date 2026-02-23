# server/app/dashboard/home/service.py
# Home dashboard data — combined endpoint, quick access, recent activity

from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy import or_, desc, func
from sqlalchemy.orm import joinedload
from app.extensions import db
from app.models import Link, Folder
from app.dashboard.service import serialize_link
import logging

logger = logging.getLogger(__name__)

QUICK_ACCESS_LIMIT = 8
RECENT_LIMIT = 20


def get_home_data(user_id: str) -> Dict[str, Any]:
    """
    Combined home dashboard payload — one endpoint, one round trip.
    
    Returns:
        {
            'recent_links': [...],
            'quick_access': [...],
            'stats': { total_links, total_folders, this_week },
            'user': { id, name, email }
        }
    """
    from flask import g

    # Run queries
    recent = _recent_links(user_id, limit=10)
    quick = get_quick_access(user_id)
    stats = get_home_stats(user_id)

    # User summary
    u = g.current_user
    user_info = {
        'id': u.get('id') if isinstance(u, dict) else getattr(u, 'id', None),
        'name': u.get('name') if isinstance(u, dict) else getattr(u, 'name', None),
        'email': u.get('email') if isinstance(u, dict) else getattr(u, 'email', None),
    }

    return {
        'recent_links': [serialize_link(link) for link in recent],
        'quick_access': quick,
        'stats': stats,
        'user': user_info,
    }


def get_quick_access(user_id: str) -> List[Dict[str, Any]]:
    """
    Quick-access items: pinned/starred links + pinned folders.
    Sorted by importance (pinned > starred > frequently used).
    """
    items = []

    # ── Pinned & starred links ──
    try:
        links = (
            Link.query
            .options(joinedload(Link.folder))
            .filter(
                Link.user_id == user_id,
                Link.soft_deleted == False,  # noqa: E712
                Link.archived_at.is_(None),
                or_(Link.pinned == True, Link.starred == True),  # noqa: E712
            )
            .order_by(
                desc(Link.pinned),
                desc(Link.starred),
                desc(Link.updated_at),
            )
            .limit(QUICK_ACCESS_LIMIT)
            .all()
        )

        for link in links:
            items.append({
                'type': 'link',
                'item': serialize_link(link),
            })
    except Exception as e:
        logger.warning(f"Quick access links failed: {e}")

    # ── Pinned folders ──
    try:
        folders = (
            Folder.query
            .filter(
                Folder.user_id == user_id,
                Folder.soft_deleted == False,  # noqa: E712
                Folder.pinned == True,         # noqa: E712
            )
            .order_by(desc(Folder.updated_at))
            .limit(3)
            .all()
        )

        for folder in folders:
            # Count links in folder
            link_count = Link.query.filter(
                Link.user_id == user_id,
                Link.folder_id == folder.id,
                Link.soft_deleted == False,  # noqa: E712
                Link.archived_at.is_(None),
            ).count()

            items.append({
                'type': 'folder',
                'item': {
                    'id': folder.id,
                    'name': folder.name,
                    'color': folder.color,
                    'icon': getattr(folder, 'icon', None),
                    'link_count': link_count,
                    'pinned': True,
                },
            })
    except Exception as e:
        logger.warning(f"Quick access folders failed: {e}")

    return items[:QUICK_ACCESS_LIMIT]


def get_recent_activity(user_id: str) -> List[Dict[str, Any]]:
    """
    Recent activity: links added or edited in the last 7 days.
    """
    cutoff = datetime.utcnow() - timedelta(days=7)

    try:
        links = (
            Link.query
            .options(joinedload(Link.folder))
            .filter(
                Link.user_id == user_id,
                Link.soft_deleted == False,  # noqa: E712
                Link.archived_at.is_(None),
                or_(
                    Link.created_at >= cutoff,
                    Link.updated_at >= cutoff,
                ),
            )
            .order_by(desc(Link.updated_at), desc(Link.created_at))
            .limit(RECENT_LIMIT)
            .all()
        )

        activities = []
        for link in links:
            # Determine activity type
            created_recently = link.created_at and link.created_at >= cutoff
            same_timestamp = (
                link.updated_at is not None
                and link.created_at is not None
                and abs((link.updated_at - link.created_at).total_seconds()) < 2
            )

            if created_recently and same_timestamp:
                activity_type = 'added'
                timestamp = link.created_at
            else:
                activity_type = 'edited'
                timestamp = link.updated_at or link.created_at

            activities.append({
                'type': 'link',
                'activity': activity_type,
                'timestamp': timestamp.isoformat() if timestamp else None,
                'item': serialize_link(link),
            })

        return activities

    except Exception as e:
        logger.error(f"Recent activity query failed: {e}", exc_info=True)
        return []


def get_home_stats(user_id: str) -> Dict[str, Any]:
    """Lightweight stats for the home dashboard."""
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        na = Link.archived_at.is_(None)

        total_links = Link.query.filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,  # noqa: E712
            na,
        ).count()

        total_folders = Folder.query.filter(
            Folder.user_id == user_id,
            Folder.soft_deleted == False,  # noqa: E712
        ).count()

        this_week = Link.query.filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,  # noqa: E712
            Link.created_at >= week_ago,
        ).count()

        total_clicks = db.session.query(
            func.coalesce(func.sum(Link.click_count), 0)
        ).filter(
            Link.user_id == user_id,
            Link.soft_deleted == False,  # noqa: E712
            Link.link_type == 'shortened',
        ).scalar()

        return {
            'total_links': total_links,
            'total_folders': total_folders,
            'this_week': this_week,
            'total_clicks': int(total_clicks or 0),
        }

    except Exception as e:
        logger.error(f"Home stats query failed: {e}", exc_info=True)
        return {
            'total_links': 0,
            'total_folders': 0,
            'this_week': 0,
            'total_clicks': 0,
        }


# ─── Internal Helpers ─────────────────────────────────────────────────

def _recent_links(user_id: str, limit: int = 10) -> List[Link]:
    """Fetch the N most recently created links."""
    try:
        return (
            Link.query
            .options(joinedload(Link.folder))
            .filter(
                Link.user_id == user_id,
                Link.soft_deleted == False,  # noqa: E712
                Link.archived_at.is_(None),
            )
            .order_by(desc(Link.created_at))
            .limit(limit)
            .all()
        )
    except Exception as e:
        logger.error(f"Recent links query failed: {e}")
        return []