# server/app/metadata/routes.py

from flask import request, g, jsonify
from flask import Blueprint
from app.auth.middleware import require_auth
from app.responses import success_response, error_response
from app.metadata.service import (
    get_link_metadata, refresh_link_metadata, 
    background_processor, get_metadata_extractor
)
from app.metadata.cache import MetadataCache
from app.models import Link
import asyncio
import logging

logger = logging.getLogger(__name__)

metadata_bp = Blueprint('metadata', __name__)

@metadata_bp.route('/extract', methods=['POST'])
@require_auth
def extract_metadata():
    """Extract metadata for a URL"""
    data = request.get_json()
    if not data or not data.get('url'):
        return error_response('URL is required', 400)
    
    url = data.get('url').strip()
    force_refresh = data.get('force_refresh', False)
    
    if not url.startswith(('http://', 'https://')):
        return error_response('Invalid URL format', 400)
    
    try:
        metadata = get_link_metadata(url, force_refresh)
        
        return success_response({
            'url': url,
            'metadata': metadata
        })
        
    except Exception as e:
        logger.error(f"Error extracting metadata for {url}: {e}")
        return error_response('Failed to extract metadata', 500)

@metadata_bp.route('/refresh/<int:link_id>', methods=['POST'])
@require_auth
def refresh_metadata(link_id):
    """Refresh metadata for a specific link"""
    result = refresh_link_metadata(link_id, g.current_user.id)
    
    if 'error' in result:
        return error_response(result['error'], 404 if 'not found' in result['error'].lower() else 500)
    
    return success_response(result)

@metadata_bp.route('/batch-refresh', methods=['POST'])
@require_auth
def batch_refresh_metadata():
    """Refresh metadata for multiple links"""
    data = request.get_json()
    if not data or not data.get('link_ids'):
        return error_response('link_ids array is required', 400)
    
    link_ids = data.get('link_ids', [])
    if not isinstance(link_ids, list) or len(link_ids) > 50:
        return error_response('Invalid link_ids (max 50 allowed)', 400)
    
    results = []
    success_count = 0
    
    for link_id in link_ids:
        try:
            result = refresh_link_metadata(int(link_id), g.current_user.id)
            results.append({
                'link_id': link_id,
                'success': 'error' not in result,
                'error': result.get('error')
            })
            if 'error' not in result:
                success_count += 1
        except (ValueError, TypeError):
            results.append({
                'link_id': link_id,
                'success': False,
                'error': 'Invalid link ID'
            })
    
    return success_response({
        'results': results,
        'success_count': success_count,
        'total_count': len(link_ids)
    })

@metadata_bp.route('/process-pending', methods=['POST'])
@require_auth
def process_pending_metadata():
    """Trigger processing of links without metadata"""
    try:
        # Run background processor
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(background_processor.process_pending_links())
        loop.close()
        
        return success_response({'message': 'Processing completed'})
        
    except Exception as e:
        logger.error(f"Error processing pending metadata: {e}")
        return error_response('Failed to process pending metadata', 500)

@metadata_bp.route('/cache/stats', methods=['GET'])
@require_auth
def get_cache_stats():
    """Get metadata cache statistics"""
    try:
        cache = MetadataCache()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stats = loop.run_until_complete(cache.get_cache_stats())
        loop.close()
        
        return success_response({'cache_stats': stats})
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return error_response('Failed to get cache stats', 500)

@metadata_bp.route('/cache/clear', methods=['POST'])
@require_auth
def clear_cache():
    """Clear metadata cache (admin operation)"""
    data = request.get_json()
    url = data.get('url') if data else None
    
    try:
        cache = MetadataCache()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        if url:
            # Clear specific URL
            cleared = loop.run_until_complete(cache.invalidate_cache(url))
            message = f"Cache cleared for {url}" if cleared else f"No cache found for {url}"
        else:
            # Clear expired entries
            cleared_count = loop.run_until_complete(cache.clear_expired_cache())
            message = f"Cleared {cleared_count} expired cache entries"
        
        loop.close()
        
        return success_response({'message': message})
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return error_response('Failed to clear cache', 500)

@metadata_bp.route('/preview', methods=['POST'])
@require_auth  
def preview_url():
    """Get rich preview data for a URL"""
    data = request.get_json()
    if not data or not data.get('url'):
        return error_response('URL is required', 400)
    
    url = data.get('url').strip()
    
    if not url.startswith(('http://', 'https://')):
        return error_response('Invalid URL format', 400)
    
    try:
        # Get metadata
        metadata = get_link_metadata(url, force_refresh=False)
        
        # Build rich preview
        preview = {
            'url': url,
            'title': metadata.get('title'),
            'description': metadata.get('description'),
            'image': metadata.get('image'),
            'favicon': metadata.get('favicon'),
            'domain': metadata.get('domain'),
            'type': metadata.get('type', 'website'),
            'site_name': metadata.get('site_name'),
            'author': metadata.get('author'),
            'published_time': metadata.get('published_time'),
            'theme_color': metadata.get('theme_color')
        }
        
        # Add rich content info
        if metadata.get('article_info'):
            preview['article_info'] = metadata['article_info']
        
        if metadata.get('video_info'):
            preview['video_info'] = metadata['video_info']
        
        if metadata.get('product_info'):
            preview['product_info'] = metadata['product_info']
        
        return success_response({
            'preview': preview,
            'extraction_success': metadata.get('extraction_success', False)
        })
        
    except Exception as e:
        logger.error(f"Error generating preview for {url}: {e}")
        return error_response('Failed to generate preview', 500)

@metadata_bp.route('/links/missing-metadata', methods=['GET'])
@require_auth
def get_links_missing_metadata():
    """Get user's links that are missing metadata"""
    try:
        limit = int(request.args.get('limit', 20))
        limit = min(max(1, limit), 100)
    except ValueError:
        limit = 20
    
    # Find links without metadata
    links = Link.query.filter(
        Link.user_id == g.current_user.id,
        Link.soft_deleted == False,
        Link.archived_at.is_(None),
        Link.metadata_.is_(None) | 
        ~Link.metadata_.has_key('page_metadata')
    ).order_by(Link.created_at.desc()).limit(limit).all()
    
    # Serialize minimal link info
    link_data = []
    for link in links:
        link_data.append({
            'id': link.id,
            'original_url': link.original_url,
            'title': link.title,
            'created_at': link.created_at.isoformat() if link.created_at else None
        })
    
    return success_response({
        'links': link_data,
        'count': len(link_data)
    })