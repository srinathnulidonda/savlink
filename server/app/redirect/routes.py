# server/app/redirect/routes.py
import logging
from datetime import datetime
from flask import redirect as flask_redirect, abort, request, jsonify
from app.redirect import redirect_bp
from app.shortlinks.service import ShortLinkManager

logger = logging.getLogger(__name__)


def _client_info():
    ua = request.headers.get('User-Agent', '').lower()
    if 'mobile' in ua or 'android' in ua or 'iphone' in ua:
        device = 'mobile'
    elif 'tablet' in ua or 'ipad' in ua:
        device = 'tablet'
    else:
        device = 'desktop'

    if 'chrome' in ua and 'edge' not in ua:
        browser = 'Chrome'
    elif 'firefox' in ua:
        browser = 'Firefox'
    elif 'safari' in ua:
        browser = 'Safari'
    elif 'edge' in ua:
        browser = 'Edge'
    else:
        browser = 'Other'

    return {
        'ip': request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr),
        'referrer': request.headers.get('Referer', 'Direct'),
        'country': request.headers.get('CF-IPCountry', 'Unknown'),
        'device_type': device,
        'browser': browser,
    }


@redirect_bp.route('/<slug>')
def handle_redirect(slug):
    if not slug or len(slug) > 255:
        abort(404)
    dest = ShortLinkManager.track_click(slug, _client_info())
    if not dest:
        abort(404)
    return flask_redirect(dest, code=302)


@redirect_bp.route('/preview/<slug>')
def preview(slug):
    from app.models import Link
    from app.utils.url import extract_domain, build_favicon_url
    link = Link.query.filter_by(slug=slug, link_type='shortened', soft_deleted=False).first()
    if not link:
        abort(404)
    return jsonify({
        'slug': slug,
        'destination': link.original_url,
        'domain': extract_domain(link.original_url),
        'favicon': build_favicon_url(link.original_url),
        'click_count': link.click_count,
        'is_active': link.is_active,
        'is_expired': bool(link.expires_at and datetime.utcnow() > link.expires_at),
    })