from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy import and_
from app.extensions import db
from app.models.link import Link
import logging

logger = logging.getLogger(__name__)

def get_expiring_links(user_id: str, days_ahead: int = 7) -> List[Link]:
    """Get links expiring within specified days"""
    cutoff = datetime.utcnow() + timedelta(days=days_ahead)
    
    return Link.query.filter(
        Link.user_id == user_id,
        Link.link_type == 'shortened',
        Link.soft_deleted == False,
        Link.expires_at.isnot(None),
        Link.expires_at <= cutoff,
        Link.expires_at > datetime.utcnow()  # Not already expired
    ).order_by(Link.expires_at).all()

def get_expired_links(user_id: str, limit: Optional[int] = None) -> List[Link]:
    """Get expired short links"""
    query = Link.query.filter(
        Link.user_id == user_id,
        Link.link_type == 'shortened',
        Link.soft_deleted == False,
        Link.expires_at.isnot(None),
        Link.expires_at <= datetime.utcnow()
    ).order_by(Link.expires_at.desc())
    
    if limit:
        query = query.limit(limit)
    
    return query.all()

def is_link_expired(link: Link) -> bool:
    """Check if a link is expired"""
    return link.expires_at and datetime.utcnow() > link.expires_at

def extend_link_expiry(user_id: str, link_id: int, extension_days: int) -> bool:
    """Extend link expiration by specified days"""
    link = Link.query.filter_by(
        id=link_id,
        user_id=user_id,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        return False
    
    if link.expires_at:
        link.expires_at = link.expires_at + timedelta(days=extension_days)
    else:
        link.expires_at = datetime.utcnow() + timedelta(days=extension_days)
    
    db.session.commit()
    return True

def set_link_expiry(user_id: str, link_id: int, expires_at: datetime) -> bool:
    """Set specific expiration date for link"""
    link = Link.query.filter_by(
        id=link_id,
        user_id=user_id,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        return False
    
    link.expires_at = expires_at
    db.session.commit()
    return True

def remove_link_expiry(user_id: str, link_id: int) -> bool:
    """Remove expiration from link (make permanent)"""
    link = Link.query.filter_by(
        id=link_id,
        user_id=user_id,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        return False
    
    link.expires_at = None
    db.session.commit()
    return True

def get_expiry_stats(user_id: str) -> dict:
    """Get expiration statistics for user"""
    now = datetime.utcnow()
    
    # Count expiring in next 7 days
    expiring_soon = Link.query.filter(
        Link.user_id == user_id,
        Link.link_type == 'shortened',
        Link.soft_deleted == False,
        Link.expires_at.isnot(None),
        Link.expires_at <= now + timedelta(days=7),
        Link.expires_at > now
    ).count()
    
    # Count already expired
    expired_count = Link.query.filter(
        Link.user_id == user_id,
        Link.link_type == 'shortened',
        Link.soft_deleted == False,
        Link.expires_at.isnot(None),
        Link.expires_at <= now
    ).count()
    
    # Count permanent (no expiry)
    permanent_count = Link.query.filter(
        Link.user_id == user_id,
        Link.link_type == 'shortened',
        Link.soft_deleted == False,
        Link.expires_at.is_(None)
    ).count()
    
    return {
        'expiring_soon': expiring_soon,
        'expired': expired_count,
        'permanent': permanent_count
    }