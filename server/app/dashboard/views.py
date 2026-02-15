# server/app/dashboard/views.py

from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy import and_, or_, func, desc, case
from app.models import Link, Folder, Tag, LinkTag
from app.extensions import redis_client
from app.links.queries import apply_search, paginate_cursor
from app.folders.system import get_my_files_scope_query, is_system_folder
from app.utils.ranking import rank_links_by_relevance, rank_by_engagement
import json
import logging

logger = logging.getLogger(__name__)

VALID_VIEWS = {'all', 'recent', 'starred', 'pinned', 'archive', 'expired', 'trending'}
DEFAULT_LIMIT = 20
MAX_LIMIT = 100

class DashboardEngine:
    """Advanced dashboard engine with caching and intelligence"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.cache_prefix = f"dashboard:{user_id}"
    
    def get_intelligent_links(
        self,
        view: str = 'all',
        search: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = DEFAULT_LIMIT,
        filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Link], Optional[str], Dict[str, Any]]:
        """Get intelligently ranked and filtered links"""
        
        # Validate parameters
        if view not in VALID_VIEWS:
            view = 'all'
        limit = min(max(1, limit), MAX_LIMIT)
        filters = filters or {}
        
        # Check cache for expensive views
        cache_key = None
        if not search and not cursor and view in ['trending', 'all']:
            cache_key = self._build_cache_key(view, filters, limit)
            cached = self._get_cached_results(cache_key)
            if cached:
                return cached['links'], cached['next_cursor'], cached['meta']
        
        # Build query based on view
        query = self._build_view_query(view, filters)
        
        # Apply search if provided
        if search:
            query = apply_search(query, search)
        
        # Get results with pagination
        links, next_cursor = paginate_cursor(query, cursor, limit)
        
        # Apply intelligent ranking for certain views
        if view in ['trending', 'all'] and not search:
            links = self._apply_intelligent_ranking(links, view)
        elif search:
            links = rank_links_by_relevance(links, search)
        
        # Build metadata
        meta = self._build_meta(view, search, filters, links, next_cursor)
        
        # Cache results if appropriate
        if cache_key:
            self._cache_results(cache_key, {
                'links': links,
                'next_cursor': next_cursor,
                'meta': meta
            })
        
        return links, next_cursor, meta
    
    def _build_view_query(self, view: str, filters: Dict[str, Any]):
        """Build base query for view with filters"""
        # Start with base query
        if filters.get('system_folder') == 'my_files':
            query = get_my_files_scope_query(self.user_id)
        else:
            query = Link.query.filter(
                Link.user_id == self.user_id,
                Link.soft_deleted == False
            )
        
        # Apply view-specific filters
        if view == 'all':
            query = query.filter(Link.archived_at.is_(None))
        elif view == 'recent':
            cutoff = datetime.utcnow() - timedelta(days=7)
            query = query.filter(
                Link.archived_at.is_(None),
                Link.created_at >= cutoff
            )
        elif view == 'starred':
            query = query.filter(
                Link.starred == True,
                Link.archived_at.is_(None)
            )
        elif view == 'pinned':
            query = query.filter(
                Link.pinned == True,
                Link.archived_at.is_(None)
            )
        elif view == 'archive':
            query = query.filter(Link.archived_at.isnot(None))
        elif view == 'expired':
            query = query.filter(
                Link.link_type == 'shortened',
                Link.expires_at.isnot(None),
                Link.expires_at <= datetime.utcnow()
            )
        elif view == 'trending':
            # Links with recent activity
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.filter(
                Link.archived_at.is_(None),
                or_(
                    Link.updated_at >= week_ago,
                    Link.click_count > 0
                )
            )
        
        # Apply additional filters
        query = self._apply_filters(query, filters)
        
        # Default ordering (will be overridden by intelligent ranking for some views)
        if view == 'trending':
            query = query.order_by(
                desc(Link.click_count),
                desc(Link.updated_at)
            )
        elif view in ['starred', 'pinned']:
            query = query.order_by(
                desc(Link.pinned_at),
                desc(Link.created_at)
            )
        else:
            query = query.order_by(
                desc(Link.pinned),
                desc(Link.starred),
                desc(Link.created_at)
            )
        
        return query
    
    def _apply_filters(self, query, filters: Dict[str, Any]):
        """Apply advanced filters to query"""
        # Folder filters
        if filters.get('folder_id'):
            query = query.filter(Link.folder_id == filters['folder_id'])
        elif filters.get('unassigned_only'):
            query = query.filter(Link.folder_id.is_(None))
        
        # Status filters
        if filters.get('starred_only'):
            query = query.filter(Link.starred == True)
        if filters.get('pinned_only'):
            query = query.filter(Link.pinned == True)
        if filters.get('active_only') is not None:
            query = query.filter(Link.is_active == filters['active_only'])
        
        # Link type filter
        if filters.get('link_type'):
            query = query.filter(Link.link_type == filters['link_type'])
        
        # Tag filters
        if filters.get('tag_ids'):
            for tag_id in filters['tag_ids']:
                query = query.join(LinkTag).filter(LinkTag.tag_id == tag_id)
        
        # Date range filters
        if filters.get('created_after'):
            query = query.filter(Link.created_at >= filters['created_after'])
        if filters.get('created_before'):
            query = query.filter(Link.created_at <= filters['created_before'])
        
        # Domain filter
        if filters.get('domain'):
            query = query.filter(
                func.lower(Link.original_url).like(f'%{filters["domain"].lower()}%')
            )
        
        # Click count filters (for short links)
        if filters.get('min_clicks') is not None:
            query = query.filter(Link.click_count >= filters['min_clicks'])
        
        return query
    
    def _apply_intelligent_ranking(self, links: List[Link], view: str) -> List[Link]:
        """Apply intelligent ranking algorithms"""
        if view == 'trending':
            return rank_by_engagement(links, days=7)
        elif view == 'all':
            # Mix of recent, important, and engaging content
            from app.utils.ranking import calculate_importance_score
            
            scored_links = []
            for link in links:
                score = calculate_importance_score(link)
                
                # Boost recently updated links
                if link.updated_at:
                    days_old = (datetime.utcnow() - link.updated_at).days
                    if days_old <= 3:
                        score *= 1.2
                
                scored_links.append((link, score))
            
            # Sort by score
            scored_links.sort(key=lambda x: x[1], reverse=True)
            return [link for link, _ in scored_links]
        
        return links
    
    def _build_cache_key(self, view: str, filters: Dict[str, Any], limit: int) -> str:
        """Build cache key for results"""
        filter_hash = hash(str(sorted(filters.items())))
        return f"{self.cache_prefix}:view:{view}:{filter_hash}:{limit}"
    
    def _get_cached_results(self, cache_key: str) -> Optional[Dict]:
        """Get cached results"""
        if not redis_client.available:
            return None
        
        try:
            cached_json = redis_client.get(cache_key)
            if cached_json:
                cached_data = json.loads(cached_json)
                
                # Reconstruct Link objects (basic version)
                link_ids = cached_data.get('link_ids', [])
                if link_ids:
                    links = Link.query.filter(Link.id.in_(link_ids)).all()
                    # Maintain order
                    link_map = {link.id: link for link in links}
                    ordered_links = [link_map[lid] for lid in link_ids if lid in link_map]
                    
                    return {
                        'links': ordered_links,
                        'next_cursor': cached_data.get('next_cursor'),
                        'meta': cached_data.get('meta', {})
                    }
        except (json.JSONDecodeError, TypeError, KeyError):
            pass
        
        return None
    
    def _cache_results(self, cache_key: str, results: Dict) -> None:
        """Cache results"""
        if not redis_client.available:
            return
        
        try:
            # Cache only IDs and metadata, not full objects
            cache_data = {
                'link_ids': [link.id for link in results['links']],
                'next_cursor': results['next_cursor'],
                'meta': results['meta'],
                'cached_at': datetime.utcnow().isoformat()
            }
            
            # Cache for 5 minutes
            redis_client.setex(cache_key, 300, json.dumps(cache_data, default=str))
            
        except Exception as e:
            logger.warning(f"Failed to cache dashboard results: {e}")
    
    def _build_meta(
        self, 
        view: str, 
        search: Optional[str], 
        filters: Dict[str, Any], 
        links: List[Link], 
        next_cursor: Optional[str]
    ) -> Dict[str, Any]:
        """Build metadata for response"""
        meta = {
            'view': view,
            'search': search,
            'filters': filters,
            'count': len(links),
            'has_more': next_cursor is not None,
            'next_cursor': next_cursor,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Add view-specific metadata
        if view == 'trending':
            meta['period'] = '7 days'
        elif view == 'recent':
            meta['period'] = '7 days'
        
        # Add filter summary
        if filters:
            meta['active_filters'] = {
                key: value for key, value in filters.items() 
                if value is not None and value != '' and value != []
            }
        
        return meta
    
    def get_enhanced_stats(self) -> Dict[str, Any]:
        """Get enhanced dashboard statistics with caching"""
        cache_key = f"{self.cache_prefix}:stats"
        
        # Try cache first
        if redis_client.available:
            cached = redis_client.get(cache_key)
            if cached:
                try:
                    return json.loads(cached)
                except (json.JSONDecodeError, TypeError):
                    pass
        
        # Calculate fresh stats
        stats = self._calculate_fresh_stats()
        
        # Cache for 10 minutes
        if redis_client.available:
            redis_client.setex(cache_key, 600, json.dumps(stats, default=str))
        
        return stats
    
    def _calculate_fresh_stats(self) -> Dict[str, Any]:
        """Calculate fresh statistics"""
        base_query = Link.query.filter(
            Link.user_id == self.user_id,
            Link.soft_deleted == False
        )
        
        # Basic counts
        total_links = base_query.count()
        active_links = base_query.filter(
            Link.archived_at.is_(None),
            Link.is_active == True
        ).count()
        
        # View-specific counts
        counts = {
            'all': base_query.filter(Link.archived_at.is_(None)).count(),
            'starred': base_query.filter(
                Link.starred == True,
                Link.archived_at.is_(None)
            ).count(),
            'pinned': base_query.filter(
                Link.pinned == True,
                Link.archived_at.is_(None)
            ).count(),
            'archive': base_query.filter(Link.archived_at.isnot(None)).count(),
            'unassigned': base_query.filter(
                Link.folder_id.is_(None),
                Link.archived_at.is_(None)
            ).count()
        }
        
        # Time-based stats
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        this_week = base_query.filter(Link.created_at >= week_ago).count()
        this_month = base_query.filter(Link.created_at >= month_ago).count()
        
        # Short link specific stats
        short_links = base_query.filter(Link.link_type == 'shortened')
        total_short_links = short_links.count()
        total_clicks = short_links.with_entities(
            func.sum(Link.click_count)
        ).scalar() or 0
        
        # Expired short links
        expired_links = short_links.filter(
            Link.expires_at.isnot(None),
            Link.expires_at <= now
        ).count()
        
        # Links expiring soon (next 7 days)
        expiring_soon = short_links.filter(
            Link.expires_at.isnot(None),
            Link.expires_at <= now + timedelta(days=7),
            Link.expires_at > now
        ).count()
        
        # Top domains
        domain_stats = self._get_domain_stats()
        
        # Recent activity
        recent_activity = self._get_recent_activity()
        
        return {
            'overview': {
                'total_links': total_links,
                'active_links': active_links,
                'total_short_links': total_short_links,
                'total_clicks': total_clicks,
                'this_week': this_week,
                'this_month': this_month
            },
            'counts': counts,
            'short_links': {
                'total': total_short_links,
                'expired': expired_links,
                'expiring_soon': expiring_soon,
                'total_clicks': total_clicks,
                'avg_clicks': total_clicks / max(1, total_short_links)
            },
            'top_domains': domain_stats,
            'recent_activity': recent_activity,
            'generated_at': now.isoformat()
        }
    
    def _get_domain_stats(self) -> List[Dict[str, Any]]:
        """Get top domains by link count and clicks"""
        links = Link.query.filter(
            Link.user_id == self.user_id,
            Link.soft_deleted == False,
            Link.archived_at.is_(None)
        ).all()
        
        domain_stats = {}
        for link in links:
            from app.utils.url import extract_domain
            domain = extract_domain(link.original_url)
            if domain:
                if domain not in domain_stats:
                    domain_stats[domain] = {
                        'count': 0,
                        'clicks': 0,
                        'short_links': 0
                    }
                
                domain_stats[domain]['count'] += 1
                domain_stats[domain]['clicks'] += link.click_count
                
                if link.link_type == 'shortened':
                    domain_stats[domain]['short_links'] += 1
        
        # Sort by link count
        sorted_domains = sorted(
            domain_stats.items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )
        
        return [
            {
                'domain': domain,
                **stats
            }
            for domain, stats in sorted_domains[:10]
        ]
    
    def _get_recent_activity(self) -> List[Dict[str, Any]]:
        """Get recent activity summary"""
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        recent_links = Link.query.filter(
            Link.user_id == self.user_id,
            Link.soft_deleted == False,
            or_(
                Link.created_at >= week_ago,
                Link.updated_at >= week_ago
            )
        ).order_by(desc(Link.updated_at)).limit(10).all()
        
        activities = []
        for link in recent_links:
            # Determine activity type
            if link.created_at >= week_ago and (
                link.updated_at is None or 
                link.updated_at <= link.created_at + timedelta(seconds=1)
            ):
                activity_type = 'created'
                timestamp = link.created_at
            else:
                activity_type = 'updated'
                timestamp = link.updated_at
            
            activities.append({
                'type': activity_type,
                'link_id': link.id,
                'title': link.title or extract_domain(link.original_url),
                'link_type': link.link_type,
                'timestamp': timestamp.isoformat() if timestamp else None
            })
        
        return activities

# Update existing function to use new engine
def resolve_view(
    user_id: str,
    view: str = 'all',
    search: Optional[str] = None,
    cursor: Optional[str] = None,
    limit: int = DEFAULT_LIMIT,
    system_folder: Optional[str] = None,
    folder_id: Optional[int] = None,
    tag_ids: Optional[List[int]] = None,
    unassigned_only: bool = False,
    starred_only: bool = False,
    pinned_only: bool = False,
    link_type: Optional[str] = None,
) -> Tuple[List[Link], Optional[str], Dict]:
    """Enhanced view resolution with intelligent features"""
    
    # Build filters
    filters = {}
    if system_folder:
        filters['system_folder'] = system_folder
    if folder_id:
        filters['folder_id'] = folder_id
    if tag_ids:
        filters['tag_ids'] = tag_ids
    if unassigned_only:
        filters['unassigned_only'] = unassigned_only
    if starred_only:
        filters['starred_only'] = starred_only
    if pinned_only:
        filters['pinned_only'] = pinned_only
    if link_type:
        filters['link_type'] = link_type
    
    # Use enhanced dashboard engine
    engine = DashboardEngine(user_id)
    return engine.get_intelligent_links(view, search, cursor, limit, filters)

def get_stats(user_id: str) -> Dict[str, Any]:
    """Get enhanced dashboard stats"""
    engine = DashboardEngine(user_id)
    base_stats = engine.get_enhanced_stats()
    
    # Add folder and tag stats
    from app.folders.service import get_folder_with_counts
    from app.tags.service import get_tags_with_counts
    
    base_stats['folders'] = get_folder_with_counts(user_id)
    base_stats['tags'] = get_tags_with_counts(user_id)
    
    return base_stats