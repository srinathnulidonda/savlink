# server/app/metadata/routes.py

from flask import request, Blueprint
from app.auth.middleware import require_auth
from app.auth.utils import get_current_user_id as uid
from app.responses import success_response, error_response
from app.metadata.service import extract_metadata, refresh_link_metadata, batch_extract
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
        logger.error("Extraction failed for %s: %s", url, e)
        return error_response('Extraction failed', 500)


@metadata_bp.route('/batch', methods=['POST'])
@require_auth
def batch():
    data = request.get_json()
    if not data or not data.get('urls'):
        return error_response('urls[] is required', 400)
    urls = data['urls']
    if not isinstance(urls, list) or len(urls) > 20:
        return error_response('Max 20 URLs per batch', 400)
    results = batch_extract(urls, force_refresh=data.get('force_refresh', False))
    return success_response({'results': results})


@metadata_bp.route('/refresh/<int:link_id>', methods=['POST'])
@require_auth
def refresh(link_id):
    result = refresh_link_metadata(link_id, uid())
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
        preview_fields = {
            'title', 'description', 'image', 'images', 'favicon', 'favicons',
            'domain', 'type', 'content_type', 'site_name', 'author',
            'published_at', 'reading_time_minutes', 'word_count',
            'theme_color', 'locale',
        }
        return success_response({
            'preview': {k: meta.get(k) for k in preview_fields if meta.get(k) is not None}
        })
    except Exception as e:
        logger.error("Preview failed for %s: %s", url, e)
        return error_response('Preview failed', 500)