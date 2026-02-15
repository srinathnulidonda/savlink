# server/app/redirect/routes.py

from flask import redirect as flask_redirect, abort, request, jsonify
from app.redirect import redirect_bp
from app.shortlinks.service import AdvancedShortLinkManager
from app.shortlinks.redirect import resolve_short_link, get_redirect_info
import logging

logger = logging.getLogger(__name__)

@redirect_bp.route('/<slug>')
def handle_redirect(slug):
    """Enhanced redirect handling with analytics tracking"""
    if not slug or len(slug) > 255:
        abort(404)
    
    # Get client info for analytics
    client_info = {
        'ip': request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr),
        'user_agent': request.headers.get('User-Agent', ''),
        'referrer': request.headers.get('Referer', 'Direct'),
        'country': request.headers.get('CF-IPCountry', 'Unknown'),  # Cloudflare header
    }
    
    # Parse device type from user agent (basic)
    user_agent = client_info['user_agent'].lower()
    if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
        client_info['device_type'] = 'mobile'
    elif 'tablet' in user_agent or 'ipad' in user_agent:
        client_info['device_type'] = 'tablet'
    else:
        client_info['device_type'] = 'desktop'
    
    # Parse browser (basic)
    if 'chrome' in user_agent:
        client_info['browser'] = 'Chrome'
    elif 'firefox' in user_agent:
        client_info['browser'] = 'Firefox'
    elif 'safari' in user_agent and 'chrome' not in user_agent:
        client_info['browser'] = 'Safari'
    elif 'edge' in user_agent:
        client_info['browser'] = 'Edge'
    else:
        client_info['browser'] = 'Other'
    
    # Attempt redirect with analytics
    destination = resolve_short_link(slug)
    
    if not destination:
        # Log failed redirect attempt
        logger.warning(f"Failed redirect attempt for slug: {slug} from IP: {client_info['ip']}")
        abort(404)
    
    # Successful redirect
    logger.info(f"Successful redirect: {slug} -> {destination[:80]} from {client_info['device_type']}")
    
    return flask_redirect(destination, code=302)

@redirect_bp.route('/info/<slug>')
def get_link_info(slug):
    """Get information about a short link without redirecting"""
    if not slug or len(slug) > 255:
        abort(404)
    
    info = get_redirect_info(slug)
    
    if not info:
        abort(404)
    
    return jsonify(info)

@redirect_bp.route('/preview/<slug>')
def preview_link(slug):
    """Preview a short link destination"""
    if not slug or len(slug) > 255:
        abort(404)
    
    info = get_redirect_info(slug)
    
    if not info:
        abort(404)
    
    # Return preview information
    from app.utils.url import extract_domain, build_favicon_url
    
    domain = extract_domain(info['destination'])
    
    preview_data = {
        'slug': slug,
        'destination': info['destination'],
        'domain': domain,
        'favicon': build_favicon_url(info['destination']),
        'can_redirect': info['can_redirect'],
        'click_count': info['click_count'],
        'is_expired': info['is_expired'],
        'expires_at': info['expires_at']
    }
    
    return jsonify(preview_data)