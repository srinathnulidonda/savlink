# server/app/utils/base_url.py
import os
from flask import current_app


_DEFAULT_BASE_URL = 'https://savlink.vercel.app'


def get_base_url() -> str:
    try:
        return current_app.config.get('BASE_URL', _DEFAULT_BASE_URL)
    except RuntimeError:
        return os.environ.get('BASE_URL', _DEFAULT_BASE_URL)


def get_short_link_url(slug: str) -> str:
    base = get_base_url()
    try:
        prefix = current_app.config.get('SHORT_LINK_PREFIX', '/r')
    except RuntimeError:
        prefix = '/r'
    return f'{base}{prefix}/{slug}'