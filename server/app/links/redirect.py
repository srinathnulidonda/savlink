# server/app/links/redirect.py
from typing import Optional
from app.models.link import Link
from app.extensions import db
import logging

logger = logging.getLogger(__name__)


def resolve_slug(slug: str) -> Optional[str]:
    link = Link.query.filter_by(
        slug=slug,
        link_type='shortened',
        is_active=True,
        soft_deleted=False,
    ).filter(
        Link.archived_at.is_(None)
    ).first()

    if not link:
        return None

    link.click_count = Link.click_count + 1
    db.session.commit()

    logger.info(f"Redirect: /{slug} -> {link.original_url[:80]}")
    return link.original_url