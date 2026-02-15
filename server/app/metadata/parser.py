# server/app/metadata/parser.py

import re
import logging
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup, Comment
from datetime import datetime

logger = logging.getLogger(__name__)

class WebPageParser:
    """Advanced web page parser for extracting rich metadata"""
    
    def __init__(self):
        self.max_description_length = 300
        self.max_title_length = 200
        
        # Common social media image selectors
        self.image_selectors = [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
            'meta[property="twitter:image"]',
            'meta[name="thumbnail"]',
            'link[rel="image_src"]',
            'meta[name="msapplication-TileImage"]'
        ]
        
        # Title selectors in order of preference
        self.title_selectors = [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'title',
            'h1'
        ]
        
        # Description selectors
        self.description_selectors = [
            'meta[property="og:description"]',
            'meta[name="twitter:description"]',
            'meta[name="description"]',
            'meta[name="summary"]'
        ]
    
    async def parse_page_metadata(self, html_content: str, url: str) -> Dict[str, Any]:
        """Parse HTML content and extract comprehensive metadata"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove comments and scripts for cleaner parsing
            for comment in soup(text=lambda text: isinstance(text, Comment)):
                comment.extract()
            
            for script in soup(["script", "style"]):
                script.decompose()
            
            metadata = {
                'title': self._extract_title(soup),
                'description': self._extract_description(soup),
                'image': self._extract_image(soup, url),
                'type': self._extract_type(soup),
                'site_name': self._extract_site_name(soup),
                'author': self._extract_author(soup),
                'published_time': self._extract_published_time(soup),
                'keywords': self._extract_keywords(soup),
                'language': self._extract_language(soup),
                'canonical_url': self._extract_canonical_url(soup, url),
                'theme_color': self._extract_theme_color(soup),
                'article_info': self._extract_article_info(soup),
                'video_info': self._extract_video_info(soup),
                'product_info': self._extract_product_info(soup),
                'social_profiles': self._extract_social_profiles(soup),
                'structured_data': self._extract_structured_data(soup)
            }
            
            # Clean and validate metadata
            metadata = self._clean_metadata(metadata)
            
            # Add parsing info
            metadata.update({
                'parser_version': '1.0',
                'parsed_at': datetime.utcnow().isoformat(),
                'url': url,
                'has_rich_metadata': self._has_rich_metadata(metadata)
            })
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error parsing metadata from {url}: {e}")
            return self._get_basic_metadata(url)
    
    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page title with fallbacks"""
        for selector in self.title_selectors:
            element = soup.select_one(selector)
            if element:
                title = element.get('content') if element.name == 'meta' else element.get_text()
                if title:
                    title = self._clean_text(title)
                    if len(title) > 0:
                        return title[:self.max_title_length]
        return None
    
    def _extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page description"""
        for selector in self.description_selectors:
            element = soup.select_one(selector)
            if element:
                description = element.get('content')
                if description:
                    description = self._clean_text(description)
                    if len(description) > 0:
                        return description[:self.max_description_length]
        
        # Fallback: extract from first paragraph
        first_p = soup.find('p')
        if first_p:
            text = first_p.get_text()
            if text:
                text = self._clean_text(text)
                if len(text) > 50:  # Only if substantial content
                    return text[:self.max_description_length]
        
        return None
    
    def _extract_image(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        """Extract main image URL"""
        for selector in self.image_selectors:
            element = soup.select_one(selector)
            if element:
                image_url = element.get('content') or element.get('href')
                if image_url:
                    # Convert relative URLs to absolute
                    if image_url.startswith('//'):
                        parsed_base = urlparse(base_url)
                        image_url = f"{parsed_base.scheme}:{image_url}"
                    elif image_url.startswith('/'):
                        image_url = urljoin(base_url, image_url)
                    elif not image_url.startswith(('http://', 'https://')):
                        image_url = urljoin(base_url, image_url)
                    
                    # Validate image URL
                    if self._is_valid_image_url(image_url):
                        return image_url
        
        # Fallback: look for first large img tag
        for img in soup.find_all('img'):
            src = img.get('src')
            if src:
                src = urljoin(base_url, src)
                if self._is_valid_image_url(src):
                    # Check if image seems substantial (has width/height or is in content area)
                    width = img.get('width')
                    height = img.get('height')
                    if width and height:
                        try:
                            if int(width) >= 200 and int(height) >= 200:
                                return src
                        except (ValueError, TypeError):
                            pass
                    
                    # Check if image is in main content
                    parent_classes = ' '.join(img.get('class', []))
                    if any(keyword in parent_classes.lower() for keyword in ['content', 'article', 'main', 'post']):
                        return src
        
        return None
    
    def _extract_type(self, soup: BeautifulSoup) -> str:
        """Extract content type"""
        og_type = soup.select_one('meta[property="og:type"]')
        if og_type:
            return og_type.get('content', 'website')
        
        # Infer type from content
        if soup.find('article'):
            return 'article'
        elif soup.find('video') or soup.select('[data-video]'):
            return 'video'
        elif soup.select('meta[property*="product"]'):
            return 'product'
        
        return 'website'
    
    def _extract_site_name(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract site name"""
        site_name = soup.select_one('meta[property="og:site_name"]')
        if site_name:
            return self._clean_text(site_name.get('content'))
        
        # Fallback to application name
        app_name = soup.select_one('meta[name="application-name"]')
        if app_name:
            return self._clean_text(app_name.get('content'))
        
        return None
    
    def _extract_author(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract author information"""
        # Try meta tags first
        author_selectors = [
            'meta[name="author"]',
            'meta[property="article:author"]',
            'meta[name="twitter:creator"]'
        ]
        
        for selector in author_selectors:
            element = soup.select_one(selector)
            if element:
                author = element.get('content')
                if author:
                    return self._clean_text(author)
        
        # Try structured data
        author_element = soup.select_one('[rel="author"]')
        if author_element:
            return self._clean_text(author_element.get_text())
        
        return None
    
    def _extract_published_time(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract publication date"""
        time_selectors = [
            'meta[property="article:published_time"]',
            'meta[name="date"]',
            'meta[name="publication_date"]',
            'time[datetime]',
            'time[pubdate]'
        ]
        
        for selector in time_selectors:
            element = soup.select_one(selector)
            if element:
                time_value = element.get('content') or element.get('datetime')
                if time_value:
                    return time_value
        
        return None
    
    def _extract_keywords(self, soup: BeautifulSoup) -> List[str]:
        """Extract keywords/tags"""
        keywords = []
        
        # Meta keywords
        meta_keywords = soup.select_one('meta[name="keywords"]')
        if meta_keywords:
            content = meta_keywords.get('content')
            if content:
                keywords.extend([kw.strip() for kw in content.split(',') if kw.strip()])
        
        # Article tags
        article_tags = soup.select('meta[property="article:tag"]')
        for tag in article_tags:
            content = tag.get('content')
            if content:
                keywords.append(content.strip())
        
        # Clean and deduplicate
        keywords = list(set([kw for kw in keywords if len(kw) > 1]))
        return keywords[:10]  # Limit to 10 keywords
    
    def _extract_language(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page language"""
        html_tag = soup.find('html')
        if html_tag:
            lang = html_tag.get('lang') or html_tag.get('xml:lang')
            if lang:
                return lang
        
        meta_lang = soup.select_one('meta[http-equiv="content-language"]')
        if meta_lang:
            return meta_lang.get('content')
        
        return None
    
    def _extract_canonical_url(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        """Extract canonical URL"""
        canonical = soup.select_one('link[rel="canonical"]')
        if canonical:
            href = canonical.get('href')
            if href:
                return urljoin(base_url, href)
        
        return None
    
    def _extract_theme_color(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract theme color"""
        theme_color = soup.select_one('meta[name="theme-color"]')
        if theme_color:
            color = theme_color.get('content')
            if color and color.startswith('#'):
                return color
        
        return None
    
    def _extract_article_info(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract article-specific metadata"""
        info = {}
        
        # Reading time
        reading_time = soup.select_one('[data-reading-time], .reading-time')
        if reading_time:
            info['reading_time'] = self._clean_text(reading_time.get_text())
        
        # Word count estimate
        article_content = soup.find('article') or soup.find('main') or soup
        if article_content:
            text = article_content.get_text()
            word_count = len(text.split())
            info['estimated_word_count'] = word_count
            if word_count > 0:
                info['estimated_reading_minutes'] = max(1, word_count // 200)
        
        # Article section
        section = soup.select_one('meta[property="article:section"]')
        if section:
            info['section'] = section.get('content')
        
        return info
    
    def _extract_video_info(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract video-specific metadata"""
        info = {}
        
        video_selectors = [
            'meta[property="og:video"]',
            'meta[property="og:video:url"]',
            'meta[property="twitter:player"]'
        ]
        
        for selector in video_selectors:
            element = soup.select_one(selector)
            if element:
                info['video_url'] = element.get('content')
                break
        
        # Video duration
        duration = soup.select_one('meta[property="video:duration"]')
        if duration:
            info['duration'] = duration.get('content')
        
        return info
    
    def _extract_product_info(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract product/ecommerce metadata"""
        info = {}
        
        # Price
        price_selectors = [
            'meta[property="product:price:amount"]',
            '[data-price]',
            '.price',
            '[itemprop="price"]'
        ]
        
        for selector in price_selectors:
            element = soup.select_one(selector)
            if element:
                price = element.get('content') or element.get('data-price') or element.get_text()
                if price:
                    info['price'] = self._clean_text(price)
                    break
        
        # Currency
        currency = soup.select_one('meta[property="product:price:currency"]')
        if currency:
            info['currency'] = currency.get('content')
        
        # Availability
        availability = soup.select_one('[itemprop="availability"]')
        if availability:
            info['availability'] = availability.get('content') or availability.get_text()
        
        return info
    
    def _extract_social_profiles(self, soup: BeautifulSoup) -> List[str]:
        """Extract social media profile links"""
        profiles = []
        
        social_domains = [
            'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
            'youtube.com', 'github.com', 'tiktok.com', 'pinterest.com'
        ]
        
        for link in soup.find_all('a', href=True):
            href = link['href']
            if any(domain in href for domain in social_domains):
                profiles.append(href)
        
        return list(set(profiles))  # Remove duplicates
    
    def _extract_structured_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract JSON-LD structured data"""
        structured_data = {}
        
        scripts = soup.find_all('script', type='application/ld+json')
        for script in scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and '@type' in data:
                    structured_data[data['@type']] = data
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and '@type' in item:
                            structured_data[item['@type']] = item
            except (json.JSONDecodeError, KeyError):
                continue
        
        return structured_data
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ''
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # Remove control characters
        text = ''.join(char for char in text if ord(char) >= 32 or char in '\t\n\r')
        
        return text
    
    def _is_valid_image_url(self, url: str) -> bool:
        """Check if URL looks like a valid image"""
        if not url:
            return False
        
        # Check file extension
        image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp')
        if any(url.lower().endswith(ext) for ext in image_extensions):
            return True
        
        # Check for image in URL path
        if '/image' in url.lower() or 'img' in url.lower():
            return True
        
        return False
    
    def _has_rich_metadata(self, metadata: Dict[str, Any]) -> bool:
        """Check if metadata is rich/comprehensive"""
        required_fields = ['title', 'description', 'image']
        present_fields = sum(1 for field in required_fields if metadata.get(field))
        return present_fields >= 2
    
    def _get_basic_metadata(self, url: str) -> Dict[str, Any]:
        """Get basic fallback metadata"""
        from app.utils.url import extract_domain
        
        domain = extract_domain(url)
        return {
            'title': domain or 'Unknown',
            'description': None,
            'image': None,
            'type': 'website',
            'url': url,
            'extraction_success': False,
            'parser_version': '1.0',
            'parsed_at': datetime.utcnow().isoformat()
        }

    def _clean_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate all metadata fields"""
        cleaned = {}
        
        for key, value in metadata.items():
            if value is None:
                cleaned[key] = None
            elif isinstance(value, str):
                cleaned_value = self._clean_text(value)
                cleaned[key] = cleaned_value if cleaned_value else None
            elif isinstance(value, (list, dict)):
                cleaned[key] = value
            else:
                cleaned[key] = value
        
        return cleaned