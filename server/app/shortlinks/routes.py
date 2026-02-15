# server/app/shortlinks/routes.py

from flask import request, g, jsonify
from flask import Blueprint
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.shortlinks.service import AdvancedShortLinkManager
from app.dashboard.service import serialize_link
import logging

logger = logging.getLogger(__name__)

shortlinks_bp = Blueprint('shortlinks', __name__)

@shortlinks_bp.route('', methods=['POST'])
@require_auth
def create():
    """Create an advanced short link"""
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)
    
    manager = AdvancedShortLinkManager(g.current_user.id)
    link, error = manager.create_advanced_short_link(data)
    
    if error:
        return error_response(error, 400)
    
    return success_response({
        'link': serialize_link(link)
    }, status=201)

@shortlinks_bp.route('/bulk', methods=['POST'])
@require_auth
def bulk_create():
    """Bulk create short links"""
    data = request.get_json()
    if not data or 'links' not in data:
        return error_response('links array is required', 400)
    
    links_data = data.get('links', [])
    if not isinstance(links_data, list):
        return error_response('links must be an array', 400)
    
    manager = AdvancedShortLinkManager(g.current_user.id)
    results = manager.bulk_create_links(links_data)
    
    if 'error' in results:
        return error_response(results['error'], 400)
    
    return success_response(results, status=201)

@shortlinks_bp.route('/<int:link_id>/analytics', methods=['GET'])
@require_auth
def get_analytics(link_id):
    """Get detailed analytics for a short link"""
    try:
        days = int(request.args.get('days', 30))
        days = min(max(1, days), 365)  # 1 day to 1 year
    except ValueError:
        days = 30
    
    manager = AdvancedShortLinkManager(g.current_user.id)
    analytics = manager.get_link_analytics(link_id, days)
    
    if not analytics:
        return error_response('Short link not found', 404)
    
    return success_response({'analytics': analytics})

@shortlinks_bp.route('/<int:link_id>/qr-code', methods=['GET'])
@require_auth
def get_qr_code(link_id):
    """Generate QR code for short link"""
    try:
        size = int(request.args.get('size', 200))
        size = min(max(100, size), 1000)  # 100px to 1000px
    except ValueError:
        size = 200
    
    manager = AdvancedShortLinkManager(g.current_user.id)
    qr_code = manager.generate_qr_code(link_id, size)
    
    if not qr_code:
        return error_response('Short link not found', 404)
    
    return success_response({
        'qr_code': qr_code,
        'size': size
    })

@shortlinks_bp.route('/analytics/summary', methods=['GET'])
@require_auth
def get_analytics_summary():
    """Get analytics summary for all user's short links"""
    try:
        days = int(request.args.get('days', 30))
        days = min(max(1, days), 365)
    except ValueError:
        days = 30
    
    manager = AdvancedShortLinkManager(g.current_user.id)
    summary = manager.get_user_analytics_summary(days)
    
    return success_response({'summary': summary})

@shortlinks_bp.route('/<int:link_id>/extend', methods=['POST'])
@require_auth
def extend_expiry(link_id):
    """Extend short link expiration"""
    data = request.get_json()
    if not data or 'extension' not in data:
        return error_response('extension is required', 400)
    
    extension = data.get('extension')  # e.g., "7d", "24h", "1w"
    
    from app.links.expiration import extend_link_expiry
    from datetime import timedelta
    
    # Parse extension
    try:
        import re
        match = re.match(r'^(\d+)([hdwmy])$', extension.lower())
        if not match:
            return error_response('Invalid extension format (use format like "7d", "24h", "1w")', 400)
        
        amount, unit = int(match.group(1)), match.group(2)
        
        if unit == 'h':
            days = amount / 24
        elif unit == 'd':
            days = amount
        elif unit == 'w':
            days = amount * 7
        elif unit == 'm':
            days = amount * 30
        elif unit == 'y':
            days = amount * 365
        else:
            return error_response('Invalid time unit', 400)
        
        if days > 365 * 5:  # Max 5 years
            return error_response('Extension too long (max 5 years)', 400)
        
        success = extend_link_expiry(g.current_user.id, link_id, int(days))
        
    except ValueError:
        return error_response('Invalid extension format', 400)
    
    if not success:
        return error_response('Short link not found', 404)
    
    return success_response({
        'message': f'Expiration extended by {extension}'
    })

