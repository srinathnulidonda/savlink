# server/app/dashboard/service.py

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.models import Link, Folder, Tag
from app.utils.time import relative_time
from app.utils.url import extract_display_url, build_favicon_url, extract_domain
from app.utils.base_url import get_base_url, get_short_link_url
from app.links.tagging import get_link_tags
from app.extensions import redis_client
import json
import logging

logger = logging.getLogger(__name__)

class EnhancedLinkSerializer:
    """Enhanced link serialization with rich metadata and smart features"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.base_url = get_base_url()
        self._domain_cache = {}
        self._tag_cache = {}
    
    def serialize_link(self, link: Link, include_analytics: bool = False, include_preview: bool = True) -> Dict[str, Any]:
        """Enhanced link serialization with comprehensive metadata"""
        
        # Basic link data
        data = {
            'id': link.id,
            'title': link.title or self._generate_smart_title(link),
            'original_url': link.original_url,
            'display_url': extract_display_url(link.original_url),
            'link_type': link.link_type,
            'is_active': link.is_active,
            'created_at': link.created_at.isoformat() if link.created_at else None,
            'updated_at': link.updated_at.isoformat() if link.updated_at else None,
            'relative_time': relative_time(link.created_at)
        }
        
        # Status flags
        data.update({
            'pinned': link.pinned,
            'pinned_at': link.pinned_at.isoformat() if link.pinned_at else None,
            'starred': getattr(link, 'starred', False),
            'frequently_used': getattr(link, 'frequently_used', False),
            'archived': link.archived_at is not None,
            'archived_at': link.archived_at.isoformat() if link.archived_at else None
        })
        
        # Folder information
        if link.folder_id:
            data['folder_id'] = link.folder_id
            if hasattr(link, 'folder') and link.folder:
                data['folder'] = {
                    'id': link.folder.id,
                    'name': link.folder.name,
                    'color': link.folder.color,
                    'icon': link.folder.icon
                }
        else:
            data['folder_id'] = None
            data['folder'] = None
        
        # Short link specific data
        if link.link_type == 'shortened':
            data.update(self._serialize_short_link_data(link))
        
        # Notes handling
        if link.notes:
            notes_preview = link.notes[:120].strip()
            if len(link.notes) > 120:
                notes_preview += '...'
            data.update({
                'notes': link.notes,
                'notes_preview': notes_preview,
                'has_notes': True
            })
        else:
            data.update({
                'notes': None,
                'notes_preview': None,
                'has_notes': False
            })
        
        # Preview data with enhanced metadata
        if include_preview:
            data['preview'] = self._build_enhanced_preview_data(link)
        
        # Tags with caching
        data['tags'] = self._get_cached_link_tags(link)
        
        # Analytics for short links
        if include_analytics and link.link_type == 'shortened':
            data['analytics'] = self._get_link_analytics_summary(link)
        
        # Smart metadata and scoring
        data['metadata'] = self._build_smart_metadata(link)
        
        # Performance indicators
        data['performance'] = self._calculate_performance_metrics(link)
        
        return data
    
    def _generate_smart_title(self, link: Link) -> str:
        """Generate smart title from URL or metadata"""
        # First try extracted metadata
        if link.metadata_ and 'page_metadata' in link.metadata_:
            metadata_title = link.metadata_['page_metadata'].get('title')
            if metadata_title:
                return metadata_title
        
        # Fallback to display URL
        return extract_display_url(link.original_url)
    
    def _serialize_short_link_data(self, link: Link) -> Dict[str, Any]:
        """Serialize short link specific data with enhanced features"""
        data = {
            'slug': link.slug,
            'short_url': get_short_link_url(link.slug) if link.slug else None,
            'click_count': link.click_count,
            'expires_at': link.expires_at.isoformat() if link.expires_at else None,
            'is_expired': link.expires_at and datetime.utcnow() > link.expires_at,
            'is_password_protected': bool(getattr(link, 'password_hash', None))
        }
        
        # Enhanced metadata from link metadata
        metadata = link.metadata_ or {}
        
        # Click limit information
        if metadata.get('click_limit'):
            data.update({
                'click_limit': metadata['click_limit'],
                'click_limit_reached': link.click_count >= metadata['click_limit'],
                'clicks_remaining': max(0, metadata['click_limit'] - link.click_count)
            })
        
        # UTM parameters
        if metadata.get('utm_params'):
            data['utm_params'] = metadata['utm_params']
        
        # Targeting information
        if metadata.get('geo_targeting'):
            data['geo_targeting'] = metadata['geo_targeting']
        
        if metadata.get('device_targeting'):
            data['device_targeting'] = metadata['device_targeting']
        
        # Performance metrics for short links
        if link.click_count > 0:
            # Calculate click rate (clicks per day since creation)
            if link.created_at:
                days_active = max(1, (datetime.utcnow() - link.created_at).days)
                data['daily_click_rate'] = round(link.click_count / days_active, 2)
            
            # Performance tier
            data['performance_tier'] = self._get_performance_tier(link.click_count)
        
        return data
    
    def _build_enhanced_preview_data(self, link: Link) -> Dict[str, Any]:
        """Build enhanced preview data with extracted metadata"""
        domain = extract_domain(link.original_url)
        
        # Get page metadata if available
        page_metadata = {}
        if link.metadata_ and 'page_metadata' in link.metadata_:
            page_metadata = link.metadata_['page_metadata']
        
        # Build base preview
        preview = {
            'domain': domain,
            'domain_info': self._get_enhanced_domain_info(domain)
        }
        
        # Enhanced favicon handling
        if page_metadata.get('favicon'):
            preview['favicon'] = page_metadata['favicon']
            preview['favicon_type'] = page_metadata.get('favicon_type', 'icon')
            preview['favicon_source'] = page_metadata.get('favicon_source', 'extracted')
        else:
            preview['favicon'] = build_favicon_url(link.original_url)
            preview['favicon_type'] = 'icon'
            preview['favicon_source'] = 'google'
        
        # Preview image with metadata
        if page_metadata.get('image'):
            preview.update({
                'image': page_metadata['image'],
                'has_preview_image': True,
                'image_type': 'extracted'
            })
        else:
            preview.update({
                'image': None,
                'has_preview_image': False,
                'image_type': None
            })
        
        # Rich metadata from extraction
        if page_metadata:
            preview.update({
                'site_name': page_metadata.get('site_name'),
                'author': page_metadata.get('author'),
                'published_time': page_metadata.get('published_time'),
                'theme_color': page_metadata.get('theme_color'),
                'content_type': page_metadata.get('type', 'website'),
                'language': page_metadata.get('language'),
                'keywords': page_metadata.get('keywords', [])[:5],  # Limit keywords
                'has_rich_metadata': page_metadata.get('has_rich_metadata', False),
                'extraction_success': page_metadata.get('extraction_success', False)
            })
            
            # Article-specific enhanced data
            if page_metadata.get('article_info'):
                article_info = page_metadata['article_info']
                preview['article_info'] = {
                    'reading_time': article_info.get('reading_time'),
                    'estimated_reading_minutes': article_info.get('estimated_reading_minutes'),
                    'word_count': article_info.get('estimated_word_count'),
                    'section': article_info.get('section')
                }
            
            # Video-specific data
            if page_metadata.get('video_info'):
                preview['video_info'] = page_metadata['video_info']
            
            # Product-specific data
            if page_metadata.get('product_info'):
                preview['product_info'] = page_metadata['product_info']
            
            # Social profiles
            if page_metadata.get('social_profiles'):
                preview['social_profiles'] = page_metadata['social_profiles'][:3]  # Limit to 3
        
        # Enhanced categorization
        preview['category'] = self._categorize_link_with_metadata(link, page_metadata)
        preview['category_confidence'] = self._get_categorization_confidence(link, page_metadata)
        
        # Content quality indicators
        preview['content_quality'] = self._assess_content_quality(link, page_metadata)
        
        return preview
    
    def _get_enhanced_domain_info(self, domain: str) -> Dict[str, Any]:
        """Get enhanced domain information with caching"""
        if not domain:
            return {}
        
        # Use cache to avoid repeated lookups
        if domain in self._domain_cache:
            return self._domain_cache[domain]
        
        # Enhanced domain categorization
        domain_info = {
            'is_social': domain in [
                'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com',
                'youtube.com', 'tiktok.com', 'reddit.com', 'discord.com',
                'snapchat.com', 'pinterest.com', 'tumblr.com'
            ],
            'is_dev': domain in [
                'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 
                'developer.mozilla.org', 'docs.microsoft.com', 'nodejs.org', 
                'python.org', 'reactjs.org', 'vuejs.org', 'angular.io'
            ],
            'is_news': domain in [
                'cnn.com', 'bbc.com', 'reuters.com', 'bloomberg.com',
                'techcrunch.com', 'theverge.com', 'ycombinator.com',
                'nytimes.com', 'washingtonpost.com', 'guardian.com'
            ],
            'is_shopping': domain in [
                'amazon.com', 'ebay.com', 'etsy.com', 'shopify.com',
                'stripe.com', 'paypal.com', 'aliexpress.com', 'walmart.com'
            ],
            'is_media': domain in [
                'youtube.com', 'vimeo.com', 'twitch.tv', 'spotify.com',
                'soundcloud.com', 'netflix.com', 'imgur.com', 'flickr.com'
            ],
            'is_productivity': domain in [
                'notion.so', 'google.com', 'microsoft.com', 'dropbox.com',
                'slack.com', 'trello.com', 'asana.com', 'figma.com'
            ]
        }
        
        # Add trust indicators
        domain_info['trust_level'] = self._assess_domain_trust(domain)
        
        # Cache for future use
        self._domain_cache[domain] = domain_info
        return domain_info
    
    def _assess_domain_trust(self, domain: str) -> str:
        """Assess domain trustworthiness"""
        high_trust_domains = [
            'github.com', 'google.com', 'microsoft.com', 'mozilla.org',
            'w3.org', 'wikipedia.org', 'stackoverflow.com', 'medium.com'
        ]
        
        suspicious_patterns = [
            'bit.ly', 'tinyurl.com', 't.co', 'goo.gl'  # URL shorteners
        ]
        
        if domain in high_trust_domains:
            return 'high'
        elif any(pattern in domain for pattern in suspicious_patterns):
            return 'low'
        elif domain.count('.') > 2 or len(domain) > 30:
            return 'medium'
        else:
            return 'medium'
    
    def _categorize_link_with_metadata(self, link: Link, metadata: Dict[str, Any]) -> Optional[str]:
        """Enhanced categorization using extracted metadata"""
        # Use extracted type if available and specific
        extracted_type = metadata.get('type')
        if extracted_type and extracted_type not in ['website', 'object']:
            return extracted_type
        
        # Check structured data
        structured_data = metadata.get('structured_data', {})
        if 'VideoObject' in structured_data:
            return 'video'
        elif 'Article' in structured_data or 'BlogPosting' in structured_data:
            return 'article'
        elif 'Product' in structured_data:
            return 'product'
        elif 'Recipe' in structured_data:
            return 'recipe'
        elif 'Event' in structured_data:
            return 'event'
        elif 'SoftwareApplication' in structured_data:
            return 'app'
        
        # Enhanced keyword analysis
        keywords = metadata.get('keywords', [])
        keyword_str = ' '.join(keywords).lower()
        title = (link.title or '').lower()
        url = link.original_url.lower()
        combined_text = f"{keyword_str} {title} {url}"
        
        # More sophisticated categorization
        category_patterns = {
            'tutorial': ['tutorial', 'guide', 'howto', 'learn', 'course', 'lesson'],
            'documentation': ['docs', 'documentation', 'api', 'reference', 'manual'],
            'news': ['news', 'breaking', 'update', 'announcement', 'press'],
            'blog': ['blog', 'post', 'article', 'story', 'opinion'],
            'tool': ['tool', 'app', 'service', 'platform', 'utility', 'software'],
            'video': ['video', 'watch', 'youtube', 'vimeo', 'streaming'],
            'social': ['social', 'community', 'forum', 'discussion', 'chat'],
            'shopping': ['shop', 'buy', 'store', 'product', 'price', 'cart'],
            'research': ['research', 'study', 'paper', 'academic', 'journal'],
            'entertainment': ['game', 'fun', 'entertainment', 'movie', 'music']
        }
        
        for category, patterns in category_patterns.items():
            if any(pattern in combined_text for pattern in patterns):
                return category
        
        # Fallback to domain-based categorization
        domain = extract_domain(link.original_url)
        if domain:
            domain_info = self._get_enhanced_domain_info(domain)
            if domain_info.get('is_dev'):
                return 'development'
            elif domain_info.get('is_social'):
                return 'social'
            elif domain_info.get('is_news'):
                return 'news'
            elif domain_info.get('is_shopping'):
                return 'shopping'
            elif domain_info.get('is_media'):
                return 'media'
        
        return None
    
    def _get_categorization_confidence(self, link: Link, metadata: Dict[str, Any]) -> float:
        """Calculate confidence in categorization"""
        confidence = 0.0
        
        # High confidence from structured data
        if metadata.get('structured_data'):
            confidence += 0.8
        
        # Medium confidence from extracted metadata
        if metadata.get('type') and metadata['type'] != 'website':
            confidence += 0.6
        
        # Keywords provide some confidence
        if metadata.get('keywords'):
            confidence += 0.3
        
        # Title matching provides confidence
        if link.title:
            confidence += 0.2
        
        return min(1.0, confidence)
    
    def _assess_content_quality(self, link: Link, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Assess content quality indicators"""
        quality = {
            'score': 0,
            'indicators': []
        }
        
        # Rich metadata indicates quality
        if metadata.get('has_rich_metadata'):
            quality['score'] += 30
            quality['indicators'].append('Rich metadata')
        
        # Author information
        if metadata.get('author'):
            quality['score'] += 15
            quality['indicators'].append('Has author')
        
        # Publication date
        if metadata.get('published_time'):
            quality['score'] += 10
            quality['indicators'].append('Has publication date')
        
        # High-quality image
        if metadata.get('image'):
            quality['score'] += 20
            quality['indicators'].append('Has preview image')
        
        # Structured content
        if metadata.get('structured_data'):
            quality['score'] += 15
            quality['indicators'].append('Structured content')
        
        # Domain trust
        domain = extract_domain(link.original_url)
        if domain:
            trust_level = self._assess_domain_trust(domain)
            if trust_level == 'high':
                quality['score'] += 20
                quality['indicators'].append('Trusted domain')
        
        # Reading time indicates substantial content
        article_info = metadata.get('article_info', {})
        if article_info.get('estimated_reading_minutes', 0) > 2:
            quality['score'] += 10
            quality['indicators'].append('Substantial content')
        
        quality['score'] = min(100, quality['score'])
        return quality
    
    def _get_cached_link_tags(self, link: Link) -> List[Dict[str, Any]]:
        """Get link tags with caching"""
        cache_key = f"tags:{link.id}"
        
        if cache_key in self._tag_cache:
            return self._tag_cache[cache_key]
        
        try:
            tags = get_link_tags(link.id, link.user_id)
            tag_data = [{
                'id': tag.id,
                'name': tag.name,
                'color': tag.color
            } for tag in tags]
            
            self._tag_cache[cache_key] = tag_data
            return tag_data
            
        except Exception as e:
            logger.warning(f"Failed to get tags for link {link.id}: {e}")
            return []
    
    def _get_link_analytics_summary(self, link: Link) -> Optional[Dict[str, Any]]:
        """Get basic analytics summary for short links"""
        if not redis_client.available or link.link_type != 'shortened':
            return None
        
        try:
            analytics_key = f"shortlinks:{self.user_id}:analytics:{link.id}"
            analytics_json = redis_client.get(analytics_key)
            
            if analytics_json:
                analytics = json.loads(analytics_json)
                
                return {
                    'total_clicks': analytics.get('total_clicks', link.click_count),
                    'unique_clicks': analytics.get('unique_clicks', 0),
                    'top_country': self._get_top_item(analytics.get('countries', {})),
                    'top_device': self._get_top_item(analytics.get('devices', {})),
                    'top_referrer': self._get_top_item(analytics.get('referrers', {})),
                    'last_clicked': analytics.get('last_clicked'),
                    'click_rate': self._calculate_click_rate(link, analytics)
                }
        except Exception as e:
            logger.warning(f"Failed to get analytics for link {link.id}: {e}")
        
        return None
    
    def _calculate_click_rate(self, link: Link, analytics: Dict[str, Any]) -> Optional[float]:
        """Calculate click rate (clicks per day)"""
        if not link.created_at:
            return None
        
        days_active = max(1, (datetime.utcnow() - link.created_at).days)
        total_clicks = analytics.get('total_clicks', link.click_count)
        
        return round(total_clicks / days_active, 2)
    
    def _get_top_item(self, data: Dict[str, int]) -> Optional[str]:
        """Get the top item from a count dictionary"""
        if not data:
            return None
        return max(data.items(), key=lambda x: x[1])[0]
    
    def _get_performance_tier(self, click_count: int) -> str:
        """Get performance tier for short links"""
        if click_count >= 100:
            return 'high'
        elif click_count >= 10:
            return 'medium'
        elif click_count >= 1:
            return 'low'
        return 'none'
    
    def _build_smart_metadata(self, link: Link) -> Dict[str, Any]:
        """Build comprehensive smart metadata"""
        metadata = {
            'age_days': (datetime.utcnow() - link.created_at).days if link.created_at else None,
            'is_recent': link.created_at and (datetime.utcnow() - link.created_at).days <= 7,
            'has_activity': link.updated_at and link.updated_at > link.created_at + timedelta(seconds=1),
            'last_accessed': link.updated_at.isoformat() if link.updated_at else None
        }
        
        # Performance indicators for short links
        if link.link_type == 'shortened':
            metadata.update({
                'performance_tier': self._get_performance_tier(link.click_count),
                'engagement_score': self._calculate_engagement_score(link),
                'is_viral': link.click_count > 50,
                'click_velocity': self._calculate_click_velocity(link)
            })
        
        # Organization indicators
        metadata.update({
            'organization_score': self._calculate_organization_score(link),
            'has_metadata': bool(link.metadata_ and 'page_metadata' in link.metadata_),
            'completeness_score': self._calculate_completeness_score(link)
        })
        
        return metadata
    
    def _calculate_engagement_score(self, link: Link) -> float:
        """Calculate comprehensive engagement score"""
        score = 0.0
        
        # Click-based score
        if link.click_count > 0:
            score += min(50, link.click_count * 2)
        
        # Recency boost
        if link.updated_at:
            days_old = (datetime.utcnow() - link.updated_at).days
            if days_old <= 7:
                score += 20 * (1 - days_old / 7)
        
        # Status boosts
        if link.pinned:
            score += 20
        if getattr(link, 'starred', False):
            score += 15
        if getattr(link, 'frequently_used', False):
            score += 10
        
        # Organization boost
        if link.folder_id:
            score += 5
        
        return min(100.0, score)
    
    def _calculate_click_velocity(self, link: Link) -> Optional[float]:
        """Calculate click velocity (clicks per day since creation)"""
        if not link.created_at or link.click_count == 0:
            return 0.0
        
        days_since_creation = max(1, (datetime.utcnow() - link.created_at).days)
        return round(link.click_count / days_since_creation, 2)
    
    def _calculate_organization_score(self, link: Link) -> float:
        """Calculate how well organized a link is"""
        score = 0.0
        
        # Has meaningful title
        if link.title:
            score += 25
        
        # Has notes
        if link.notes:
            score += 20
        
        # In folder
        if link.folder_id:
            score += 30
        
        # Has tags
        try:
            tags = self._get_cached_link_tags(link)
            if tags:
                score += min(25, len(tags) * 8)
        except:
            pass
        
        return min(100.0, score)
    
    def _calculate_completeness_score(self, link: Link) -> float:
        """Calculate how complete the link information is"""
        score = 0.0
        
        # Basic information
        if link.title:
            score += 20
        if link.notes:
            score += 15
        
        # Metadata presence
        if link.metadata_:
            score += 20
            if link.metadata_.get('page_metadata'):
                page_meta = link.metadata_['page_metadata']
                if page_meta.get('description'):
                    score += 15
                if page_meta.get('image'):
                    score += 15
                if page_meta.get('author'):
                    score += 10
                if page_meta.get('keywords'):
                    score += 5
        
        return min(100.0, score)
    
    def _calculate_performance_metrics(self, link: Link) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics"""
        metrics = {
            'engagement_score': self._calculate_engagement_score(link),
            'organization_score': self._calculate_organization_score(link),
            'completeness_score': self._calculate_completeness_score(link)
        }
        
        # Overall quality score (weighted average)
        weights = {
            'engagement_score': 0.4,
            'organization_score': 0.3,
            'completeness_score': 0.3
        }
        
        overall_score = sum(
            metrics[key] * weights[key] 
            for key in weights
        )
        
        metrics['overall_score'] = round(overall_score, 1)
        metrics['quality_tier'] = self._get_quality_tier(overall_score)
        
        return metrics
    
    def _get_quality_tier(self, score: float) -> str:
        """Get quality tier based on overall score"""
        if score >= 80:
            return 'excellent'
        elif score >= 60:
            return 'good'
        elif score >= 40:
            return 'average'
        else:
            return 'needs_improvement'

# Global serialization functions

def serialize_link(link: Link, include_analytics: bool = False, include_preview: bool = True) -> Dict[str, Any]:
    """Serialize single link with enhanced features"""
    serializer = EnhancedLinkSerializer(link.user_id)
    return serializer.serialize_link(link, include_analytics, include_preview)

def serialize_links(links: List[Link], include_analytics: bool = False) -> List[Dict[str, Any]]:
    """Serialize multiple links efficiently with shared serializer"""
    if not links:
        return []
    
    # Use same serializer instance for efficiency
    serializer = EnhancedLinkSerializer(links[0].user_id)
    return [
        serializer.serialize_link(link, include_analytics) 
        for link in links
    ]

def serialize_link_preview(link: Link) -> Dict[str, Any]:
    """Serialize link for preview/search results with minimal data"""
    serializer = EnhancedLinkSerializer(link.user_id)
    data = serializer.serialize_link(link, include_analytics=False, include_preview=True)
    
    # Return minimal preview data for performance
    return {
        'id': data['id'],
        'title': data['title'],
        'display_url': data['display_url'],
        'preview': data['preview'],
        'link_type': data['link_type'],
        'pinned': data['pinned'],
        'starred': data['starred'],
        'frequently_used': data['frequently_used'],
        'relative_time': data['relative_time'],
        'performance': data['performance']
    }

def serialize_links_minimal(links: List[Link]) -> List[Dict[str, Any]]:
    """Serialize links with minimal data for better performance"""
    return [serialize_link_preview(link) for link in links]

def get_serialization_stats(links: List[Link]) -> Dict[str, Any]:
    """Get statistics about link serialization"""
    if not links:
        return {}
    
    # Analyze links
    total_links = len(links)
    has_metadata = sum(1 for link in links if link.metadata_)
    has_rich_metadata = sum(
        1 for link in links 
        if link.metadata_ and link.metadata_.get('page_metadata', {}).get('has_rich_metadata')
    )
    
    short_links = sum(1 for link in links if link.link_type == 'shortened')
    saved_links = total_links - short_links
    
    return {
        'total_links': total_links,
        'saved_links': saved_links,
        'short_links': short_links,
        'has_metadata': has_metadata,
        'has_rich_metadata': has_rich_metadata,
        'metadata_coverage': (has_metadata / total_links * 100) if total_links > 0 else 0,
        'rich_metadata_coverage': (has_rich_metadata / total_links * 100) if total_links > 0 else 0
    }