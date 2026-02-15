# server/app/shortlinks/redirect.py

from typing import Optional
from datetime import datetime
from app.models.link import Link
from app.extensions import db
import logging

logger = logging.getLogger(__name__)

def resolve_short_link(slug: str) -> Optional[str]:
    """Resolve short link slug to destination URL"""
    link = Link.query.filter_by(
        slug=slug,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        logger.info(f"Short link not found: {slug}")
        return None
    
    # Check if link is active
    if not link.is_active:
        logger.info(f"Short link inactive: {slug}")
        return None
    
    # Check expiration
    if link.expires_at and datetime.utcnow() > link.expires_at:
        logger.info(f"Short link expired: {slug} (expired at {link.expires_at})")
        return None
    
    # Check if archived
    if link.archived_at:
        logger.info(f"Short link archived: {slug}")
        return None
    
    # Update click count
    try:
        link.click_count = Link.click_count + 1
        db.session.commit()
    except Exception as e:
        logger.error(f"Failed to update click count for {slug}: {e}")
        db.session.rollback()
    
    logger.info(f"Short link redirect: {slug} -> {link.original_url[:80]}")
    return link.original_url

def get_redirect_info(slug: str) -> Optional[dict]:
    """Get redirect information without performing redirect"""
    link = Link.query.filter_by(
        slug=slug,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        return None
    
    is_expired = link.expires_at and datetime.utcnow() > link.expires_at
    
    return {
        'slug': slug,
        'destination': link.original_url,
        'is_active': link.is_active,
        'is_expired': is_expired,
        'is_archived': link.archived_at is not None,
        'expires_at': link.expires_at.isoformat() if link.expires_at else None,
        'click_count': link.click_count,
        'can_redirect': link.is_active and not is_expired and not link.archived_at
    }