# server/app/metadata/service.py
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from app.extensions import db, redis_client
from app.models import Link
from app.utils.url import extract_domain

logger = logging.getLogger(__name__)

CACHE_TTL = 86400 * 7
ERROR_TTL = 3600
TIMEOUT = 10
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; SavlinkBot/1.0; +https://savlink.vercel.app)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.5',
}


def _cache_key(url: str) -> str:
    return f"meta:{hashlib.md5(url.encode()).hexdigest()}"


def _get_cached(url: str) -> Dict | None:
    if not redis_client.available:
        return None
    raw = redis_client.get(_cache_key(url))
    if not raw:
        return None
    try:
        return json.loads(raw).get('metadata')
    except (json.JSONDecodeError, TypeError):
        return None


def _set_cached(url: str, meta: Dict):
    if not redis_client.available:
        return
    ttl = CACHE_TTL if meta.get('extraction_success') else ERROR_TTL
    redis_client.setex(_cache_key(url), ttl, json.dumps({'metadata': meta}, default=str))


def extract_metadata(url: str, force_refresh: bool = False) -> Dict[str, Any]:
    if not force_refresh:
        cached = _get_cached(url)
        if cached:
            return cached

    domain = extract_domain(url)
    fallback = {
        'title': domain or 'Unknown', 'description': None, 'image': None,
        'favicon': f'https://www.google.com/s2/favicons?domain={domain}&sz=64' if domain else None,
        'domain': domain, 'type': 'website', 'extraction_success': False,
        'extracted_at': datetime.utcnow().isoformat(),
    }

    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        logger.warning("Fetch failed for %s: %s", url, e)
        _set_cached(url, fallback)
        return fallback

    try:
        soup = BeautifulSoup(resp.text, 'html.parser')
        final_url = str(resp.url)

        meta = {
            'title': _og(soup, 'og:title') or _meta(soup, 'twitter:title') or _tag_text(soup, 'title'),
            'description': _og(soup, 'og:description') or _meta(soup, 'description') or _meta(soup, 'twitter:description'),
            'image': _resolve_url(final_url, _og(soup, 'og:image') or _meta(soup, 'twitter:image')),
            'favicon': _resolve_url(final_url, _favicon(soup)) or f'https://www.google.com/s2/favicons?domain={domain}&sz=64',
            'site_name': _og(soup, 'og:site_name'),
            'author': _meta(soup, 'author'),
            'type': _og(soup, 'og:type') or 'website',
            'theme_color': _meta(soup, 'theme-color'),
            'domain': domain,
            'extraction_success': True,
            'extracted_at': datetime.utcnow().isoformat(),
        }

        _set_cached(url, meta)
        return meta

    except Exception as e:
        logger.error("Parse failed for %s: %s", url, e)
        _set_cached(url, fallback)
        return fallback


def refresh_link_metadata(link_id: int, user_id: str) -> Dict[str, Any]:
    link = Link.query.filter_by(id=link_id, user_id=user_id, soft_deleted=False).first()
    if not link:
        return {'error': 'Link not found'}
    try:
        meta = extract_metadata(link.original_url, force_refresh=True)
        link.metadata_ = link.metadata_ or {}
        link.metadata_['page_metadata'] = meta
        if not link.title and meta.get('title'):
            link.title = meta['title'][:500]
        db.session.commit()
        return {'success': True, 'metadata': meta}
    except Exception as e:
        return {'error': str(e)}


def _og(soup, prop):
    el = soup.find('meta', property=prop)
    return el['content'].strip() if el and el.get('content') else None


def _meta(soup, name):
    el = soup.find('meta', attrs={'name': name})
    return el['content'].strip() if el and el.get('content') else None


def _tag_text(soup, tag):
    el = soup.find(tag)
    return el.get_text().strip() if el else None


def _favicon(soup):
    for sel in ('link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]'):
        el = soup.select_one(sel)
        if el and el.get('href'):
            return el['href']
    return None


def _resolve_url(base, url):
    if not url:
        return None
    if url.startswith('//'):
        return f'{urlparse(base).scheme}:{url}'
    if url.startswith('/'):
        return urljoin(base, url)
    if not url.startswith(('http://', 'https://')):
        return urljoin(base, url)
    return url