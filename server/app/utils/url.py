# server/app/utils/url.py
import os
from urllib.parse import urlparse


def get_base_url() -> str:
    try:
        from flask import current_app
        return current_app.config.get('BASE_URL')
    except RuntimeError:
        return os.environ.get('BASE_URL')


def get_short_link_url(slug: str) -> str:
    return f'{get_base_url()}/r/{slug}'


def extract_domain(url: str) -> str:
    try:
        host = urlparse(url).hostname or ''
        return host.removeprefix('www.')
    except Exception:
        return ''


def extract_display_url(url: str) -> str:
    try:
        p = urlparse(url)
        host = (p.hostname or '').removeprefix('www.')
        path = p.path.rstrip('/')
        if path and path != '/' and len(path) <= 30:
            return f'{host}{path}'
        if path and len(path) > 30:
            return f'{host}{path[:27]}...'
        return host
    except Exception:
        return url[:50] if url else ''


def build_favicon_url(url: str, size: int = 32) -> str:
    domain = extract_domain(url)
    return f'https://www.google.com/s2/favicons?domain={domain}&sz={size}' if domain else ''