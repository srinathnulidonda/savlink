# server/app/search/service.py

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import and_, or_, func, desc, case
from sqlalchemy.orm import joinedload
from app.extensions import db, redis_client
from app.models import Link, Folder, Tag, LinkTag
from app.utils.url import extract_domain
from app.utils.ranking import calculate_search_relevance, normalize_query
import re
import json
import logging

logger = logging.getLogger(__name__)

class AdvancedSearch:
    """Advanced search engine for Savlink"""
    
    CACHE_TTL = 300  # 5 minutes
    MAX_SEARCH_HISTORY = 50
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.cache_key_prefix = f"search:{user_id}"
    
    def search_everything(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        include_archived: bool = False
    ) -> Dict[str, Any]:
        """Comprehensive search across all entities"""
        
        if not query or len(query.strip()) < 1:
            return self._empty_results()
        
        normalized_query = normalize_query(query)
        cache_key = f"{self.cache_key_prefix}:all:{hash(normalized_query)}:{hash(str(filters))}"
        
        # Try cache first
        if redis_client.available:
            cached = redis_client.get(cache_key)
            if cached:
                try:
                    return json.loads(cached)
                except (json.JSONDecodeError, TypeError):
                    pass
        
        # Record search
        self._record_search_history(query)
        
        # Perform searches
        links = self._search_links_advanced(normalized_query, filters, limit, include_archived)
        folders = self._search_folders_advanced(normalized_query, limit // 4)
        tags = self._search_tags_advanced(normalized_query, limit // 4)
        
        # Calculate search stats
        stats = self._calculate_search_stats(links, folders, tags, query)
        
        results = {
            'query': query,
            'normalized_query': normalized_query,
            'links': links,
            'folders': folders,
            'tags': tags,
            'stats': stats,
            'suggestions': self._generate_suggestions(query, links),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Cache results
        if redis_client.available:
            redis_client.setex(cache_key, self.CACHE_TTL, json.dumps(results, default=str))
        
        return results
    
    def _search_links_advanced(
        self,
        query: str,
        filters: Optional[Dict[str, Any]],
        limit: int,
        include_archived: bool
    ) -> List[Dict[str, Any]]:
        """Advanced link search with relevance scoring"""
        
        # Base query with joins for performance
        base_query = Link.query.options(
            joinedload(Link.folder),
            joinedload(Link.user)
        ).filter(
            Link.user_id == self.user_id,
            Link.soft_deleted == False
        )
        
        # Archive filter
        if not include_archived:
            base_query = base_query.filter(Link.archived_at.is_(None))
        
        # Apply filters
        base_query = self._apply_link_filters(base_query, filters)
        
        # Search conditions with ranking
        search_conditions = self._build_search_conditions(query)
        
        # Relevance scoring using SQL
        relevance_score = self._build_relevance_score(query)
        
        # Execute search with ranking
        results = base_query.filter(
            or_(*search_conditions)
        ).add_columns(
            relevance_score.label('relevance')
        ).order_by(
            desc('relevance'),
            desc(Link.pinned),
            desc(Link.starred),
            desc(Link.frequently_used),
            desc(Link.updated_at)
        ).limit(limit).all()
        
        # Process results
        processed_links = []
        for link, relevance in results:
            link_data = self._serialize_search_link(link)
            link_data['search_relevance'] = float(relevance) if relevance else 0.0
            link_data['search_highlights'] = self._generate_highlights(link, query)
            processed_links.append(link_data)
        
        return processed_links
    
    def _build_relevance_score(self, query: str):
        """Build SQL relevance scoring expression"""
        query_lower = query.lower()
        
        return (
            # Title matches (highest weight)
            case([
                (func.lower(Link.title) == query_lower, 100),
                (func.lower(Link.title).like(f'{query_lower}%'), 80),
                (func.lower(Link.title).like(f'%{query_lower}%'), 60)
            ], else_=0) +
            
            # URL matches
            case([
                (func.lower(Link.original_url).like(f'%{query_lower}%'), 40)
            ], else_=0) +
            
            # Notes matches
            case([
                (func.lower(Link.notes).like(f'%{query_lower}%'), 30)
            ], else_=0) +
            
            # Slug matches
            case([
                (func.lower(Link.slug) == query_lower, 50),
                (func.lower(Link.slug).like(f'%{query_lower}%'), 25)
            ], else_=0) +
            
            # Boost factors
            case([(Link.pinned == True, 20)], else_=0) +
            case([(Link.starred == True, 15)], else_=0) +
            case([(Link.frequently_used == True, 10)], else_=0)
        )
    
    def _build_search_conditions(self, query: str) -> List:
        """Build search conditions for different fields"""
        query_pattern = f'%{query}%'
        
        conditions = [
            func.lower(Link.title).like(func.lower(query_pattern)),
            func.lower(Link.original_url).like(func.lower(query_pattern)),
            func.lower(Link.notes).like(func.lower(query_pattern)),
            func.lower(Link.slug).like(func.lower(query_pattern))
        ]
        
        # Domain-specific search
        domain = extract_domain(query)
        if domain:
            conditions.append(
                func.lower(Link.original_url).like(f'%{domain.lower()}%')
            )
        
        # Exact phrase search (quoted)
        if query.startswith('"') and query.endswith('"') and len(query) > 2:
            phrase = query[1:-1]
            conditions = [
                func.lower(Link.title).like(f'%{phrase.lower()}%'),
                func.lower(Link.original_url).like(f'%{phrase.lower()}%'),
                func.lower(Link.notes).like(f'%{phrase.lower()}%')
            ]
        
        return conditions
    
    def _apply_link_filters(self, query, filters: Optional[Dict[str, Any]]):
        """Apply advanced filters to link search"""
        if not filters:
            return query
        
        # Status filters
        if filters.get('starred'):
            query = query.filter(Link.starred == True)
        if filters.get('pinned'):
            query = query.filter(Link.pinned == True)
        if filters.get('frequently_used'):
            query = query.filter(Link.frequently_used == True)
        if filters.get('active') is not None:
            query = query.filter(Link.is_active == filters['active'])
        
        # Type filter
        if filters.get('link_type'):
            query = query.filter(Link.link_type == filters['link_type'])
        
        # Folder filters
        if filters.get('folder_id'):
            query = query.filter(Link.folder_id == filters['folder_id'])
        elif filters.get('unassigned_only'):
            query = query.filter(Link.folder_id.is_(None))
        
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
        
        # Click count filter (for short links)
        if filters.get('min_clicks') is not None:
            query = query.filter(Link.click_count >= filters['min_clicks'])
        
        # Expiration filters
        if filters.get('expiring_soon'):
            cutoff = datetime.utcnow() + timedelta(days=7)
            query = query.filter(
                Link.expires_at.isnot(None),
                Link.expires_at <= cutoff,
                Link.expires_at > datetime.utcnow()
            )
        
        return query
    
    def _search_folders_advanced(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Enhanced folder search"""
        search_pattern = f'%{query}%'
        
        folders = Folder.query.filter(
            Folder.user_id == self.user_id,
            Folder.soft_deleted == False,
            func.lower(Folder.name).like(func.lower(search_pattern))
        ).order_by(
            # Exact matches first
            case([(func.lower(Folder.name) == query.lower(), 1)], else_=2),
            desc(Folder.pinned),
            Folder.name
        ).limit(limit).all()
        
        results = []
        for folder in folders:
            folder_data = self._serialize_search_folder(folder)
            folder_data['search_highlights'] = self._highlight_text(folder.name, query)
            results.append(folder_data)
        
        return results
    
    def _search_tags_advanced(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Enhanced tag search with usage stats"""
        search_pattern = f'%{query}%'
        
        tags_with_counts = db.session.query(
            Tag,
            func.count(LinkTag.id).label('usage_count')
        ).outerjoin(
            LinkTag, and_(
                LinkTag.tag_id == Tag.id,
                LinkTag.user_id == self.user_id
            )
        ).filter(
            Tag.user_id == self.user_id,
            func.lower(Tag.name).like(func.lower(search_pattern))
        ).group_by(Tag.id).order_by(
            case([(func.lower(Tag.name) == query.lower(), 1)], else_=2),
            desc('usage_count'),
            Tag.name
        ).limit(limit).all()
        
        results = []
        for tag, usage_count in tags_with_counts:
            tag_data = {
                'id': tag.id,
                'name': tag.name,
                'color': tag.color,
                'usage_count': usage_count,
                'search_highlights': self._highlight_text(tag.name, query)
            }
            results.append(tag_data)
        
        return results
    
    def _generate_highlights(self, link: Link, query: str) -> Dict[str, str]:
        """Generate search result highlights"""
        highlights = {}
        
        if link.title:
            highlights['title'] = self._highlight_text(link.title, query)
        
        if link.notes:
            highlights['notes'] = self._highlight_snippet(link.notes, query)
        
        highlights['url'] = self._highlight_text(link.original_url, query, max_length=80)
        
        return highlights
    
    def _highlight_text(self, text: str, query: str, max_length: int = None) -> str:
        """Add highlight markers to matching text"""
        if not text or not query:
            return text
        
        # Escape special regex characters in query
        escaped_query = re.escape(query)
        pattern = re.compile(f'({escaped_query})', re.IGNORECASE)
        highlighted = pattern.sub(r'<mark>\1</mark>', text)
        
        if max_length and len(highlighted) > max_length:
            # Try to center the highlight
            mark_pos = highlighted.find('<mark>')
            if mark_pos != -1:
                start = max(0, mark_pos - max_length // 2)
                highlighted = highlighted[start:start + max_length]
                if start > 0:
                    highlighted = '...' + highlighted
                if len(highlighted) == max_length:
                    highlighted = highlighted + '...'
        
        return highlighted
    
    def _highlight_snippet(self, text: str, query: str, snippet_length: int = 150) -> str:
        """Generate highlighted snippet around query match"""
        if not text or not query:
            return text[:snippet_length] + ('...' if len(text) > snippet_length else '')
        
        query_lower = query.lower()
        text_lower = text.lower()
        
        # Find query position
        pos = text_lower.find(query_lower)
        if pos == -1:
            return text[:snippet_length] + ('...' if len(text) > snippet_length else '')
        
        # Calculate snippet bounds
        start = max(0, pos - snippet_length // 2)
        end = min(len(text), start + snippet_length)
        
        snippet = text[start:end]
        
        # Add ellipses
        if start > 0:
            snippet = '...' + snippet
        if end < len(text):
            snippet = snippet + '...'
        
        return self._highlight_text(snippet, query)
    
    def _record_search_history(self, query: str) -> None:
        """Record search in user's history"""
        if not redis_client.available:
            return
        
        try:
            history_key = f"{self.cache_key_prefix}:history"
            
            # Get current history
            history_json = redis_client.get(history_key)
            history = json.loads(history_json) if history_json else []
            
            # Add new search
            search_entry = {
                'query': query,
                'timestamp': datetime.utcnow().isoformat(),
                'count': 1
            }
            
            # Update existing or add new
            updated = False
            for entry in history:
                if entry['query'].lower() == query.lower():
                    entry['count'] += 1
                    entry['timestamp'] = search_entry['timestamp']
                    updated = True
                    break
            
            if not updated:
                history.append(search_entry)
            
            # Sort by frequency and recency, limit size
            history.sort(key=lambda x: (x['count'], x['timestamp']), reverse=True)
            history = history[:self.MAX_SEARCH_HISTORY]
            
            # Save back
            redis_client.setex(history_key, 86400 * 30, json.dumps(history))  # 30 days
            
        except Exception as e:
            logger.warning(f"Failed to record search history: {e}")
    
    def get_search_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's search history"""
        if not redis_client.available:
            return []
        
        try:
            history_key = f"{self.cache_key_prefix}:history"
            history_json = redis_client.get(history_key)
            
            if not history_json:
                return []
            
            history = json.loads(history_json)
            return history[:limit]
            
        except Exception as e:
            logger.warning(f"Failed to get search history: {e}")
            return []
    
    def get_trending_searches(self, days: int = 7) -> List[str]:
        """Get trending searches across the platform (anonymized)"""
        # This would require aggregating across users
        # For now, return user's frequent searches
        history = self.get_search_history(20)
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        recent_searches = [
            entry for entry in history
            if datetime.fromisoformat(entry['timestamp']) >= cutoff
        ]
        
        return [entry['query'] for entry in recent_searches[:5]]
    
    def _calculate_search_stats(self, links, folders, tags, query) -> Dict[str, Any]:
        """Calculate search statistics"""
        return {
            'total_results': len(links) + len(folders) + len(tags),
            'links_count': len(links),
            'folders_count': len(folders),
            'tags_count': len(tags),
            'query_length': len(query),
            'has_results': (len(links) + len(folders) + len(tags)) > 0,
            'search_time_ms': 0  # Would need actual timing
        }
    
    def _generate_suggestions(self, query: str, links: List) -> List[str]:
        """Generate search suggestions based on results"""
        suggestions = []
        
        # Domain suggestions from results
        domains = set()
        for link in links[:10]:  # Top 10 results
            if isinstance(link, dict) and 'original_url' in link:
                domain = extract_domain(link['original_url'])
                if domain:
                    domains.add(domain)
        
        # Add domain-based suggestions
        for domain in list(domains)[:3]:
            suggestions.append(f"site:{domain}")
        
        # Add related queries from history
        history = self.get_search_history(50)
        for entry in history:
            if query.lower() in entry['query'].lower() and entry['query'] != query:
                suggestions.append(entry['query'])
                if len(suggestions) >= 5:
                    break
        
        return suggestions[:5]
    
    def _serialize_search_link(self, link: Link) -> Dict[str, Any]:
        """Serialize link for search results"""
        from app.dashboard.service import serialize_link
        return serialize_link(link)
    
    def _serialize_search_folder(self, folder: Folder) -> Dict[str, Any]:
        """Serialize folder for search results"""
        from app.folders.service import serialize_folder
        return serialize_folder(folder, include_counts=True)
    
    def _empty_results(self) -> Dict[str, Any]:
        """Return empty search results"""
        return {
            'query': '',
            'normalized_query': '',
            'links': [],
            'folders': [],
            'tags': [],
            'stats': self._calculate_search_stats([], [], [], ''),
            'suggestions': [],
            'timestamp': datetime.utcnow().isoformat()
        }

# Legacy function for backward compatibility
def search_links(user_id: str, query: str, filters: Optional[Dict] = None, limit: int = 50) -> List:
    """Legacy search function"""
    search_engine = AdvancedSearch(user_id)
    results = search_engine.search_everything(query, filters, limit)
    return [link for link in results['links']]