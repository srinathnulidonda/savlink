# server/app/search/service.py
import re
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy import or_, func, desc, case, and_
from sqlalchemy.orm import joinedload
from app.extensions import db, redis_client
from app.models import Link, Folder, Tag, LinkTag
from app.utils.url import extract_domain
from app.dashboard.serializers import serialize_link

logger = logging.getLogger(__name__)


class SearchEngine:
    CACHE_TTL = 300
    MAX_HISTORY = 50

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.prefix = f"search:{user_id}"

    def search(self, query: str, filters: Optional[Dict] = None, limit: int = 50) -> Dict[str, Any]:
        normalized = re.sub(r'\s+', ' ', query.strip()).lower()
        if not normalized:
            return self._empty()

        cache_key = f"{self.prefix}:{hash(normalized)}:{hash(str(filters))}"
        if redis_client.available:
            cached = redis_client.get(cache_key)
            if cached:
                try:
                    return json.loads(cached)
                except (json.JSONDecodeError, TypeError):
                    pass

        self._record(query)

        links = self._search_links(normalized, filters, limit)
        folders = self._search_folders(normalized, limit // 4)
        tags = self._search_tags(normalized, limit // 4)

        results = {
            'query': query, 'links': links, 'folders': folders, 'tags': tags,
            'stats': {'total': len(links) + len(folders) + len(tags),
                      'links_count': len(links), 'folders_count': len(folders), 'tags_count': len(tags)},
        }

        if redis_client.available:
            redis_client.setex(cache_key, self.CACHE_TTL, json.dumps(results, default=str))

        return results

    def _search_links(self, query: str, filters: Optional[Dict], limit: int) -> List[Dict]:
        q = Link.query.options(joinedload(Link.folder)).filter(
            Link.user_id == self.user_id, Link.soft_deleted == False, Link.archived_at.is_(None))

        if filters:
            if filters.get('starred'):
                q = q.filter(Link.starred == True)
            if filters.get('pinned'):
                q = q.filter(Link.pinned == True)
            if filters.get('link_type'):
                q = q.filter(Link.link_type == filters['link_type'])
            if filters.get('folder_id'):
                q = q.filter(Link.folder_id == filters['folder_id'])
            elif filters.get('unassigned_only'):
                q = q.filter(Link.folder_id.is_(None))
            if filters.get('tag_ids'):
                for tid in filters['tag_ids']:
                    sub = db.session.query(LinkTag.link_id).filter(LinkTag.tag_id == tid, LinkTag.link_id == Link.id)
                    q = q.filter(sub.exists())

        pat = f'%{query}%'
        q = q.filter(or_(
            func.lower(Link.title).like(pat), func.lower(Link.original_url).like(pat),
            func.lower(Link.notes).like(pat), func.lower(Link.slug).like(pat)))

        relevance = (
            case([(func.lower(Link.title) == query, 100),
                  (func.lower(Link.title).like(f'{query}%'), 80),
                  (func.lower(Link.title).like(pat), 60)], else_=0) +
            case([(func.lower(Link.original_url).like(pat), 40)], else_=0) +
            case([(func.lower(Link.notes).like(pat), 30)], else_=0) +
            case([(Link.pinned == True, 20)], else_=0) +
            case([(Link.starred == True, 15)], else_=0)
        )

        rows = q.add_columns(relevance.label('rel')).order_by(
            desc('rel'), desc(Link.pinned), desc(Link.updated_at)).limit(limit).all()

        results = []
        for link, rel in rows:
            d = serialize_link(link)
            d['search_relevance'] = float(rel) if rel else 0
            results.append(d)
        return results

    def _search_folders(self, query: str, limit: int) -> List[Dict]:
        pat = f'%{query}%'
        folders = Folder.query.filter(
            Folder.user_id == self.user_id, Folder.soft_deleted == False,
            func.lower(Folder.name).like(pat)
        ).order_by(desc(Folder.pinned), Folder.name).limit(limit).all()
        from app.folders.service import serialize_folder
        return [serialize_folder(f, counts=True) for f in folders]

    def _search_tags(self, query: str, limit: int) -> List[Dict]:
        pat = f'%{query}%'
        rows = db.session.query(Tag, func.count(LinkTag.id).label('cnt')).outerjoin(
            LinkTag, and_(LinkTag.tag_id == Tag.id, LinkTag.user_id == self.user_id)
        ).filter(Tag.user_id == self.user_id, func.lower(Tag.name).like(pat)
        ).group_by(Tag.id).order_by(desc('cnt')).limit(limit).all()
        return [{'id': t.id, 'name': t.name, 'color': t.color, 'usage_count': c} for t, c in rows]

    def _record(self, query: str):
        if not redis_client.available:
            return
        try:
            key = f"{self.prefix}:history"
            raw = redis_client.get(key)
            history = json.loads(raw) if raw else []
            for entry in history:
                if entry['query'].lower() == query.lower():
                    entry['count'] += 1
                    entry['ts'] = datetime.utcnow().isoformat()
                    break
            else:
                history.append({'query': query, 'ts': datetime.utcnow().isoformat(), 'count': 1})
            history.sort(key=lambda x: (x['count'], x['ts']), reverse=True)
            redis_client.setex(key, 86400 * 30, json.dumps(history[:self.MAX_HISTORY]))
        except Exception as e:
            logger.warning("Search history save failed: %s", e)

    def get_history(self, limit: int = 10) -> List[Dict]:
        if not redis_client.available:
            return []
        try:
            raw = redis_client.get(f"{self.prefix}:history")
            return json.loads(raw)[:limit] if raw else []
        except Exception:
            return []

    def _empty(self):
        return {'query': '', 'links': [], 'folders': [], 'tags': [],
                'stats': {'total': 0, 'links_count': 0, 'folders_count': 0, 'tags_count': 0}}