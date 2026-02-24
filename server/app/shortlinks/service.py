# server/app/shortlinks/service.py
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
from app.extensions import db, redis_client
from app.models import Link
from app.links.service import _validate_url, _parse_expiration, _append_utm
from app.utils.slug import generate_unique_slug, is_slug_available
from app.utils.url import extract_domain

logger = logging.getLogger(__name__)


class ShortLinkManager:
    def __init__(self, user_id: str):
        self.user_id = user_id

    def create(self, data: Dict[str, Any]) -> Tuple[Optional[Link], Optional[str]]:
        url = data.get('original_url', '').strip()
        if not url or not _validate_url(url):
            return None, 'Invalid or missing URL'

        slug = data.get('slug')
        if slug:
            slug = slug.strip().lower()[:50]
            if not is_slug_available(slug):
                return None, 'Slug already taken'
        else:
            slug = generate_unique_slug()

        expires_at = None
        if data.get('expires_at'):
            expires_at, err = _parse_expiration(data['expires_at'])
            if err:
                return None, err

        if data.get('utm_params'):
            url = _append_utm(url, data['utm_params'])

        pw_hash = None
        if data.get('password'):
            import hashlib
            pw_hash = hashlib.sha256(data['password'].encode()).hexdigest()

        meta = {k: data.get(k) for k in ('utm_params', 'click_limit', 'created_via') if data.get(k)}
        if pw_hash:
            meta['password_protected'] = True

        link = Link(
            user_id=self.user_id, original_url=url, link_type='shortened', slug=slug,
            title=data.get('title', '').strip() or None, notes=data.get('notes', '').strip() or None,
            expires_at=expires_at, is_active=True, soft_deleted=False, metadata_=meta, password_hash=pw_hash)
        db.session.add(link)
        db.session.commit()
        return link, None

    def bulk_create(self, items: List[Dict]) -> Dict[str, Any]:
        if len(items) > 100:
            return {'error': 'Max 100 links per batch'}
        created, errors = [], []
        for i, item in enumerate(items):
            link, err = self.create(item)
            if err:
                errors.append({'index': i, 'error': err})
            else:
                created.append({'id': link.id, 'slug': link.slug, 'original_url': link.original_url})
        return {'created': created, 'errors': errors}

    def get_analytics(self, link_id: int, days: int = 30) -> Optional[Dict[str, Any]]:
        link = Link.query.filter_by(
            id=link_id, user_id=self.user_id, link_type='shortened', soft_deleted=False).first()
        if not link:
            return None

        redis_data = {}
        if redis_client.available:
            raw = redis_client.get(f"analytics:{link_id}")
            if raw:
                try:
                    redis_data = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    pass

        total = redis_data.get('total_clicks', link.click_count)
        daily = redis_data.get('daily_clicks', {})
        cutoff = datetime.utcnow() - timedelta(days=days)
        filtered = {d: c for d, c in daily.items() if d >= cutoff.strftime('%Y-%m-%d')}

        return {
            'link_id': link_id, 'slug': link.slug, 'original_url': link.original_url,
            'total_clicks': total, 'unique_clicks': redis_data.get('unique_clicks', 0),
            'daily_clicks': filtered, 'is_active': link.is_active,
            'is_expired': bool(link.expires_at and datetime.utcnow() > link.expires_at),
            'top_countries': sorted(redis_data.get('countries', {}).items(), key=lambda x: x[1], reverse=True)[:5],
            'top_devices': sorted(redis_data.get('devices', {}).items(), key=lambda x: x[1], reverse=True)[:5],
            'top_referrers': sorted(redis_data.get('referrers', {}).items(), key=lambda x: x[1], reverse=True)[:5],
        }

    def get_summary(self, days: int = 30) -> Dict[str, Any]:
        links = Link.query.filter_by(
            user_id=self.user_id, link_type='shortened', soft_deleted=False).all()
        now = datetime.utcnow()
        total_clicks = sum(l.click_count for l in links)
        top = sorted(links, key=lambda l: l.click_count, reverse=True)[:5]
        return {
            'total_links': len(links),
            'active_links': sum(1 for l in links if l.is_active),
            'expired_links': sum(1 for l in links if l.expires_at and now > l.expires_at),
            'total_clicks': total_clicks,
            'avg_clicks': round(total_clicks / max(len(links), 1), 2),
            'top_links': [{'id': l.id, 'slug': l.slug,
                           'title': l.title or extract_domain(l.original_url),
                           'clicks': l.click_count} for l in top],
        }

    @staticmethod
    def track_click(slug: str, client_info: Dict[str, Any]) -> Optional[str]:
        link = Link.query.filter_by(slug=slug, link_type='shortened', soft_deleted=False).first()
        if not link or not link.is_active:
            return None
        if link.expires_at and datetime.utcnow() > link.expires_at:
            return None
        if link.archived_at:
            return None

        meta = link.metadata_ or {}
        cl = meta.get('click_limit')
        if cl and link.click_count >= cl:
            return None

        link.click_count = Link.click_count + 1
        db.session.commit()

        if redis_client.available:
            _track_redis(link.id, client_info)

        return link.original_url


def _track_redis(link_id: int, info: Dict[str, Any]):
    key = f"analytics:{link_id}"
    try:
        raw = redis_client.get(key)
        data = json.loads(raw) if raw else {'total_clicks': 0, 'unique_clicks': 0,
                                            'countries': {}, 'devices': {}, 'referrers': {}, 'daily_clicks': {}}
        data['total_clicks'] += 1
        today = datetime.utcnow().strftime('%Y-%m-%d')
        data['daily_clicks'][today] = data['daily_clicks'].get(today, 0) + 1

        for dim, key_name in [('countries', 'country'), ('devices', 'device_type'), ('referrers', 'referrer')]:
            val = info.get(key_name, 'Unknown')
            data[dim][val] = data[dim].get(val, 0) + 1

        ip_key = f"analytics:{link_id}:ip:{info.get('ip', '')}"
        if not redis_client.exists(ip_key):
            redis_client.setex(ip_key, 86400, '1')
            data['unique_clicks'] += 1

        redis_client.setex(key, 86400 * 365, json.dumps(data))
    except Exception as e:
        logger.warning("Analytics tracking failed: %s", e)