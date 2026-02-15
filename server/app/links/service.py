# server/app/links/service.py

from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from app.extensions import db
from app.models.link import Link
from app.links.queries import get_link_for_user
from app.links.duplicate import check_duplicate
from app.utils.slug import generate_unique_slug, is_slug_available
import logging

logger = logging.getLogger(__name__)

def create_link(user_id: str, data: Dict[str, Any]) -> Tuple[Optional[Link], Optional[Dict]]:
    """Enhanced link creation with metadata extraction and validation"""
    original_url = data.get('original_url', '').strip()
    if not original_url:
        return None, {'error': 'original_url is required'}

    # Validate URL format
    if not _validate_url_format(original_url):
        return None, {'error': 'Invalid URL format'}

    link_type = data.get('link_type', 'saved')
    if link_type not in ('saved', 'shortened'):
        return None, {'error': 'link_type must be saved or shortened'}

    # Check for duplicates
    duplicate = check_duplicate(user_id, original_url)

    # Handle short link slug
    slug = None
    if link_type == 'shortened':
        slug = data.get('slug')
        if slug:
            slug = slug.strip().lower()
            if not is_slug_available(slug):
                return None, {'error': 'Slug already taken'}
        else:
            slug = generate_unique_slug()
    
    # Validate folder if provided
    folder_id = data.get('folder_id')
    if folder_id is not None:
        from app.models import Folder
        folder = Folder.query.filter_by(
            id=folder_id,
            user_id=user_id,
            soft_deleted=False
        ).first()
        
        if not folder:
            return None, {'error': 'Folder not found'}

    # Handle expiration for short links
    expires_at = None
    if link_type == 'shortened' and data.get('expires_at'):
        expires_at, error = _parse_expiration(data['expires_at'])
        if error:
            return None, {'error': error}

    # Get title and notes
    title = data.get('title', '').strip() or None
    notes = data.get('notes', '').strip() or None

    # Prepare metadata
    metadata = data.get('metadata', {})
    
    # UTM parameters for short links
    if link_type == 'shortened' and data.get('utm_params'):
        original_url = _append_utm_parameters(original_url, data['utm_params'])
        metadata['utm_params'] = data['utm_params']

    # Password protection for short links
    password_hash = None
    if link_type == 'shortened' and data.get('password'):
        password_hash = _hash_password(data['password'])
        metadata['password_protected'] = True

    # Click limit for short links
    if link_type == 'shortened' and data.get('click_limit'):
        metadata['click_limit'] = data['click_limit']

    # Create link
    link = Link(
        user_id=user_id,
        folder_id=folder_id,
        original_url=original_url,
        link_type=link_type,
        slug=slug,
        title=title,
        notes=notes,
        expires_at=expires_at,
        is_active=True,
        pinned=data.get('pinned', False),
        starred=data.get('starred', False),
        soft_deleted=False,
        click_count=0,
        metadata_=metadata,
        password_hash=password_hash
    )

    db.session.add(link)
    db.session.flush()
    
    # Handle tags
    tag_ids = data.get('tag_ids', [])
    if tag_ids:
        from app.links.tagging import add_tags_to_link
        add_tags_to_link(user_id, link.id, tag_ids)
    
    # Queue for metadata extraction if no title and is saved link
    if not title and link_type == 'saved':
        _queue_metadata_extraction(link.id)
    
    db.session.commit()

    # Prepare response
    result = {'link': link}
    if duplicate:
        result['duplicate_warning'] = duplicate

    return link, result if duplicate else None

def update_link(user_id: str, link_id: int, data: Dict[str, Any]) -> Tuple[Optional[Link], Optional[str]]:
    """Enhanced link update with metadata refresh option"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return None, 'Link not found'

    # Update basic fields
    if 'title' in data:
        new_title = data['title'].strip() if data['title'] else None
        link.title = new_title

    if 'notes' in data:
        link.notes = data['notes'].strip() if data['notes'] else None

    if 'original_url' in data:
        url = data['original_url'].strip()
        if not url:
            return None, 'original_url cannot be empty'
        if not _validate_url_format(url):
            return None, 'Invalid URL format'
        
        # If URL changed, queue for metadata refresh
        if url != link.original_url:
            link.original_url = url
            _queue_metadata_extraction(link.id)

    # Update status fields
    if 'pinned' in data:
        link.pinned = bool(data['pinned'])
        if link.pinned:
            link.pinned_at = datetime.utcnow()
        else:
            link.pinned_at = None

    if 'starred' in data:
        link.starred = bool(data['starred'])

    if 'frequently_used' in data:
        link.frequently_used = bool(data['frequently_used'])

    # Short link specific updates
    if link.link_type == 'shortened':
        if 'slug' in data:
            new_slug = data['slug'].strip().lower()
            if new_slug != link.slug and not is_slug_available(new_slug):
                return None, 'Slug already taken'
            link.slug = new_slug

        if 'expires_at' in data:
            if data['expires_at']:
                expires_at, error = _parse_expiration(data['expires_at'])
                if error:
                    return None, error
                link.expires_at = expires_at
            else:
                link.expires_at = None

        # Update UTM parameters
        if 'utm_params' in data:
            utm_params = data['utm_params']
            metadata = link.metadata_ or {}
            metadata['utm_params'] = utm_params
            link.metadata_ = metadata
            
            # Update URL with new UTM params if they exist
            if utm_params:
                base_url = link.original_url.split('?')[0]
                link.original_url = _append_utm_parameters(base_url, utm_params)

    # Update folder
    if 'folder_id' in data:
        folder_id = data['folder_id']
        if folder_id is not None:
            from app.models import Folder
            folder = Folder.query.filter_by(
                id=folder_id,
                user_id=user_id,
                soft_deleted=False
            ).first()
            if not folder:
                return None, 'Folder not found'
        link.folder_id = folder_id

    # Refresh metadata if requested
    if data.get('refresh_metadata'):
        _queue_metadata_extraction(link.id)

    link.updated_at = datetime.utcnow()
    db.session.commit()
    return link, None

def pin_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    """Pin a link for quick access"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return False, 'Link not found'

    link.pinned = True
    link.pinned_at = datetime.utcnow()
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return True, None

