# server/app/links/duplicate.py
from typing import Optional, Dict
from app.models.link import Link


def check_duplicate(user_id: str, original_url: str) -> Optional[Dict]:
    normalized = original_url.strip().rstrip('/')

    existing = Link.query.filter(
        Link.user_id == user_id,
        Link.soft_deleted == False
    ).filter(
        (Link.original_url == normalized) |
        (Link.original_url == normalized + '/') |
        (Link.original_url == original_url)
    ).first()

    if not existing:
        return None

    return {
        'exists': True,
        'existing_link_id': existing.id,
        'existing_title': existing.title,
        'is_archived': existing.archived_at is not None,
        'message': 'You already saved this URL'
    }