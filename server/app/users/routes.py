# server/app/users/routes.py

import logging
from flask import request, g
from app.users import users_bp
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.users import service

logger = logging.getLogger(__name__)


def _uid():
    u = g.current_user
    if isinstance(u, dict):
        return u.get('id') or u.get('uid')
    return getattr(u, 'id', getattr(u, 'uid', None))


# ── Profile ──────────────────────────────────────────────────────────

@users_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    profile = service.get_full_profile(_uid())
    if not profile:
        return error_response('User not found', 404)
    return success_response({'profile': profile})


@users_bp.route('/profile', methods=['PUT', 'PATCH'])
@require_auth
def update_profile():
    data = request.get_json()
    if not data:
        return error_response('Invalid body', 400)
    profile, err = service.update_profile(_uid(), data)
    if err:
        return error_response(err, 400)
    return success_response({'profile': profile})


@users_bp.route('/avatar', methods=['PUT'])
@require_auth
def update_avatar():
    data = request.get_json()
    if not data or not data.get('avatar_url'):
        return error_response('avatar_url is required', 400)
    ok = service.update_avatar(_uid(), data['avatar_url'])
    return success_response(message='Avatar updated') if ok else error_response('Update failed', 500)


# ── Preferences ──────────────────────────────────────────────────────

@users_bp.route('/preferences', methods=['GET'])
@require_auth
def get_preferences():
    prefs = service.get_preferences(_uid())
    return success_response({'preferences': prefs})


@users_bp.route('/preferences', methods=['PUT', 'PATCH'])
@require_auth
def update_preferences():
    data = request.get_json()
    if not data:
        return error_response('Invalid body', 400)
    prefs = service.update_preferences(_uid(), data)
    return success_response({'preferences': prefs})


@users_bp.route('/preferences/reset', methods=['POST'])
@require_auth
def reset_preferences():
    prefs = service.reset_preferences(_uid())
    return success_response({'preferences': prefs})


# ── Stats ────────────────────────────────────────────────────────────

@users_bp.route('/stats', methods=['GET'])
@require_auth
def user_stats():
    try:
        days = min(max(1, int(request.args.get('days', 30))), 365)
    except ValueError:
        days = 30
    stats = service.get_user_stats(_uid(), days)
    return success_response({'stats': stats})


# ── Emergency Access ─────────────────────────────────────────────────

@users_bp.route('/emergency', methods=['GET'])
@require_auth
def emergency_status():
    status = service.get_emergency_status(_uid())
    return success_response({'emergency': status})


@users_bp.route('/emergency/enable', methods=['POST'])
@require_auth
def enable_emergency():
    ok = service.enable_emergency_access(_uid())
    return success_response(message='Emergency access enabled') if ok else error_response('Failed', 500)


@users_bp.route('/emergency/disable', methods=['POST'])
@require_auth
def disable_emergency():
    ok = service.disable_emergency_access(_uid())
    return success_response(message='Emergency access disabled') if ok else error_response('Failed', 500)


# ── Account ──────────────────────────────────────────────────────────

@users_bp.route('/export', methods=['GET'])
@require_auth
def export_all_data():
    """Export complete user data as JSON."""
    data = service.export_user_data(_uid())
    return success_response({'export': data})


@users_bp.route('/account', methods=['DELETE'])
@require_auth
def delete_account():
    data = request.get_json() or {}
    confirm = data.get('confirm')
    if confirm != 'DELETE_MY_ACCOUNT':
        return error_response('Must confirm with "DELETE_MY_ACCOUNT"', 400)
    ok = service.delete_account(_uid())
    return success_response(message='Account deleted') if ok else error_response('Deletion failed', 500)