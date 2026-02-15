# server/app/metadata/service.py

import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from urllib.parse import urljoin, urlparse
from app.extensions import db, redis_client
from app.models import Link
from app.metadata.parser import WebPageParser
from app.metadata.favicon import FaviconService
from app.metadata.cache import MetadataCache
from app.utils.url import extract_domain
import json

logger = logging.getLogger(__name__)

class MetadataExtractor:
    """Advanced metadata extraction service with caching and rate limiting"""
    
    def __init__(self):
        self.parser = WebPageParser()
        self.favicon_service = FaviconService()
        self.cache = MetadataCache()
        self.session = None
        self.rate_limits = {}  # Domain-based rate limiting
        self.max_concurrent = 10
        self.timeout = aiohttp.ClientTimeout(total=15, connect=5)
        
        # Headers to mimic a real browser
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive'
        }
    
    async def extract_metadata(self, url: str, force_refresh: bool = False) -> Dict[str, Any]:
        """Extract comprehensive metadata for a URL"""
        domain = extract_domain(url)
        
        # Check cache first
        if not force_refresh:
            cached = await self.cache.get_cached_metadata(url)
            if cached:
                logger.debug(f"Using cached metadata for {url}")
                return cached
        
        # Check rate limiting
        if not self._check_rate_limit(domain):
            logger.warning(f"Rate limited for domain: {domain}")
            return self._get_fallback_metadata(url)
        
        try:
            if not self.session:
                await self._create_session()
            
            # Fetch page content
            async with self.session.get(url, headers=self.headers, timeout=self.timeout) as response:
                if response.status != 200:
                    logger.warning(f"HTTP {response.status} for {url}")
                    return self._get_fallback_metadata(url)
                
                content = await response.text()
                final_url = str(response.url)  # Handle redirects
                
                # Parse metadata
                metadata = await self.parser.parse_page_metadata(content, final_url)
                
                # Get favicon
                favicon_data = await self.favicon_service.extract_favicon(final_url, content, self.session)
                metadata.update(favicon_data)
                
                # Add extraction metadata
                metadata.update({
                    'extracted_at': datetime.utcnow().isoformat(),
                    'original_url': url,
                    'final_url': final_url,
                    'status_code': response.status,
                    'content_type': response.headers.get('content-type', ''),
                    'extraction_success': True
                })
                
                # Cache the results
                await self.cache.cache_metadata(url, metadata)
                
                logger.info(f"Successfully extracted metadata for {url}")
                return metadata
                
        except asyncio.TimeoutError:
            logger.warning(f"Timeout extracting metadata for {url}")
            return self._get_fallback_metadata(url, error='timeout')
        except Exception as e:
            logger.error(f"Error extracting metadata for {url}: {e}")
            return self._get_fallback_metadata(url, error=str(e))
    
    async def extract_multiple_metadata(self, urls: List[str], force_refresh: bool = False) -> Dict[str, Dict[str, Any]]:
        """Extract metadata for multiple URLs concurrently"""
        if not urls:
            return {}
        
        # Limit concurrent requests
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def extract_with_semaphore(url):
            async with semaphore:
                return url, await self.extract_metadata(url, force_refresh)
        
        # Process URLs in batches
        tasks = [extract_with_semaphore(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        metadata_map = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Error in batch metadata extraction: {result}")
                continue
            
            url, metadata = result
            metadata_map[url] = metadata
        
        return metadata_map
    
    def _check_rate_limit(self, domain: str) -> bool:
        """Check if domain is rate limited"""
        now = datetime.utcnow()
        
        if domain not in self.rate_limits:
            self.rate_limits[domain] = []
        
        # Clean old entries (last hour)
        cutoff = now - timedelta(hours=1)
        self.rate_limits[domain] = [
            timestamp for timestamp in self.rate_limits[domain]
            if timestamp > cutoff
        ]
        
        # Check if under limit (max 60 requests per hour per domain)
        if len(self.rate_limits[domain]) >= 60:
            return False
        
        # Add current request
        self.rate_limits[domain].append(now)
        return True
    
    def _get_fallback_metadata(self, url: str, error: Optional[str] = None) -> Dict[str, Any]:
        """Get fallback metadata when extraction fails"""
        domain = extract_domain(url)
        
        return {
            'title': domain or 'Unknown',
            'description': None,
            'image': None,
            'favicon': f'https://www.google.com/s2/favicons?domain={domain}&sz=64' if domain else None,
            'domain': domain,
            'original_url': url,
            'final_url': url,
            'extraction_success': False,
            'extraction_error': error,
            'extracted_at': datetime.utcnow().isoformat(),
            'type': 'website'
        }
    
    async def _create_session(self):
        """Create aiohttp session with optimized settings"""
        connector = aiohttp.TCPConnector(
            limit=100,
            limit_per_host=10,
            ttl_dns_cache=300,
            use_dns_cache=True,
            enable_cleanup_closed=True
        )
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=self.timeout,
            headers=self.headers
        )
    
    async def close(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()

# Global extractor instance
_extractor = None

async def get_metadata_extractor() -> MetadataExtractor:
    """Get or create global metadata extractor"""
    global _extractor
    if _extractor is None:
        _extractor = MetadataExtractor()
    return _extractor

def get_link_metadata(url: str, force_refresh: bool = False) -> Dict[str, Any]:
    """Synchronous wrapper for metadata extraction"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    async def extract():
        extractor = await get_metadata_extractor()
        return await extractor.extract_metadata(url, force_refresh)
    
    return loop.run_until_complete(extract())

def refresh_link_metadata(link_id: int, user_id: str) -> Dict[str, Any]:
    """Refresh metadata for a specific link"""
    link = Link.query.filter_by(
        id=link_id,
        user_id=user_id,
        soft_deleted=False
    ).first()
    
    if not link:
        return {'error': 'Link not found'}
    
    try:
        # Extract fresh metadata
        metadata = get_link_metadata(link.original_url, force_refresh=True)
        
        # Update link metadata
        link.metadata_ = link.metadata_ or {}
        link.metadata_.update({
            'page_metadata': metadata,
            'metadata_refreshed_at': datetime.utcnow().isoformat()
        })
        
        # Update title if empty and we got one
        if not link.title and metadata.get('title'):
            link.title = metadata['title'][:500]  # Respect column limit
        
        db.session.commit()
        
        logger.info(f"Refreshed metadata for link {link_id}")
        return {'success': True, 'metadata': metadata}
        
    except Exception as e:
        logger.error(f"Error refreshing metadata for link {link_id}: {e}")
        return {'error': str(e)}

class BackgroundMetadataProcessor:
    """Background processor for metadata extraction"""
    
    def __init__(self):
        self.extractor = MetadataExtractor()
        self.processing = False
        self.queue_key = "metadata:processing_queue"
        self.batch_size = 10
    
    async def process_pending_links(self):
        """Process links that need metadata extraction"""
        if self.processing:
            logger.info("Metadata processing already running")
            return
        
        self.processing = True
        
        try:
            # Get links without metadata
            links_without_metadata = Link.query.filter(
                Link.soft_deleted == False,
                Link.metadata_.is_(None) | 
                ~Link.metadata_.has_key('page_metadata')  # PostgreSQL specific
            ).limit(self.batch_size).all()
            
            if not links_without_metadata:
                logger.debug("No links need metadata processing")
                return
            
            # Extract URLs
            urls = [link.original_url for link in links_without_metadata]
            
            # Process in batch
            metadata_map = await self.extractor.extract_multiple_metadata(urls)
            
            # Update links
            for link in links_without_metadata:
                metadata = metadata_map.get(link.original_url)
                if metadata:
                    link.metadata_ = link.metadata_ or {}
                    link.metadata_['page_metadata'] = metadata
                    
                    # Auto-fill title if empty
                    if not link.title and metadata.get('title'):
                        link.title = metadata['title'][:500]
            
            db.session.commit()
            logger.info(f"Processed metadata for {len(links_without_metadata)} links")
            
        except Exception as e:
            logger.error(f"Error in background metadata processing: {e}")
            db.session.rollback()
        finally:
            self.processing = False
    
    async def queue_link_for_processing(self, link_id: int):
        """Queue a link for metadata processing"""
        if redis_client.available:
            redis_client.sadd(self.queue_key, link_id)

# Background processor instance
background_processor = BackgroundMetadataProcessor()