def unpin_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    """Unpin a link"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return False, 'Link not found'

    link.pinned = False
    link.pinned_at = None
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return True, None

def star_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    """Star a link (mark as favorite)"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return False, 'Link not found'

    link.starred = True
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return True, None

def unstar_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    """Unstar a link"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return False, 'Link not found'

    link.starred = False
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return True, None

def toggle_frequently_used(user_id: str, link_id: int) -> Tuple[Optional[bool], Optional[str]]:
    """Toggle frequently used status"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return None, 'Link not found'

    link.frequently_used = not link.frequently_used
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return link.frequently_used, None

def archive_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    """Archive a link"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return False, 'Link not found'

    link.archived_at = datetime.utcnow()
    link.pinned = False  # Unpin when archiving
    link.pinned_at = None
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return True, None

def restore_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    """Restore an archived link"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return False, 'Link not found'

    link.archived_at = None
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return True, None

def toggle_active(user_id: str, link_id: int) -> Tuple[Optional[bool], Optional[str]]:
    """Toggle link active status (mainly for short links)"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return None, 'Link not found'

    link.is_active = not link.is_active
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return link.is_active, None

def soft_delete_link(user_id: str, link_id: int) -> Tuple[bool, Optional[str]]:
    """Soft delete a link"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return False, 'Link not found'

    # Remove from any tags
    from app.models import LinkTag
    LinkTag.query.filter_by(link_id=link_id, user_id=user_id).delete()

    link.soft_deleted = True
    link.updated_at = datetime.utcnow()
    db.session.commit()
    return True, None

def mark_link_accessed(user_id: str, link_id: int) -> bool:
    """Mark a link as accessed for frequency tracking"""
    link = get_link_for_user(link_id, user_id)
    if not link:
        return False

    # Update access metrics
    link.click_count += 1
    link.updated_at = datetime.utcnow()
    
    # Mark as frequently used if accessed multiple times
    if link.click_count >= 3:
        link.frequently_used = True

    db.session.commit()
    return True

def bulk_update_links(user_id: str, link_ids: list, updates: Dict[str, Any]) -> Dict[str, int]:
    """Bulk update multiple links"""
    results = {'updated': 0, 'errors': 0}
    
    if not link_ids or len(link_ids) > 100:  # Limit bulk operations
        return results

    try:
        # Get all links at once
        links = Link.query.filter(
            Link.id.in_(link_ids),
            Link.user_id == user_id,
            Link.soft_deleted == False
        ).all()

        for link in links:
            try:
                # Apply updates
                if 'pinned' in updates:
                    link.pinned = bool(updates['pinned'])
                    if link.pinned:
                        link.pinned_at = datetime.utcnow()
                    else:
                        link.pinned_at = None

                if 'starred' in updates:
                    link.starred = bool(updates['starred'])

                if 'folder_id' in updates:
                    # Validate folder exists
                    folder_id = updates['folder_id']
                    if folder_id is not None:
                        from app.models import Folder
                        folder_exists = Folder.query.filter_by(
                            id=folder_id,
                            user_id=user_id,
                            soft_deleted=False
                        ).first()
                        if not folder_exists:
                            results['errors'] += 1
                            continue
                    link.folder_id = folder_id

                if 'archived' in updates:
                    if updates['archived']:
                        link.archived_at = datetime.utcnow()
                        link.pinned = False
                        link.pinned_at = None
                    else:
                        link.archived_at = None

                link.updated_at = datetime.utcnow()
                results['updated'] += 1

            except Exception as e:
                logger.error(f"Error updating link {link.id}: {e}")
                results['errors'] += 1

        db.session.commit()

    except Exception as e:
        logger.error(f"Error in bulk update: {e}")
        db.session.rollback()
        results['errors'] = len(link_ids)

    return results

