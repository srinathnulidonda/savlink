# server/app/export/service.py
import json
import csv
import io
import logging
from typing import Dict, Any, List
from app.models import Link, Folder, Tag, LinkTag
from app.extensions import db
from app.utils.url import extract_domain

logger = logging.getLogger(__name__)


def export_links(user_id: str, fmt: str = 'json') -> List[Dict[str, Any]]:
    links = Link.query.filter_by(user_id=user_id, soft_deleted=False).order_by(Link.created_at.desc()).all()

    rows = []
    for link in links:
        row = {
            'title': link.title or '',
            'url': link.original_url,
            'type': link.link_type,
            'slug': link.slug or '',
            'folder': link.folder.name if link.folder else '',
            'tags': ','.join(t.name for t in (link.tags or [])),
            'notes': link.notes or '',
            'pinned': link.pinned,
            'starred': getattr(link, 'starred', False),
            'created_at': link.created_at.isoformat() if link.created_at else '',
            'click_count': link.click_count,
        }
        rows.append(row)

    return rows


def import_links(user_id: str, file) -> Dict[str, Any]:
    filename = file.filename.lower()
    content = file.read().decode('utf-8', errors='ignore')

    if filename.endswith('.json'):
        return _import_json(user_id, content)
    elif filename.endswith('.csv'):
        return _import_csv(user_id, content)
    elif filename.endswith('.html'):
        return _import_bookmarks_html(user_id, content)
    else:
        return {'error': 'Unsupported format. Use JSON, CSV, or HTML bookmarks.'}


def _import_json(user_id: str, content: str) -> Dict[str, Any]:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return {'error': 'Invalid JSON'}

    items = data if isinstance(data, list) else data.get('links', data.get('bookmarks', []))
    return _create_links_from_import(user_id, items)


def _import_csv(user_id: str, content: str) -> Dict[str, Any]:
    reader = csv.DictReader(io.StringIO(content))
    items = []
    for row in reader:
        url = row.get('url') or row.get('URL') or row.get('link') or row.get('href')
        if url:
            items.append({'url': url, 'title': row.get('title', ''), 'notes': row.get('notes', '')})
    return _create_links_from_import(user_id, items)


def _import_bookmarks_html(user_id: str, content: str) -> Dict[str, Any]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(content, 'html.parser')
    items = []
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.startswith(('http://', 'https://')):
            items.append({'url': href, 'title': a.get_text().strip()})
    return _create_links_from_import(user_id, items)


def _create_links_from_import(user_id: str, items: List[Dict]) -> Dict[str, Any]:
    created, skipped, errors = 0, 0, 0

    for item in items[:1000]:
        url = item.get('url', '').strip()
        if not url:
            skipped += 1
            continue

        existing = Link.query.filter_by(user_id=user_id, original_url=url, soft_deleted=False).first()
        if existing:
            skipped += 1
            continue

        try:
            link = Link(
                user_id=user_id, original_url=url, link_type='saved',
                title=item.get('title', '').strip()[:500] or None,
                notes=item.get('notes', '').strip() or None,
                is_active=True, soft_deleted=False,
            )
            db.session.add(link)
            created += 1
        except Exception:
            errors += 1

    db.session.commit()
    return {'created': created, 'skipped': skipped, 'errors': errors, 'total': len(items)}