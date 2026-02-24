# server/app/metadata/routes.py
from flask import request, g, Blueprint
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.metadata.service import extract_metadata, refresh_link_metadata
import logging

logger = logging.getLogger(__name__)

metadata_bp = Blueprint('metadata', __name__)


@metadata_bp.route('/extract', methods=['POST'])
@require_auth
def extract():
    data = request.get_json()
    if not data or not data.get('url'):
        return error_response('URL is required', 400)
    url = data['url'].strip()
    if not url.startswith(('http://', 'https://')):
        return error_response('Invalid URL', 400)
    try:
        meta = extract_metadata(url, force_refresh=data.get('force_refresh', False))
        return success_response({'url': url, 'metadata': meta})
    except Exception as e:
        logger.error("Metadata extraction failed for %s: %s", url, e)
        return error_response('Extraction failed', 500)


@metadata_bp.route('/refresh/<int:link_id>', methods=['POST'])
@require_auth
def refresh(link_id):
    result = refresh_link_metadata(link_id, g.current_user.id)
    if result.get('error'):
        return error_response(result['error'], 404 if 'not found' in result['error'].lower() else 500)
    return success_response(result)


@metadata_bp.route('/preview', methods=['POST'])
@require_auth
def preview():
    data = request.get_json()
    if not data or not data.get('url'):
        return error_response('URL is required', 400)
    url = data['url'].strip()
    if not url.startswith(('http://', 'https://')):
        return error_response('Invalid URL', 400)
    try:
        meta = extract_metadata(url, force_refresh=False)
        return success_response({
            'preview': {k: meta.get(k) for k in
                        ('title', 'description', 'image', 'favicon', 'domain', 'type', 'site_name', 'author')}
        })
    except Exception as e:
        logger.error("Preview failed for %s: %s", url, e)
        return error_response('Preview failed', 500)