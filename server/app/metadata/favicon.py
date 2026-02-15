# server/app/metadata/favicon.py

import logging
import re
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import aiohttp

logger = logging.getLogger(__name__)

class FaviconService:
    """Advanced favicon extraction and serving service"""
    
    def __init__(self):
        self.icon_sizes = [16, 32, 64, 128, 192, 256, 512]
        self.preferred_formats = ['png', 'ico', 'svg', 'jpg', 'jpeg', 'gif', 'webp']
        
        # Common favicon locations
        self.default_paths = [
            '/favicon.ico',
            '/favicon.png',
            '/apple-touch-icon.png',
            '/apple-touch-icon-precomposed.png'
        ]
        
        # Icon link selectors
        self.icon_selectors = [
            'link[rel="icon"]',
            'link[rel="shortcut icon"]', 
            'link[rel="apple-touch-icon"]',
            'link[rel="apple-touch-icon-precomposed"]',
            'link[rel="mask-icon"]',
            'meta[name="msapplication-TileImage"]'
        ]
    
    async def extract_favicon(self, url: str, html_content: str, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Extract best available favicon for a URL"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            base_url = self._get_base_url(url)
            
            # Find all icon references
            icon_candidates = await self._find_icon_candidates(soup, base_url)
            
            # Test and rank icons
            best_icon = await self._find_best_icon(icon_candidates, session)
            
            if best_icon:
                return {
                    'favicon': best_icon['url'],
                    'favicon_type': best_icon['type'],
                    'favicon_size': best_icon.get('size'),
                    'favicon_format': best_icon.get('format'),
                    'favicon_source': best_icon.get('source', 'parsed')
                }
            
            # Fallback to default favicon
            default_favicon = await self._try_default_favicons(base_url, session)
            if default_favicon:
                return {
                    'favicon': default_favicon['url'],
                    'favicon_type': 'icon',
                    'favicon_source': 'default'
                }
            
            # Final fallback to Google service
            domain = urlparse(url).netloc
            return {
                'favicon': f'https://www.google.com/s2/favicons?domain={domain}&sz=64',
                'favicon_type': 'icon',
                'favicon_source': 'google'
            }
            
        except Exception as e:
            logger.error(f"Error extracting favicon for {url}: {e}")
            # Return Google fallback
            domain = urlparse(url).netloc
            return {
                'favicon': f'https://www.google.com/s2/favicons?domain={domain}&sz=64',
                'favicon_type': 'icon',
                'favicon_source': 'fallback'
            }
    
    async def _find_icon_candidates(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """Find all potential icon candidates from HTML"""
        candidates = []
        
        # Parse icon links
        for selector in self.icon_selectors:
            elements = soup.select(selector)
            for element in elements:
                href = element.get('href') or element.get('content')
                if href:
                    icon_info = self._parse_icon_element(element, href, base_url)
                    if icon_info:
                        candidates.append(icon_info)
        
        # Sort by preference (larger sizes, better formats first)
        candidates.sort(key=lambda x: self._calculate_icon_score(x), reverse=True)
        
        return candidates
    
    def _parse_icon_element(self, element, href: str, base_url: str) -> Optional[Dict[str, Any]]:
        """Parse individual icon element"""
        try:
            # Convert relative URLs
            if href.startswith('//'):
                parsed_base = urlparse(base_url)
                icon_url = f"{parsed_base.scheme}:{href}"
            elif href.startswith('/'):
                icon_url = urljoin(base_url, href)
            elif not href.startswith(('http://', 'https://')):
                icon_url = urljoin(base_url, href)
            else:
                icon_url = href
            
            # Parse icon properties
            rel = element.get('rel', '')
            sizes = element.get('sizes', '')
            type_attr = element.get('type', '')
            
            # Extract size information
            size = self._parse_size(sizes)
            
            # Determine format
            format_type = self._determine_format(icon_url, type_attr)
            
            # Determine icon type
            icon_type = self._determine_icon_type(rel)
            
            return {
                'url': icon_url,
                'type': icon_type,
                'size': size,
                'format': format_type,
                'rel': rel,
                'element': element.name
            }
            
        except Exception as e:
            logger.warning(f"Error parsing icon element: {e}")
            return None
    
    def _parse_size(self, sizes_str: str) -> Optional[int]:
        """Parse size string and return largest dimension"""
        if not sizes_str or sizes_str == 'any':
            return None
        
        # Parse sizes like "16x16", "32x32 64x64", etc.
        size_matches = re.findall(r'(\d+)x(\d+)', sizes_str)
        if size_matches:
            # Return the largest size found
            max_size = max(int(match[0]) for match in size_matches)
            return max_size
        
        return None
    
    def _determine_format(self, url: str, type_attr: str) -> str:
        """Determine icon format from URL or type attribute"""
        # From type attribute
        if type_attr:
            if 'png' in type_attr:
                return 'png'
            elif 'svg' in type_attr:
                return 'svg'
            elif 'jpeg' in type_attr or 'jpg' in type_attr:
                return 'jpg'
            elif 'gif' in type_attr:
                return 'gif'
            elif 'webp' in type_attr:
                return 'webp'
        
        # From URL extension
        url_lower = url.lower()
        if url_lower.endswith('.png'):
            return 'png'
        elif url_lower.endswith('.ico'):
            return 'ico'
        elif url_lower.endswith('.svg'):
            return 'svg'
        elif url_lower.endswith(('.jpg', '.jpeg')):
            return 'jpg'
        elif url_lower.endswith('.gif'):
            return 'gif'
        elif url_lower.endswith('.webp'):
            return 'webp'
        
        return 'unknown'
    
    def _determine_icon_type(self, rel: str) -> str:
        """Determine icon type from rel attribute"""
        rel_lower = rel.lower()
        
        if 'apple-touch-icon' in rel_lower:
            return 'apple-touch-icon'
        elif 'mask-icon' in rel_lower:
            return 'mask-icon'
        elif 'shortcut icon' in rel_lower:
            return 'shortcut-icon'
        elif 'icon' in rel_lower:
            return 'icon'
        
        return 'icon'
    
    def _calculate_icon_score(self, icon: Dict[str, Any]) -> int:
        """Calculate preference score for icon selection"""
        score = 0
        
        # Size preference (64-128px is ideal)
        size = icon.get('size')
        if size:
            if 64 <= size <= 128:
                score += 100
            elif 32 <= size <= 192:
                score += 80
            elif size >= 16:
                score += 60
        else:
            score += 30  # Unknown size gets medium score
        
        # Format preference
        format_type = icon.get('format', '')
        format_scores = {
            'png': 90,
            'svg': 85,
            'ico': 70,
            'webp': 75,
            'jpg': 60,
            'jpeg': 60,
            'gif': 50
        }
        score += format_scores.get(format_type, 40)
        
        # Type preference
        icon_type = icon.get('type', '')
        type_scores = {
            'icon': 90,
            'shortcut-icon': 85,
            'apple-touch-icon': 80,
            'mask-icon': 70
        }
        score += type_scores.get(icon_type, 50)
        
        return score
    
    async def _find_best_icon(self, candidates: List[Dict[str, Any]], session: aiohttp.ClientSession) -> Optional[Dict[str, Any]]:
        """Test candidates and return the best working icon"""
        for candidate in candidates[:5]:  # Test top 5 candidates
            try:
                async with session.head(candidate['url'], timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        content_type = response.headers.get('content-type', '').lower()
                        
                        # Verify it's actually an image
                        if any(img_type in content_type for img_type in ['image/', 'application/octet-stream']):
                            return candidate
                        
            except Exception:
                continue  # Try next candidate
        
        return None
    
    async def _try_default_favicons(self, base_url: str, session: aiohttp.ClientSession) -> Optional[Dict[str, Any]]:
        """Try common default favicon locations"""
        for path in self.default_paths:
            try:
                url = urljoin(base_url, path)
                async with session.head(url, timeout=aiohttp.ClientTimeout(total=3)) as response:
                    if response.status == 200:
                        return {
                            'url': url,
                            'type': 'icon',
                            'source': 'default'
                        }
            except Exception:
                continue
        
        return None
    
    def _get_base_url(self, url: str) -> str:
        """Get base URL for relative path resolution"""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"

def get_favicon_url(url: str, size: int = 64) -> str:
    """Get favicon URL with fallback to Google service"""
    domain = urlparse(url).netloc if url else ''
    return f'https://www.google.com/s2/favicons?domain={domain}&sz={size}'