# server/app/shortlinks/routes.py
import re
from flask import request, g, Blueprint
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.shortlinks.service import ShortLinkManager
from app.dashboard.serializers import serialize_link

shortlinks_bp = Blueprint('shortlinks', __name__)


@shortlinks_bp.route('', methods=['POST'])
@require_auth
def create():
    data = request.get_json()
    if not data:
        return error_response('Invalid body', 400)
    mgr = ShortLinkManager(g.current_user.id)
    link, err = mgr.create(data)
    if err:
        return error_response(err, 400)
    return success_response({'link': serialize_link(link)}, status=201)


@shortlinks_bp.route('/bulk', methods=['POST'])
@require_auth
def bulk_create():
    data = request.get_json()
    if not data or not isinstance(data.get('links'), list):
        return error_response('links array required', 400)
    if len(data['links']) > 100:
        return error_response('Max 100 links per batch', 400)
    mgr = ShortLinkManager(g.current_user.id)
    return success_response(mgr.bulk_create(data['links']), status=201)


@shortlinks_bp.route('/<int:link_id>/analytics', methods=['GET'])
@require_auth
def analytics(link_id):
    try:
        days = min(max(1, int(request.args.get('days', 30))), 365)
    except ValueError:
        days = 30
    mgr = ShortLinkManager(g.current_user.id)
    result = mgr.get_analytics(link_id, days)
    if not result:
        return error_response('Not found', 404)
    return success_response({'analytics': result})


@shortlinks_bp.route('/<int:link_id>/extend', methods=['POST'])
@require_auth
def extend_expiry(link_id):
    data = request.get_json()
    ext = data.get('extension') if data else None
    if not ext:
        return error_response('extension is required', 400)
    m = re.match(r'^(\d+)([hdwmy])$', ext.lower())
    if not m:
        return error_response('Invalid format (e.g. 7d, 24h)', 400)
    n, u = int(m.group(1)), m.group(2)
    day_map = {'h': n / 24, 'd': n, 'w': n * 7, 'm': n * 30, 'y': n * 365}
    from app.links.service import extend_link_expiry
    if not extend_link_expiry(g.current_user.id, link_id, int(day_map[u])):
        return error_response('Not found', 404)
    return success_response(message=f'Extended by {ext}')


@shortlinks_bp.route('/<int:link_id>/toggle-active', methods=['POST'])
@require_auth
def toggle_active(link_id):
    from app.links.service import toggle_active as _toggle
    state, err = _toggle(g.current_user.id, link_id)
    if err:
        return error_response(err, 404)
    return success_response({'is_active': state})


@shortlinks_bp.route('/analytics/summary', methods=['GET'])
@require_auth
def summary():
    try:
        days = min(max(1, int(request.args.get('days', 30))), 365)
    except ValueError:
        days = 30
    mgr = ShortLinkManager(g.current_user.id)
    return success_response({'summary': mgr.get_summary(days)})