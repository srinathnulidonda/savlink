# server/app/utils/url.py
from urllib.parse import urlparse


def extract_display_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path.split('/')[0]
        domain = domain.lower().removeprefix('www.')
        path = parsed.path.rstrip('/')

        if path and path != '/' and len(path) <= 30:
            return f'{domain}{path}'

        if path and len(path) > 30:
            return f'{domain}{path[:27]}...'

        return domain
    except Exception:
        return url[:50] if url else ''


def extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path.split('/')[0]
        return domain.lower().removeprefix('www.')
    except Exception:
        return ''


def build_favicon_url(url: str) -> str:
    domain = extract_domain(url)
    if not domain:
        return ''
    return f'https://www.google.com/s2/favicons?domain={domain}&sz=64'