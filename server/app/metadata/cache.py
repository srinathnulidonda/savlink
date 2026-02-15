# server/app/metadata/cache.py

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.extensions import redis_client

logger = logging.getLogger(__name__)

class MetadataCache:
    """Metadata caching service with Redis backend"""
    
    def __init__(self):
        self.prefix = "metadata"
        self.default_ttl = 86400 * 7  # 7 days
        self.error_ttl = 3600  # 1 hour for errors
        self.max_cache_size = 1000000  # 1MB max per cached item
    
    async def get_cached_metadata(self, url: str) -> Optional[Dict[str, Any]]:
        """Get cached metadata for URL"""
        if not redis_client.available:
            return None
        
        try:
            cache_key = self._build_cache_key(url)
            cached_json = redis_client.get(cache_key)
            
            if cached_json:
                cached_data = json.loads(cached_json)
                
                # Check if cache is still valid
                cached_at = cached_data.get('cached_at')
                if cached_at:
                    cached_time = datetime.fromisoformat(cached_at)
                    
                    # Different TTLs for successful vs failed extractions
                    if cached_data.get('extraction_success', True):
                        max_age = timedelta(days=7)
                    else:
                        max_age = timedelta(hours=1)
                    
                    if datetime.utcnow() - cached_time < max_age:
                        logger.debug(f"Cache hit for {url}")
                        return cached_data.get('metadata')
                
                # Cache expired, remove it
                redis_client.delete(cache_key)
                
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            logger.warning(f"Error reading cached metadata for {url}: {e}")
            # Remove corrupted cache entry
            cache_key = self._build_cache_key(url)
            redis_client.delete(cache_key)
        
        return None
    
    async def cache_metadata(self, url: str, metadata: Dict[str, Any]) -> bool:
        """Cache metadata for URL"""
        if not redis_client.available:
            return False
        
        try:
            cache_key = self._build_cache_key(url)
            
            # Prepare cache data
            cache_data = {
                'url': url,
                'metadata': metadata,
                'cached_at': datetime.utcnow().isoformat(),
                'cache_version': '1.0'
            }
            
            # Serialize and check size
            cache_json = json.dumps(cache_data, default=str)
            if len(cache_json) > self.max_cache_size:
                logger.warning(f"Metadata too large to cache for {url}")
                return False
            
            # Determine TTL based on extraction success
            ttl = self.default_ttl if metadata.get('extraction_success', True) else self.error_ttl
            
            # Cache the data
            redis_client.setex(cache_key, ttl, cache_json)
            logger.debug(f"Cached metadata for {url}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching metadata for {url}: {e}")
            return False
    
    async def invalidate_cache(self, url: str) -> bool:
        """Invalidate cached metadata for URL"""
        if not redis_client.available:
            return False
        
        try:
            cache_key = self._build_cache_key(url)
            deleted = redis_client.delete(cache_key)
            if deleted:
                logger.info(f"Invalidated cache for {url}")
            return bool(deleted)
        except Exception as e:
            logger.error(f"Error invalidating cache for {url}: {e}")
            return False
    
    async def clear_expired_cache(self) -> int:
        """Clear expired cache entries (maintenance operation)"""
        if not redis_client.available:
            return 0
        
        try:
            # Get all metadata cache keys
            pattern = f"{self.prefix}:*"
            keys = redis_client.keys(pattern)
            
            expired_count = 0
            for key in keys:
                try:
                    cached_json = redis_client.get(key)
                    if cached_json:
                        cached_data = json.loads(cached_json)
                        cached_at = cached_data.get('cached_at')
                        
                        if cached_at:
                            cached_time = datetime.fromisoformat(cached_at)
                            max_age = timedelta(days=30)  # Hard expire after 30 days
                            
                            if datetime.utcnow() - cached_time > max_age:
                                redis_client.delete(key)
                                expired_count += 1
                except Exception:
                    # Remove corrupted entries
                    redis_client.delete(key)
                    expired_count += 1
            
            if expired_count > 0:
                logger.info(f"Cleared {expired_count} expired metadata cache entries")
            
            return expired_count
            
        except Exception as e:
            logger.error(f"Error clearing expired cache: {e}")
            return 0
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get metadata cache statistics"""
        if not redis_client.available:
            return {'available': False}
        
        try:
            pattern = f"{self.prefix}:*"
            keys = redis_client.keys(pattern)
            
            total_entries = len(keys)
            total_size = 0
            successful_entries = 0
            failed_entries = 0
            
            # Sample some entries for stats
            sample_keys = keys[:100]  # Limit sampling for performance
            
            for key in sample_keys:
                try:
                    cached_json = redis_client.get(key)
                    if cached_json:
                        total_size += len(cached_json)
                        cached_data = json.loads(cached_json)
                        
                        if cached_data.get('metadata', {}).get('extraction_success', True):
                            successful_entries += 1
                        else:
                            failed_entries += 1
                except Exception:
                    failed_entries += 1
            
            # Extrapolate to full dataset
            if sample_keys:
                scale_factor = total_entries / len(sample_keys)
                estimated_size = int(total_size * scale_factor)
                estimated_successful = int(successful_entries * scale_factor)
                estimated_failed = int(failed_entries * scale_factor)
            else:
                estimated_size = 0
                estimated_successful = 0
                estimated_failed = 0
            
            return {
                'available': True,
                'total_entries': total_entries,
                'estimated_size_bytes': estimated_size,
                'estimated_successful': estimated_successful,
                'estimated_failed': estimated_failed,
                'success_rate': estimated_successful / max(1, total_entries) * 100
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {'available': False, 'error': str(e)}
    
    def _build_cache_key(self, url: str) -> str:
        """Build cache key for URL"""
        import hashlib
        url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
        return f"{self.prefix}:url:{url_hash}"