# server/app/metadata/service.py

import re
import json
import hashlib
import logging
import random
from datetime import datetime
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup, Comment

from app.extensions import db, redis_client
from app.models import Link
from app.utils.url import extract_domain

logger = logging.getLogger(__name__)

CACHE_TTL = 86400 * 7
ERROR_TTL = 3600
TIMEOUT = 12

USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
]

HEADERS_BASE = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
}

WORD_RE = re.compile(r'\b\w+\b')
DATE_PATTERNS = [
    r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}',
    r'\d{4}-\d{2}-\d{2}',
    r'\w+ \d{1,2}, \d{4}',
]
STRIP_TAGS = {'script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'iframe'}


def _cache_key(url: str) -> str:
    return f"meta:v2:{hashlib.sha256(url.encode()).hexdigest()[:24]}"


def _get_cached(url: str) -> Optional[Dict]:
    if not redis_client.available:
        return None
    raw = redis_client.get(_cache_key(url))
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


def _set_cached(url: str, meta: Dict):
    if not redis_client.available:
        return
    ttl = CACHE_TTL if meta.get('extraction_success') else ERROR_TTL
    try:
        redis_client.setex(_cache_key(url), ttl, json.dumps(meta, default=str))
    except Exception:
        pass


def _headers() -> Dict[str, str]:
    h = dict(HEADERS_BASE)
    h['User-Agent'] = random.choice(USER_AGENTS)
    return h


def _resolve(base: str, url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = url.strip()
    if url.startswith('data:'):
        return None
    if url.startswith('//'):
        return f'{urlparse(base).scheme}:{url}'
    if not url.startswith(('http://', 'https://')):
        return urljoin(base, url)
    return url


def _clean(text: Optional[str], max_len: int = 1000) -> Optional[str]:
    if not text:
        return None
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > max_len:
        text = text[:max_len].rsplit(' ', 1)[0] + '…'
    return text or None


def _is_valid_image(url: Optional[str]) -> bool:
    if not url:
        return False
    url_lower = url.lower()
    if any(x in url_lower for x in ['1x1', 'pixel', 'spacer', 'blank', 'tracking', '.svg']):
        return False
    if url.startswith('data:'):
        return False
    return True


#  Main entry 

def extract_metadata(url: str, force_refresh: bool = False) -> Dict[str, Any]:
    if not force_refresh:
        cached = _get_cached(url)
        if cached:
            cached['_from_cache'] = True
            return cached

    domain = extract_domain(url)
    fallback = _build_fallback(url, domain)

    try:
        session = requests.Session()
        session.max_redirects = 5
        resp = session.get(url, headers=_headers(), timeout=TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
    except requests.exceptions.TooManyRedirects:
        logger.warning("Too many redirects: %s", url)
        _set_cached(url, fallback)
        return fallback
    except Exception as e:
        logger.warning("Fetch failed for %s: %s", url, e)
        _set_cached(url, fallback)
        return fallback

    try:
        content_type = resp.headers.get('Content-Type', '')
        if 'text/html' not in content_type and 'application/xhtml' not in content_type:
            meta = _handle_non_html(url, resp, domain)
            _set_cached(url, meta)
            return meta

        soup = BeautifulSoup(resp.text, 'html.parser')
        final_url = str(resp.url)

        meta = {}
        _extract_jsonld(soup, meta)
        _extract_opengraph(soup, meta, final_url)
        _extract_twitter(soup, meta, final_url)
        _extract_standard(soup, meta, final_url)
        _extract_favicons(soup, meta, final_url, domain)
        _extract_dates(soup, meta)
        _extract_content_metrics(soup, meta)
        _extract_feeds(soup, meta, final_url)
        _extract_canonical(soup, meta, final_url)
        _extract_locale(soup, meta)

        meta['domain'] = domain
        meta['url'] = final_url
        meta['extraction_success'] = True
        meta['extracted_at'] = datetime.utcnow().isoformat()
        meta['content_type'] = _detect_content_type(meta, soup)
        meta['_from_cache'] = False

        meta = _finalize(meta, domain)
        _set_cached(url, meta)
        return meta

    except Exception as e:
        logger.error("Parse failed for %s: %s", url, e)
        _set_cached(url, fallback)
        return fallback


def _build_fallback(url: str, domain: str) -> Dict[str, Any]:
    return {
        'title': domain or 'Unknown',
        'description': None,
        'image': None,
        'favicon': f'https://www.google.com/s2/favicons?domain={domain}&sz=64' if domain else None,
        'favicons': _google_favicons(domain),
        'domain': domain,
        'url': url,
        'type': 'website',
        'content_type': 'website',
        'extraction_success': False,
        'extracted_at': datetime.utcnow().isoformat(),
    }


def _google_favicons(domain: str) -> List[Dict]:
    if not domain:
        return []
    return [
        {'url': f'https://www.google.com/s2/favicons?domain={domain}&sz={s}', 'size': s}
        for s in [16, 32, 64, 128]
    ]


def _handle_non_html(url: str, resp, domain: str) -> Dict[str, Any]:
    ct = resp.headers.get('Content-Type', '')
    cl = resp.headers.get('Content-Length')
    file_type = 'file'
    if 'image/' in ct:
        file_type = 'image'
    elif 'video/' in ct:
        file_type = 'video'
    elif 'audio/' in ct:
        file_type = 'audio'
    elif 'pdf' in ct:
        file_type = 'pdf'

    filename = url.rsplit('/', 1)[-1].split('?')[0] or domain

    return {
        'title': filename,
        'description': f'{file_type.title()} file from {domain}',
        'image': url if file_type == 'image' else None,
        'favicon': f'https://www.google.com/s2/favicons?domain={domain}&sz=64',
        'favicons': _google_favicons(domain),
        'domain': domain,
        'url': url,
        'type': file_type,
        'content_type': file_type,
        'mime_type': ct.split(';')[0].strip(),
        'file_size': int(cl) if cl and cl.isdigit() else None,
        'extraction_success': True,
        'extracted_at': datetime.utcnow().isoformat(),
    }


#  JSON-LD 

def _extract_jsonld(soup: BeautifulSoup, meta: Dict):
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            raw = script.string
            if not raw:
                continue
            data = json.loads(raw)
            items = data if isinstance(data, list) else [data]

            for item in items:
                if isinstance(item, dict) and '@graph' in item:
                    items.extend(item['@graph'])

            for item in items:
                if not isinstance(item, dict):
                    continue
                item_type = item.get('@type', '')
                if isinstance(item_type, list):
                    item_type = item_type[0] if item_type else ''

                if not meta.get('title') and item.get('headline'):
                    meta['title'] = _clean(item['headline'], 500)
                if not meta.get('title') and item.get('name'):
                    meta['title'] = _clean(item['name'], 500)
                if not meta.get('description') and item.get('description'):
                    meta['description'] = _clean(item['description'], 300)

                if not meta.get('image'):
                    img = item.get('image')
                    if isinstance(img, str):
                        meta['image'] = img
                    elif isinstance(img, dict):
                        meta['image'] = img.get('url')
                    elif isinstance(img, list) and img:
                        first = img[0]
                        meta['image'] = first.get('url') if isinstance(first, dict) else first

                author = item.get('author')
                if author and not meta.get('author'):
                    if isinstance(author, str):
                        meta['author'] = author
                    elif isinstance(author, dict):
                        meta['author'] = author.get('name')
                    elif isinstance(author, list) and author:
                        names = [a.get('name') if isinstance(a, dict) else str(a) for a in author[:3]]
                        meta['author'] = ', '.join(filter(None, names))

                pub = item.get('publisher')
                if pub and not meta.get('publisher'):
                    if isinstance(pub, dict):
                        meta['publisher'] = pub.get('name')
                        logo = pub.get('logo')
                        if logo and not meta.get('publisher_logo'):
                            meta['publisher_logo'] = logo.get('url') if isinstance(logo, dict) else logo

                if not meta.get('published_at') and item.get('datePublished'):
                    meta['published_at'] = item['datePublished']
                if not meta.get('modified_at') and item.get('dateModified'):
                    meta['modified_at'] = item['dateModified']

                if not meta.get('jsonld_type'):
                    meta['jsonld_type'] = item_type

                if item_type in ('Product', 'SoftwareApplication'):
                    offers = item.get('offers', {})
                    if isinstance(offers, list) and offers:
                        offers = offers[0]
                    if isinstance(offers, dict):
                        meta['price'] = offers.get('price')
                        meta['currency'] = offers.get('priceCurrency')

                rating = item.get('aggregateRating')
                if rating and isinstance(rating, dict) and not meta.get('rating'):
                    meta['rating'] = rating.get('ratingValue')
                    meta['rating_count'] = rating.get('reviewCount') or rating.get('ratingCount')

                if item.get('keywords') and not meta.get('keywords'):
                    kw = item['keywords']
                    if isinstance(kw, str):
                        meta['keywords'] = [k.strip() for k in kw.split(',')][:10]
                    elif isinstance(kw, list):
                        meta['keywords'] = kw[:10]

        except (json.JSONDecodeError, TypeError, AttributeError):
            continue


#  Open Graph 

def _extract_opengraph(soup: BeautifulSoup, meta: Dict, base_url: str):
    og_map = {
        'og:title': 'title',
        'og:description': 'description',
        'og:image': 'image',
        'og:image:alt': 'image_alt',
        'og:image:width': 'image_width',
        'og:image:height': 'image_height',
        'og:site_name': 'site_name',
        'og:type': 'type',
        'og:url': 'canonical_url',
        'og:locale': 'locale',
        'og:video': 'video_url',
        'og:video:url': 'video_url',
        'og:audio': 'audio_url',
        'article:author': 'author',
        'article:published_time': 'published_at',
        'article:modified_time': 'modified_at',
        'article:section': 'section',
        'article:tag': '_og_tags',
        'product:price:amount': 'price',
        'product:price:currency': 'currency',
    }

    og_tags = []

    for tag in soup.find_all('meta', property=True):
        prop = tag.get('property', '')
        content = tag.get('content', '').strip()
        if not content:
            continue

        if prop == 'article:tag':
            og_tags.append(content)
            continue

        field = og_map.get(prop)
        if field and not meta.get(field):
            if field == 'image':
                content = _resolve(base_url, content)
            if field in ('title', 'description', 'site_name'):
                content = _clean(content, 500 if field == 'title' else 300)
            meta[field] = content

    if og_tags and not meta.get('keywords'):
        meta['keywords'] = og_tags[:10]

    images = []
    for tag in soup.find_all('meta', property='og:image'):
        img_url = _resolve(base_url, tag.get('content', '').strip())
        if img_url and _is_valid_image(img_url) and img_url not in [i['url'] for i in images]:
            images.append({'url': img_url, 'source': 'og'})
    if images:
        meta['images'] = meta.get('images', []) + images


#  Twitter Cards 

def _extract_twitter(soup: BeautifulSoup, meta: Dict, base_url: str):
    tw_map = {
        'twitter:title': 'title',
        'twitter:description': 'description',
        'twitter:image': 'image',
        'twitter:image:src': 'image',
        'twitter:image:alt': 'image_alt',
        'twitter:card': 'twitter_card',
        'twitter:site': 'twitter_handle',
        'twitter:creator': 'twitter_creator',
        'twitter:player': 'video_url',
    }

    for tag in soup.find_all('meta', attrs={'name': True}):
        name = tag.get('name', '')
        content = tag.get('content', '').strip()
        if not content:
            continue
        field = tw_map.get(name)
        if field and not meta.get(field):
            if field == 'image':
                content = _resolve(base_url, content)
            if field in ('title', 'description'):
                content = _clean(content, 500 if field == 'title' else 300)
            meta[field] = content


#  Standard HTML tags 

def _extract_standard(soup: BeautifulSoup, meta: Dict, base_url: str):
    if not meta.get('title'):
        el = soup.find('title')
        if el:
            meta['title'] = _clean(el.get_text(), 500)

    meta_map = {
        'description': 'description',
        'author': 'author',
        'keywords': '_raw_keywords',
        'theme-color': 'theme_color',
        'application-name': 'app_name',
        'generator': 'generator',
        'robots': 'robots',
        'viewport': '_viewport',
    }

    for tag in soup.find_all('meta', attrs={'name': True}):
        name = tag.get('name', '').lower()
        content = tag.get('content', '').strip()
        if not content:
            continue
        field = meta_map.get(name)
        if field and not meta.get(field):
            meta[field] = _clean(content, 300)

    if not meta.get('keywords') and meta.get('_raw_keywords'):
        meta['keywords'] = [k.strip() for k in meta['_raw_keywords'].split(',') if k.strip()][:15]

    for key in ('_raw_keywords', '_viewport', '_og_tags'):
        meta.pop(key, None)

    if not meta.get('image'):
        for sel in [
            'meta[property="og:image"]',
            'link[rel="image_src"]',
            'meta[name="thumbnail"]',
        ]:
            el = soup.select_one(sel)
            if el:
                img = _resolve(base_url, el.get('content') or el.get('href'))
                if _is_valid_image(img):
                    meta['image'] = img
                    break

    if not meta.get('image'):
        for img in soup.find_all('img', src=True):
            src = _resolve(base_url, img.get('src'))
            if not _is_valid_image(src):
                continue
            width = img.get('width', '')
            height = img.get('height', '')
            try:
                w = int(re.sub(r'\D', '', width)) if width else 0
                h = int(re.sub(r'\D', '', height)) if height else 0
            except ValueError:
                w, h = 0, 0
            if w >= 200 and h >= 200:
                meta['image'] = src
                break
            if w == 0 and h == 0 and 'logo' not in (src or '').lower():
                meta.setdefault('_candidate_image', src)

    if not meta.get('image') and meta.get('_candidate_image'):
        meta['image'] = meta.pop('_candidate_image')
    else:
        meta.pop('_candidate_image', None)


#  Favicons 

def _extract_favicons(soup: BeautifulSoup, meta: Dict, base_url: str, domain: str):
    favicons = []
    seen = set()

    selectors = [
        ('link[rel="icon"]', 'icon'),
        ('link[rel="shortcut icon"]', 'shortcut'),
        ('link[rel="apple-touch-icon"]', 'apple'),
        ('link[rel="apple-touch-icon-precomposed"]', 'apple'),
        ('link[rel="mask-icon"]', 'mask'),
    ]

    for sel, source in selectors:
        for el in soup.select(sel):
            href = _resolve(base_url, el.get('href'))
            if not href or href in seen:
                continue
            seen.add(href)

            sizes = el.get('sizes', '')
            size = 0
            if sizes and 'any' not in sizes.lower():
                try:
                    size = int(sizes.split('x')[0])
                except (ValueError, IndexError):
                    pass

            favicons.append({
                'url': href,
                'size': size,
                'type': el.get('type', ''),
                'source': source,
            })

    favicons.sort(key=lambda f: f.get('size', 0), reverse=True)

    google = _google_favicons(domain)
    for g in google:
        if g['url'] not in seen:
            favicons.append({'url': g['url'], 'size': g['size'], 'source': 'google'})

    meta['favicons'] = favicons

    if favicons:
        preferred = None
        for f in favicons:
            s = f.get('size', 0)
            if 28 <= s <= 64:
                preferred = f['url']
                break
        if not preferred:
            for f in favicons:
                if f.get('source') in ('apple', 'icon'):
                    preferred = f['url']
                    break
        meta['favicon'] = preferred or favicons[0]['url']
    else:
        meta['favicon'] = f'https://www.google.com/s2/favicons?domain={domain}&sz=64' if domain else None


#  Dates 

def _extract_dates(soup: BeautifulSoup, meta: Dict):
    if not meta.get('published_at'):
        for sel in [
            'time[datetime]',
            'time[pubdate]',
            '[itemprop="datePublished"]',
            '[class*="publish"]',
            '[class*="date"]',
        ]:
            el = soup.select_one(sel)
            if el:
                dt = el.get('datetime') or el.get('content') or el.get_text().strip()
                if dt and _looks_like_date(dt):
                    meta['published_at'] = dt
                    break

    if not meta.get('modified_at'):
        for sel in [
            '[itemprop="dateModified"]',
            'meta[property="article:modified_time"]',
        ]:
            el = soup.select_one(sel)
            if el:
                dt = el.get('datetime') or el.get('content')
                if dt:
                    meta['modified_at'] = dt
                    break

    if meta.get('published_at'):
        meta['published_at'] = _normalize_date(meta['published_at'])
    if meta.get('modified_at'):
        meta['modified_at'] = _normalize_date(meta['modified_at'])


def _looks_like_date(s: str) -> bool:
    return any(re.search(p, s) for p in DATE_PATTERNS)


def _normalize_date(s: str) -> Optional[str]:
    if not s:
        return None
    try:
        from dateutil.parser import parse as dateparse
        return dateparse(s).isoformat()
    except Exception:
        return s


#  Content Metrics 

def _extract_content_metrics(soup: BeautifulSoup, meta: Dict):
    article = soup.find('article') or soup.find('main') or soup.find('[role="main"]')
    container = article or soup.body

    if not container:
        return

    for tag in container.find_all(STRIP_TAGS):
        tag.decompose()

    for comment in container.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    text = container.get_text(separator=' ', strip=True)
    words = WORD_RE.findall(text)
    word_count = len(words)

    meta['word_count'] = word_count
    meta['reading_time_minutes'] = max(1, round(word_count / 238))

    headings = []
    for level in range(1, 4):
        for h in (article or soup).find_all(f'h{level}'):
            txt = h.get_text(strip=True)
            if txt and len(txt) > 2:
                headings.append({'level': level, 'text': _clean(txt, 200)})
    if headings:
        meta['headings'] = headings[:10]

    links_count = len(container.find_all('a', href=True))
    images_count = len(container.find_all('img', src=True))
    meta['links_count'] = links_count
    meta['images_count'] = images_count


#  RSS/Atom feeds 

def _extract_feeds(soup: BeautifulSoup, meta: Dict, base_url: str):
    feeds = []
    for link in soup.find_all('link', type=True):
        link_type = link.get('type', '')
        if 'rss' in link_type or 'atom' in link_type:
            href = _resolve(base_url, link.get('href'))
            if href:
                feeds.append({
                    'url': href,
                    'type': 'rss' if 'rss' in link_type else 'atom',
                    'title': link.get('title', ''),
                })
    if feeds:
        meta['feeds'] = feeds[:3]


#  Canonical URL 

def _extract_canonical(soup: BeautifulSoup, meta: Dict, base_url: str):
    if not meta.get('canonical_url'):
        link = soup.find('link', rel='canonical')
        if link and link.get('href'):
            meta['canonical_url'] = _resolve(base_url, link['href'])


#  Locale 

def _extract_locale(soup: BeautifulSoup, meta: Dict):
    if not meta.get('locale'):
        html = soup.find('html')
        if html:
            meta['locale'] = html.get('lang') or html.get('xml:lang')

    alt_locales = []
    for tag in soup.find_all('meta', property='og:locale:alternate'):
        content = tag.get('content', '').strip()
        if content:
            alt_locales.append(content)
    if alt_locales:
        meta['alternate_locales'] = alt_locales[:5]


#  Content Type Detection 

def _detect_content_type(meta: Dict, soup: BeautifulSoup) -> str:
    og_type = (meta.get('type') or '').lower()
    jsonld = (meta.get('jsonld_type') or '').lower()

    if any(x in og_type for x in ['video', 'movie']):
        return 'video'
    if 'music' in og_type or 'audio' in jsonld:
        return 'audio'
    if 'product' in og_type or 'product' in jsonld:
        return 'product'
    if 'profile' in og_type:
        return 'profile'
    if 'article' in og_type or 'newsarticle' in jsonld or 'blogposting' in jsonld:
        return 'article'
    if 'recipe' in jsonld:
        return 'recipe'
    if 'event' in jsonld:
        return 'event'

    reading_time = meta.get('reading_time_minutes', 0)
    word_count = meta.get('word_count', 0)
    has_article = soup.find('article') is not None

    if has_article and word_count > 200:
        return 'article'
    if word_count > 500:
        return 'article'
    if meta.get('video_url'):
        return 'video'
    if reading_time >= 2:
        return 'article'

    return 'website'


#  Finalize 

def _finalize(meta: Dict, domain: str) -> Dict[str, Any]:
    if meta.get('image') and not _is_valid_image(meta['image']):
        meta['image'] = None

    if not meta.get('title'):
        meta['title'] = domain or 'Untitled'

    if meta.get('description'):
        meta['description'] = _clean(meta['description'], 300)

    if not meta.get('site_name'):
        meta['site_name'] = _infer_site_name(domain)

    images = meta.get('images', [])
    if meta.get('image') and meta['image'] not in [i.get('url') for i in images]:
        images.insert(0, {'url': meta['image'], 'source': 'primary'})
    meta['images'] = images[:6]

    cleanup_keys = ['jsonld_type', '_from_cache']
    for k in cleanup_keys:
        meta.pop(k, None)

    return meta


def _infer_site_name(domain: str) -> Optional[str]:
    if not domain:
        return None
    parts = domain.split('.')
    name = parts[-2] if len(parts) >= 2 else parts[0]
    return name.capitalize()


#  Refresh link metadata 

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


#  Batch extraction 

def batch_extract(urls: List[str], force_refresh: bool = False) -> List[Dict[str, Any]]:
    results = []
    for url in urls[:20]:
        try:
            meta = extract_metadata(url.strip(), force_refresh=force_refresh)
            results.append({'url': url, 'metadata': meta, 'success': True})
        except Exception as e:
            results.append({'url': url, 'metadata': None, 'success': False, 'error': str(e)})
    return results