def get_link_statistics(user_id: str) -> Dict[str, Any]:
    """Get comprehensive link statistics for user"""
    from app.models import Link, Folder, Tag, LinkTag
    from sqlalchemy import func
    from datetime import timedelta

    # Base query
    base_query = Link.query.filter(
        Link.user_id == user_id,
        Link.soft_deleted == False
    )

    # Basic counts
    total_links = base_query.count()
    active_links = base_query.filter(
        Link.archived_at.is_(None),
        Link.is_active == True
    ).count()

    saved_links = base_query.filter(Link.link_type == 'saved').count()
    short_links = base_query.filter(Link.link_type == 'shortened').count()

    # Status counts
    pinned_count = base_query.filter(Link.pinned == True).count()
    starred_count = base_query.filter(Link.starred == True).count()
    frequently_used_count = base_query.filter(Link.frequently_used == True).count()
    archived_count = base_query.filter(Link.archived_at.isnot(None)).count()

    # Time-based stats
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    recent_links = base_query.filter(Link.created_at >= week_ago).count()
    monthly_links = base_query.filter(Link.created_at >= month_ago).count()

    # Short link specific stats
    short_link_query = base_query.filter(Link.link_type == 'shortened')
    total_clicks = short_link_query.with_entities(
        func.sum(Link.click_count)
    ).scalar() or 0

    expired_short_links = short_link_query.filter(
        Link.expires_at.isnot(None),
        Link.expires_at <= now
    ).count()

    # Organization stats
    unassigned_links = base_query.filter(
        Link.folder_id.is_(None),
        Link.archived_at.is_(None)
    ).count()

    tagged_links = base_query.join(LinkTag).distinct().count()

    return {
        'overview': {
            'total_links': total_links,
            'active_links': active_links,
            'saved_links': saved_links,
            'short_links': short_links,
            'total_clicks': total_clicks
        },
        'status': {
            'pinned': pinned_count,
            'starred': starred_count,
            'frequently_used': frequently_used_count,
            'archived': archived_count
        },
        'time_based': {
            'recent_week': recent_links,
            'recent_month': monthly_links
        },
        'organization': {
            'unassigned': unassigned_links,
            'tagged': tagged_links,
            'organization_score': ((total_links - unassigned_links) / max(total_links, 1)) * 100
        },
        'short_links': {
            'total': short_links,
            'total_clicks': total_clicks,
            'expired': expired_short_links,
            'avg_clicks': total_clicks / max(short_links, 1)
        }
    }

# Helper functions

def _validate_url_format(url: str) -> bool:
    """Validate URL format"""
    import re
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE
    )
    return bool(url_pattern.match(url))

def _parse_expiration(expiry_input: str) -> Tuple[Optional[datetime], Optional[str]]:
    """Parse expiration date/time input"""
    try:
        # ISO format
        if 'T' in expiry_input or 'Z' in expiry_input:
            return datetime.fromisoformat(expiry_input.replace('Z', '+00:00')), None
        
        # Relative formats (e.g., "7d", "24h", "1w")
        import re
        match = re.match(r'^(\d+)([hdwmy])$', expiry_input.lower())
        if match:
            amount, unit = int(match.group(1)), match.group(2)
            
            from datetime import timedelta
            if unit == 'h':
                delta = timedelta(hours=amount)
            elif unit == 'd':
                delta = timedelta(days=amount)
            elif unit == 'w':
                delta = timedelta(weeks=amount)
            elif unit == 'm':
                delta = timedelta(days=amount * 30)
            elif unit == 'y':
                delta = timedelta(days=amount * 365)
            else:
                return None, 'Invalid time unit'
            
            expires_at = datetime.utcnow() + delta
            return expires_at, None
        
        return None, 'Invalid expiration format'
        
    except ValueError:
        return None, 'Invalid expiration format'

def _append_utm_parameters(url: str, utm_params: Dict[str, str]) -> str:
    """Append UTM parameters to URL"""
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
    
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)
    
    # Add UTM parameters
    utm_mapping = {
        'source': 'utm_source',
        'medium': 'utm_medium', 
        'campaign': 'utm_campaign',
        'term': 'utm_term',
        'content': 'utm_content'
    }
    
    for key, utm_key in utm_mapping.items():
        if key in utm_params and utm_params[key]:
            query_params[utm_key] = [utm_params[key]]
    
    # Rebuild URL
    new_query = urlencode(query_params, doseq=True)
    return urlunparse(parsed._replace(query=new_query))

def _hash_password(password: str) -> str:
    """Hash password for protection"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def _queue_metadata_extraction(link_id: int):
    """Queue link for metadata extraction"""
    try:
        from app.metadata.service import background_processor
        import asyncio
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(background_processor.queue_link_for_processing(link_id))
        loop.close()
    except Exception as e:
        logger.warning(f"Failed to queue link {link_id} for metadata processing: {e}")