@shortlinks_bp.route('/<int:link_id>/password', methods=['POST'])
@require_auth
def set_password(link_id):
    """Set or update password protection"""
    data = request.get_json()
    password = data.get('password') if data else None
    
    from app.models.link import Link
    link = Link.query.filter_by(
        id=link_id,
        user_id=g.current_user.id,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        return error_response('Short link not found', 404)
    
    if password:
        # Set password
        import hashlib
        link.password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Update metadata
        metadata = link.metadata_ or {}
        metadata['password_protected'] = True
        link.metadata_ = metadata
        
        message = 'Password protection enabled'
    else:
        # Remove password
        link.password_hash = None
        
        metadata = link.metadata_ or {}
        metadata['password_protected'] = False
        link.metadata_ = metadata
        
        message = 'Password protection disabled'
    
    from app.extensions import db
    db.session.commit()
    
    return success_response({'message': message})

@shortlinks_bp.route('/<int:link_id>/click-limit', methods=['POST'])
@require_auth
def set_click_limit(link_id):
    """Set click limit for short link"""
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)
    
    click_limit = data.get('click_limit')
    if click_limit is not None and (not isinstance(click_limit, int) or click_limit < 1):
        return error_response('click_limit must be a positive integer', 400)
    
    from app.models.link import Link
    link = Link.query.filter_by(
        id=link_id,
        user_id=g.current_user.id,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        return error_response('Short link not found', 404)
    
    # Update metadata
    metadata = link.metadata_ or {}
    metadata['click_limit'] = click_limit
    link.metadata_ = metadata
    
    from app.extensions import db
    db.session.commit()
    
    message = f'Click limit set to {click_limit}' if click_limit else 'Click limit removed'
    return success_response({'message': message})

@shortlinks_bp.route('/<int:link_id>', methods=['PUT', 'PATCH'])
@require_auth
def update(link_id):
    """Update short link with enhanced features"""
    data = request.get_json()
    if not data:
        return error_response('Invalid request body', 400)
    
    from app.shortlinks.service import AdvancedShortLinkManager
    manager = AdvancedShortLinkManager(g.current_user.id)
    
    # Use existing update method but enhance it
    from app.models.link import Link
    link = Link.query.filter_by(
        id=link_id,
        user_id=g.current_user.id,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        return error_response('Short link not found', 404)
    
    # Update basic fields
    if 'title' in data:
        link.title = data['title'].strip() if data['title'] else None
    
    if 'notes' in data:
        link.notes = data['notes'].strip() if data['notes'] else None
    
    # Update expiration
    if 'expires_at' in data:
        if data['expires_at']:
            expires_at, error = manager._parse_expiration(data['expires_at'])
            if error:
                return error_response(error, 400)
            link.expires_at = expires_at
        else:
            link.expires_at = None
    
    # Update slug
    if 'slug' in data:
        new_slug = manager._clean_slug(data['slug'])
        if not manager._validate_slug(new_slug):
            return error_response('Invalid slug format', 400)
        if new_slug != link.slug and not is_slug_available(new_slug):
            return error_response('Slug already taken', 400)
        link.slug = new_slug
    
    # Update UTM parameters
    if 'utm_params' in data:
        utm_params = data['utm_params']
        if utm_params:
            # Update original URL with new UTM params
            base_url = link.original_url.split('?')[0]  # Remove existing params
            link.original_url = manager._append_utm_parameters(base_url, utm_params)
        
        # Update metadata
        metadata = link.metadata_ or {}
        metadata['utm_params'] = utm_params
        link.metadata_ = metadata
    
    from datetime import datetime
    from app.extensions import db
    link.updated_at = datetime.utcnow()
    db.session.commit()
    
    return success_response({
        'link': serialize_link(link)
    })

@shortlinks_bp.route('/<int:link_id>/toggle-active', methods=['POST'])
@require_auth
def toggle_active(link_id):
    """Toggle short link active status"""
    from app.shortlinks.service import AdvancedShortLinkManager
    manager = AdvancedShortLinkManager(g.current_user.id)
    
    from app.models.link import Link
    link = Link.query.filter_by(
        id=link_id,
        user_id=g.current_user.id,
        link_type='shortened',
        soft_deleted=False
    ).first()
    
    if not link:
        return error_response('Short link not found', 404)
    
    link.is_active = not link.is_active
    from datetime import datetime
    from app.extensions import db
    link.updated_at = datetime.utcnow()
    db.session.commit()
    
    status = 'activated' if link.is_active else 'deactivated'
    return success_response({
        'message': f'Short link {status}',
        'is_active': link.is_active
    })