# server/app/activity/service.py

import json
import logging
import threading
from queue import Queue, Full
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from app.extensions import db
from app.models.activity_log import ActivityLog
from app.cache.redis_layer import cache
from app.cache import keys as K

logger = logging.getLogger(__name__)

FEED_KEY = "sl:feed:{}"
FEED_MAX = 50
FEED_TTL = 86400

# ═══ Async write queue — prevents activity logging from blocking requests ═══
_write_queue = Queue(maxsize=1000)
_writer_started = False


def _start_writer():
    """Background thread that batches activity writes."""
    global _writer_started
    if _writer_started:
        return
    _writer_started = True

    def _worker():
        while True:
            batch = []
            # Collect up to 20 items or wait 2 seconds
            try:
                item = _write_queue.get(timeout=2)
                batch.append(item)
            except Exception:
                continue

            # Drain remaining without blocking
            while len(batch) < 20:
                try:
                    batch.append(_write_queue.get_nowait())
                except Exception:
                    break

            if batch:
                _flush_batch(batch)

    t = threading.Thread(target=_worker, daemon=True, name='activity-writer')
    t.start()
    logger.info("[ACTIVITY] Background writer started")


def _flush_batch(batch):
    """Write a batch of activity records in one transaction."""
    try:
        from flask import current_app
        app = current_app._get_current_object()
    except RuntimeError:
        return

    try:
        with app.app_context():
            for item in batch:
                record = ActivityLog(
                    user_id=item['user_id'],
                    action=item['action'],
                    entity_type=item['entity_type'],
                    entity_id=item.get('entity_id'),
                    details=item.get('details', {}),
                    ip_address=item.get('ip_address'),
                )
                db.session.add(record)
            db.session.commit()

            # Push to Redis feed
            for item in batch:
                _push_to_feed(item['user_id'], item)

    except Exception as e:
        logger.warning("Activity batch write failed: %s", e)
        try:
            db.session.rollback()
        except Exception:
            pass


def log_activity(user_id: str, action: str, entity_type: str,
                 entity_id: Optional[int] = None,
                 details: Optional[Dict] = None,
                 ip_address: Optional[str] = None):
    """Non-blocking activity log — queues for background write."""
    _start_writer()

    item = {
        'user_id': user_id,
        'action': action,
        'entity_type': entity_type,
        'entity_id': entity_id,
        'details': details or {},
        'ip_address': ip_address,
        'created_at': datetime.utcnow().isoformat(),
    }

    try:
        _write_queue.put_nowait(item)
    except Full:
        logger.warning("Activity queue full — dropping log for %s", action)


def _push_to_feed(user_id: str, entry: Dict):
    if not cache.available():
        return
    try:
        from app.extensions import redis_client
        key = FEED_KEY.format(user_id)
        redis_client._exec(
            redis_client._client.lpush, key,
            json.dumps(entry, default=str)
        )
        redis_client._exec(redis_client._client.ltrim, key, 0, FEED_MAX - 1)
        redis_client.expire(key, FEED_TTL)
    except Exception:
        pass


def get_user_activity(user_id: str, limit: int = 30,
                      cursor: Optional[str] = None,
                      entity_type: Optional[str] = None,
                      action: Optional[str] = None) -> Dict[str, Any]:
    q = ActivityLog.query.filter_by(user_id=user_id)
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)
    if action:
        q = q.filter(ActivityLog.action == action)
    q = q.order_by(ActivityLog.created_at.desc())

    offset = 0
    if cursor:
        try:
            offset = max(0, int(cursor))
        except (ValueError, TypeError):
            pass

    items = q.offset(offset).limit(limit + 1).all()
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]

    return {
        'activities': [a.to_dict() for a in items],
        'has_more': has_more,
        'next_cursor': str(offset + limit) if has_more else None,
    }


def get_activity_feed(user_id: str, limit: int = 50) -> List[Dict]:
    if not cache.available():
        items = ActivityLog.query.filter_by(user_id=user_id).order_by(
            ActivityLog.created_at.desc()
        ).limit(limit).all()
        return [a.to_dict() for a in items]
    try:
        from app.extensions import redis_client
        key = FEED_KEY.format(user_id)
        raw_items = redis_client._exec(
            redis_client._client.lrange, key, 0, limit - 1
        )
        if raw_items:
            return [json.loads(r) for r in raw_items]
    except Exception:
        pass
    items = ActivityLog.query.filter_by(user_id=user_id).order_by(
        ActivityLog.created_at.desc()
    ).limit(limit).all()
    return [a.to_dict() for a in items]


def get_activity_stats(user_id: str, days: int = 30) -> Dict[str, Any]:
    cutoff = datetime.utcnow() - timedelta(days=days)
    from sqlalchemy import func

    rows = (
        db.session.query(ActivityLog.action, func.count(ActivityLog.id))
        .filter(
            ActivityLog.user_id == user_id,
            ActivityLog.created_at >= cutoff,
        )
        .group_by(ActivityLog.action).all()
    )
    by_action = {action: count for action, count in rows}

    daily = (
        db.session.query(
            func.date(ActivityLog.created_at).label('day'),
            func.count(ActivityLog.id),
        )
        .filter(
            ActivityLog.user_id == user_id,
            ActivityLog.created_at >= cutoff,
        )
        .group_by('day').order_by('day').all()
    )

    return {
        'total_actions': sum(by_action.values()),
        'by_action': by_action,
        'daily': {str(d): c for d, c in daily},
        'period_days': days,
    }


def clear_old_activity(user_id: str, older_than_days: int = 90) -> int:
    cutoff = datetime.utcnow() - timedelta(days=older_than_days)
    deleted = ActivityLog.query.filter(
        ActivityLog.user_id == user_id,
        ActivityLog.created_at < cutoff,
    ).delete(synchronize_session='fetch')
    db.session.commit()
    return deleted