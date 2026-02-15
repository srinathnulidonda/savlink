# server/app/shortlinks/service.py

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy import desc, func, and_
from app.extensions import db, redis_client
from app.models.link import Link
from app.utils.slug import generate_unique_slug, is_slug_available
from app.utils.url import extract_domain
import json
try:
    import qrcode
    QRCODE_AVAILABLE = True
except ImportError:
    QRCODE_AVAILABLE = False
import io
import base64
import logging

logger = logging.getLogger(__name__)

class AdvancedShortLinkManager:
    """Advanced short link management with analytics and features"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.cache_prefix = f"shortlinks:{user_id}"
    
    def create_advanced_short_link(self, data: Dict[str, Any]) -> Tuple[Optional[Link], Optional[str]]:
        """Create enhanced short link with advanced features"""
        original_url = data.get('original_url', '').strip()
        if not original_url:
            return None, 'original_url is required'
        
        # Validate URL format
        if not self._validate_url(original_url):
            return None, 'Invalid URL format'
        
        # Handle custom slug with validation
        slug = data.get('slug')
        if slug:
            slug = self._clean_slug(slug)
            if not self._validate_slug(slug):
                return None, 'Invalid slug format'
            if not is_slug_available(slug):
                return None, 'Slug already taken'
        else:
            slug = generate_unique_slug()
        
        # Handle expiration with validation
        expires_at = None
        if data.get('expires_at'):
            expires_at, error = self._parse_expiration(data['expires_at'])
            if error:
                return None, error
        
        # UTM parameters
        utm_params = data.get('utm_params', {})
        if utm_params:
            original_url = self._append_utm_parameters(original_url, utm_params)
        
        # Password protection
        password_hash = None
        if data.get('password'):
            password_hash = self._hash_password(data['password'])
        
        # Create link with metadata
        metadata = {
            'utm_params': utm_params,
            'password_protected': bool(password_hash),
            'created_via': data.get('created_via', 'api'),
            'click_limit': data.get('click_limit'),
            'geo_targeting': data.get('geo_targeting', {}),
            'device_targeting': data.get('device_targeting', {})
        }
        
        link = Link(
            user_id=self.user_id,
            original_url=original_url,
            link_type='shortened',
            slug=slug,
            title=data.get('title', '').strip() or None,
            notes=data.get('notes', '').strip() or None,
            expires_at=expires_at,
            is_active=True,
            soft_deleted=False,
            metadata_=metadata,
            password_hash=password_hash
        )
        
        db.session.add(link)
        db.session.commit()
        
        # Initialize analytics
        self._initialize_analytics(link)
        
        return link, None
    
    def _validate_url(self, url: str) -> bool:
        """Validate URL format"""
        import re
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE
        )
        return bool(url_pattern.match(url))
    
    def _clean_slug(self, slug: str) -> str:
        """Clean and normalize slug"""
        import re
        # Remove special characters, keep only alphanumeric, hyphens, underscores
        cleaned = re.sub(r'[^a-zA-Z0-9\-_]', '', slug.strip().lower())
        return cleaned[:50]  # Max length
    
    def _validate_slug(self, slug: str) -> bool:
        """Validate slug format"""
        import re
        # Must be 3-50 chars, alphanumeric with hyphens/underscores
        pattern = r'^[a-zA-Z0-9][a-zA-Z0-9\-_]{2,49}$'
        return bool(re.match(pattern, slug))
    
    def _parse_expiration(self, expiry_input: str) -> Tuple[Optional[datetime], Optional[str]]:
        """Parse various expiration formats"""
        try:
            # ISO format
            if 'T' in expiry_input or 'Z' in expiry_input:
                return datetime.fromisoformat(expiry_input.replace('Z', '+00:00')), None
            
            # Relative formats (e.g., "7d", "24h", "1w")
            import re
            match = re.match(r'^(\d+)([hdwmy])$', expiry_input.lower())
            if match:
                amount, unit = int(match.group(1)), match.group(2)
                
                if unit == 'h':
                    delta = timedelta(hours=amount)
                elif unit == 'd':
                    delta = timedelta(days=amount)
                elif unit == 'w':
                    delta = timedelta(weeks=amount)
                elif unit == 'm':
                    delta = timedelta(days=amount * 30)
                elif unit == 'y':
                    delta = timedelta(days=amount * 365)
                else:
                    return None, 'Invalid time unit'
                
                expires_at = datetime.utcnow() + delta
                # Max 5 years in future
                if expires_at > datetime.utcnow() + timedelta(days=365*5):
                    return None, 'Expiration too far in future'
                
                return expires_at, None
            
            return None, 'Invalid expiration format'
            
        except ValueError:
            return None, 'Invalid expiration format'
    
    def _append_utm_parameters(self, url: str, utm_params: Dict[str, str]) -> str:
        """Append UTM parameters to URL"""
        from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
        
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        
        # Add UTM parameters
        utm_mapping = {
            'source': 'utm_source',
            'medium': 'utm_medium', 
            'campaign': 'utm_campaign',
            'term': 'utm_term',
            'content': 'utm_content'
        }
        
        for key, utm_key in utm_mapping.items():
            if key in utm_params and utm_params[key]:
                query_params[utm_key] = [utm_params[key]]
        
        # Rebuild URL
        new_query = urlencode(query_params, doseq=True)
        return urlunparse(parsed._replace(query=new_query))
    
    def _hash_password(self, password: str) -> str:
        """Hash password for protection"""
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _initialize_analytics(self, link: Link) -> None:
        """Initialize analytics tracking for link"""
        if not redis_client.available:
            return
        
        analytics_key = f"{self.cache_prefix}:analytics:{link.id}"
        initial_data = {
            'total_clicks': 0,
            'unique_clicks': 0,
            'created_at': datetime.utcnow().isoformat(),
            'countries': {},
            'devices': {},
            'referrers': {},
            'browsers': {},
            'daily_clicks': {}
        }
        
        redis_client.setex(
            analytics_key, 
            86400 * 365,  # 1 year
            json.dumps(initial_data, default=str)
        )
    
    def track_click(self, slug: str, client_info: Dict[str, Any]) -> Optional[str]:
        """Track click with detailed analytics"""
        link = Link.query.filter_by(
            slug=slug,
            link_type='shortened',
            soft_deleted=False
        ).first()
        
        if not link:
            return None
        
        # Check if link is accessible
        if not self._can_access_link(link, client_info):
            return None
        
        # Update database click count
        link.click_count = Link.click_count + 1
        
        # Track in Redis for detailed analytics
        if redis_client.available:
            self._track_detailed_click(link, client_info)
        
        db.session.commit()
        return link.original_url
    
    def _can_access_link(self, link: Link, client_info: Dict[str, Any]) -> bool:
        """Check if link can be accessed based on various criteria"""
        # Check if active
        if not link.is_active:
            return False
        
        # Check expiration
        if link.expires_at and datetime.utcnow() > link.expires_at:
            return False
        
        # Check if archived
        if link.archived_at:
            return False
        
        # Check click limit
        metadata = link.metadata_ or {}
        click_limit = metadata.get('click_limit')
        if click_limit and link.click_count >= click_limit:
            return False
        
        # Check geo targeting
        geo_targeting = metadata.get('geo_targeting', {})
        if geo_targeting.get('enabled'):
            allowed_countries = geo_targeting.get('countries', [])
            client_country = client_info.get('country', '').upper()
            if allowed_countries and client_country not in allowed_countries:
                return False
        
        # Check device targeting
        device_targeting = metadata.get('device_targeting', {})
        if device_targeting.get('enabled'):
            allowed_devices = device_targeting.get('types', [])
            client_device = client_info.get('device_type', '').lower()
            if allowed_devices and client_device not in allowed_devices:
                return False
        
        return True
    
    def _track_detailed_click(self, link: Link, client_info: Dict[str, Any]) -> None:
        """Track detailed click analytics in Redis"""
        analytics_key = f"{self.cache_prefix}:analytics:{link.id}"
        
        try:
            # Get current analytics
            analytics_json = redis_client.get(analytics_key)
            analytics = json.loads(analytics_json) if analytics_json else {}
            
            # Update counters
            analytics['total_clicks'] = analytics.get('total_clicks', 0) + 1
            
            # Track unique clicks (basic IP-based)
            unique_key = f"{analytics_key}:unique:{client_info.get('ip', 'unknown')}"
            if not redis_client.exists(unique_key):
                redis_client.setex(unique_key, 86400, "1")  # 24 hour uniqueness
                analytics['unique_clicks'] = analytics.get('unique_clicks', 0) + 1
            
            # Track by dimensions
            today = datetime.utcnow().strftime('%Y-%m-%d')
            
            # Daily clicks
            daily_clicks = analytics.get('daily_clicks', {})
            daily_clicks[today] = daily_clicks.get(today, 0) + 1
            analytics['daily_clicks'] = daily_clicks
            
            # Country tracking
            country = client_info.get('country', 'Unknown')
            countries = analytics.get('countries', {})
            countries[country] = countries.get(country, 0) + 1
            analytics['countries'] = countries
            
            # Device tracking
            device = client_info.get('device_type', 'Unknown')
            devices = analytics.get('devices', {})
            devices[device] = devices.get(device, 0) + 1
            analytics['devices'] = devices
            
            # Referrer tracking
            referrer = client_info.get('referrer', 'Direct')
            referrers = analytics.get('referrers', {})
            referrers[referrer] = referrers.get(referrer, 0) + 1
            analytics['referrers'] = referrers
            
            # Browser tracking
            browser = client_info.get('browser', 'Unknown')
            browsers = analytics.get('browsers', {})
            browsers[browser] = browsers.get(browser, 0) + 1
            analytics['browsers'] = browsers
            
            # Save updated analytics
            redis_client.setex(analytics_key, 86400 * 365, json.dumps(analytics, default=str))
            
        except Exception as e:
            logger.error(f"Failed to track click analytics: {e}")
    
    def get_link_analytics(self, link_id: int, days: int = 30) -> Optional[Dict[str, Any]]:
        """Get comprehensive analytics for a link"""
        link = Link.query.filter_by(
            id=link_id,
            user_id=self.user_id,
            link_type='shortened',
            soft_deleted=False
        ).first()
        
        if not link:
            return None
        
        # Get Redis analytics
        redis_analytics = {}
        if redis_client.available:
            analytics_key = f"{self.cache_prefix}:analytics:{link_id}"
            analytics_json = redis_client.get(analytics_key)
            if analytics_json:
                try:
                    redis_analytics = json.loads(analytics_json)
                except json.JSONDecodeError:
                    pass
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Filter daily clicks for date range
        daily_clicks = redis_analytics.get('daily_clicks', {})
        filtered_daily = {}
        for date_str, clicks in daily_clicks.items():
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                if start_date <= date_obj <= end_date:
                    filtered_daily[date_str] = clicks
            except ValueError:
                continue
        
        # Calculate performance metrics
        total_clicks = redis_analytics.get('total_clicks', link.click_count)
        unique_clicks = redis_analytics.get('unique_clicks', 0)
        
        # Calculate click-through rate (if we have impression data)
        ctr = None
        if redis_analytics.get('impressions', 0) > 0:
            ctr = (total_clicks / redis_analytics['impressions']) * 100
        
        # Get top performers
        countries = redis_analytics.get('countries', {})
        top_countries = sorted(countries.items(), key=lambda x: x[1], reverse=True)[:5]
        
        devices = redis_analytics.get('devices', {})
        top_devices = sorted(devices.items(), key=lambda x: x[1], reverse=True)[:5]
        
        referrers = redis_analytics.get('referrers', {})
        top_referrers = sorted(referrers.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            'link_id': link_id,
            'slug': link.slug,
            'original_url': link.original_url,
            'created_at': link.created_at.isoformat() if link.created_at else None,
            'expires_at': link.expires_at.isoformat() if link.expires_at else None,
            'is_active': link.is_active,
            'is_expired': link.expires_at and datetime.utcnow() > link.expires_at,
            'total_clicks': total_clicks,
            'unique_clicks': unique_clicks,
            'click_through_rate': ctr,
            'daily_clicks': filtered_daily,
            'top_countries': [{'country': c, 'clicks': n} for c, n in top_countries],
            'top_devices': [{'device': d, 'clicks': n} for d, n in top_devices],
            'top_referrers': [{'referrer': r, 'clicks': n} for r, n in top_referrers],
            'performance': {
                'avg_daily_clicks': sum(filtered_daily.values()) / max(1, len(filtered_daily)),
                'peak_day': max(filtered_daily.items(), key=lambda x: x[1]) if filtered_daily else None,
                'conversion_rate': unique_clicks / max(1, total_clicks) * 100
            }
        }
    
    def generate_qr_code(self, link_id: int, size: int = 200) -> Optional[str]:
        """Generate QR code for short link"""
        if not QRCODE_AVAILABLE:
            logger.warning("QR code generation unavailable - qrcode module not installed")
            return None
        
        link = Link.query.filter_by(
            id=link_id,
            user_id=self.user_id,
            link_type='shortened',
            soft_deleted=False
        ).first()
        
        if not link:
            return None
        
        try:
            from app.utils.base_url import get_base_url
            short_url = f"{get_base_url()}/r/{link.slug}"
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=max(1, size // 25),
                border=4,
            )
            qr.add_data(short_url)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            logger.error(f"Failed to generate QR code: {e}")
            return None
    
    def bulk_create_links(self, links_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Bulk create short links"""
        results = {'created': [], 'errors': []}
        
        if len(links_data) > 100:
            return {'error': 'Maximum 100 links allowed per bulk operation'}
        
        for i, link_data in enumerate(links_data):
            try:
                link, error = self.create_advanced_short_link(link_data)
                
                if error:
                    results['errors'].append({
                        'index': i,
                        'data': link_data.get('original_url', ''),
                        'error': error
                    })
                else:
                    results['created'].append({
                        'id': link.id,
                        'slug': link.slug,
                        'original_url': link.original_url
                    })
                    
            except Exception as e:
                results['errors'].append({
                    'index': i,
                    'data': link_data.get('original_url', ''),
                    'error': str(e)
                })
        
        return results
    
    def get_user_analytics_summary(self, days: int = 30) -> Dict[str, Any]:
        """Get analytics summary for all user's short links"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get all user's short links
        links = Link.query.filter_by(
            user_id=self.user_id,
            link_type='shortened',
            soft_deleted=False
        ).all()
        
        # Aggregate stats
        total_links = len(links)
        total_clicks = sum(link.click_count for link in links)
        active_links = sum(1 for link in links if link.is_active)
        expired_links = sum(1 for link in links if link.expires_at and datetime.utcnow() > link.expires_at)
        
        # Links created in period
        recent_links = sum(
            1 for link in links 
            if link.created_at and link.created_at >= start_date
        )
        
        # Top performing links
        top_links = sorted(links, key=lambda x: x.click_count, reverse=True)[:5]
        
        # Domain analysis
        domain_stats = {}
        for link in links:
            domain = extract_domain(link.original_url)
            if domain:
                if domain not in domain_stats:
                    domain_stats[domain] = {'count': 0, 'clicks': 0}
                domain_stats[domain]['count'] += 1
                domain_stats[domain]['clicks'] += link.click_count
        
        top_domains = sorted(
            domain_stats.items(),
            key=lambda x: x[1]['clicks'],
            reverse=True
        )[:5]
        
        return {
            'period_days': days,
            'total_links': total_links,
            'active_links': active_links,
            'expired_links': expired_links,
            'total_clicks': total_clicks,
            'recent_links': recent_links,
            'avg_clicks_per_link': total_clicks / max(1, total_links),
            'top_links': [
                {
                    'id': link.id,
                    'slug': link.slug,
                    'title': link.title or extract_domain(link.original_url),
                    'clicks': link.click_count
                }
                for link in top_links
            ],
            'top_domains': [
                {
                    'domain': domain,
                    'link_count': stats['count'],
                    'total_clicks': stats['clicks']
                }
                for domain, stats in top_domains
            ]
        }