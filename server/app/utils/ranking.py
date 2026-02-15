# server/app/utils/ranking.py

import re
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.link import Link

def calculate_search_relevance(link: Link, query: str) -> float:
    """Calculate search relevance score (0-100)"""
    score = 0.0
    query_lower = query.lower()
    
    # Title relevance (highest weight)
    if link.title:
        title_lower = link.title.lower()
        if query_lower == title_lower:
            score += 100  # Exact match
        elif title_lower.startswith(query_lower):
            score += 80   # Starts with query
        elif query_lower in title_lower:
            score += 60   # Contains query
            # Bonus for word boundaries
            if re.search(rf'\b{re.escape(query_lower)}\b', title_lower):
                score += 20
    
    # URL relevance
    url_lower = link.original_url.lower()
    if query_lower in url_lower:
        score += 30
        # Domain match bonus
        from app.utils.url import extract_domain
        domain = extract_domain(link.original_url)
        if domain and query_lower in domain.lower():
            score += 20
    
    # Notes relevance
    if link.notes:
        notes_lower = link.notes.lower()
        if query_lower in notes_lower:
            score += 25
            # Bonus for word boundaries in notes
            if re.search(rf'\b{re.escape(query_lower)}\b', notes_lower):
                score += 15
    
    # Slug relevance
    if link.slug and query_lower in link.slug.lower():
        score += 40
    
    # Status boosts
    if link.pinned:
        score *= 1.3
    if getattr(link, 'starred', False):
        score *= 1.2
    if link.frequently_used:
        score *= 1.15
    
    # Recency boost
    if link.updated_at:
        days_old = (datetime.utcnow() - link.updated_at).days
        if days_old <= 30:
            recency_multiplier = 1.0 + (0.1 * (30 - days_old) / 30)
            score *= recency_multiplier
    
    # Click frequency (for short links)
    if link.link_type == 'shortened' and link.click_count > 0:
        click_boost = min(10, math.log(link.click_count + 1) * 3)
        score += click_boost
    
    return min(100.0, score)

def normalize_query(query: str) -> str:
    """Normalize search query for better matching"""
    if not query:
        return ""
    
    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', query.strip())
    
    # Handle quoted phrases
    if normalized.startswith('"') and normalized.endswith('"') and len(normalized) > 2:
        return normalized  # Keep quotes for exact phrase search
    
    # Remove special characters but keep useful ones
    normalized = re.sub(r'[^\w\s\-\.\@\:]', '', normalized)
    
    return normalized.lower()

def calculate_importance_score(link: Link) -> float:
    """Enhanced importance score calculation"""
    score = 0.0
    
    # Base score
    score += 10
    
    # Status-based scoring
    if link.pinned:
        score += 50
    if getattr(link, 'starred', False):
        score += 30
    if link.frequently_used:
        score += 25
    
    # Activity-based scoring
    now = datetime.utcnow()
    
    # Recent activity (exponential decay)
    if link.updated_at:
        hours_old = (now - link.updated_at).total_seconds() / 3600
        activity_score = 20 * math.exp(-hours_old / 168)  # 1 week half-life
        score += activity_score
    
    # Click frequency for short links
    if link.link_type == 'shortened' and link.click_count > 0:
        click_score = min(20, math.log(link.click_count + 1) * 4)
        score += click_score
    
    # Type preference
    if link.link_type == 'saved':
        score += 5
    
    # Folder organization bonus
    if link.folder_id:
        score += 3
    
    # Tag organization bonus
    if hasattr(link, 'tags') and link.tags:
        score += 2 * min(5, len(link.tags))
    
    return min(100.0, score)

def rank_by_engagement(links: List[Link], days: int = 30) -> List[Link]:
    """Rank links by engagement metrics"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    scored_links = []
    for link in links:
        engagement_score = 0.0
        
        # Click engagement
        if link.link_type == 'shortened':
            # Recent clicks are more valuable
            if link.updated_at and link.updated_at >= cutoff:
                engagement_score += link.click_count * 2
            else:
                engagement_score += link.click_count
        
        # Update frequency
        if link.updated_at and link.updated_at >= cutoff:
            engagement_score += 10
        
        # User actions (pin, star, etc.)
        if link.pinned:
            engagement_score += 20
        if getattr(link, 'starred', False):
            engagement_score += 15
        
        # Time-based decay
        if link.created_at:
            age_days = (datetime.utcnow() - link.created_at).days
            if age_days > 0:
                engagement_score *= math.exp(-age_days / 365)  # 1 year half-life
        
        scored_links.append((link, engagement_score))
    
    # Sort by engagement score
    scored_links.sort(key=lambda x: x[1], reverse=True)
    return [link for link, _ in scored_links]

def generate_smart_suggestions(user_links: List[Link], query: str = "") -> List[Dict[str, Any]]:
    """Generate smart suggestions based on user behavior"""
    suggestions = []
    
    # Analyze user's link patterns
    domain_activity = {}
    tag_activity = {}
    recent_cutoff = datetime.utcnow() - timedelta(days=7)
    
    for link in user_links:
        # Domain patterns
        from app.utils.url import extract_domain
        domain = extract_domain(link.original_url)
        if domain:
            if domain not in domain_activity:
                domain_activity[domain] = {'count': 0, 'recent': 0}
            domain_activity[domain]['count'] += 1
            if link.updated_at and link.updated_at >= recent_cutoff:
                domain_activity[domain]['recent'] += 1
    
    # Domain-based suggestions
    popular_domains = sorted(
        domain_activity.items(),
        key=lambda x: (x[1]['recent'], x[1]['count']),
        reverse=True
    )[:5]
    
    for domain, stats in popular_domains:
        suggestions.append({
            'type': 'domain',
            'value': f"site:{domain}",
            'label': f"Search in {domain}",
            'count': stats['count'],
            'recent_activity': stats['recent']
        })
    
    # Query-based suggestions
    if query:
        # Suggest variations
        if not query.startswith('site:'):
            suggestions.insert(0, {
                'type': 'filter',
                'value': f'site: {query}',
                'label': f'Search for "{query}" in specific sites'
            })
        
        # Suggest time filters
        suggestions.append({
            'type': 'filter',
            'value': f'{query} created_after:7d',
            'label': f'"{query}" from last week'
        })
    
    return suggestions[:10]

def calculate_time_decay_score(timestamp: datetime, half_life_days: int = 30) -> float:
    """Calculate time-based decay score"""
    if not timestamp:
        return 0.0
    
    days_old = (datetime.utcnow() - timestamp).days
    return math.exp(-days_old * math.log(2) / half_life_days)

def boost_score_by_context(score: float, context: Dict[str, Any]) -> float:
    """Apply contextual boosts to base score"""
    boosted_score = score
    
    # Time-of-day boost (user's active hours)
    current_hour = datetime.utcnow().hour
    if context.get('active_hours') and current_hour in context['active_hours']:
        boosted_score *= 1.1
    
    # Device context
    if context.get('mobile') and context.get('link_mobile_friendly'):
        boosted_score *= 1.05
    
    # Location context (if available)
    if context.get('location_relevant'):
        boosted_score *= 1.15
    
    return min(100.0, boosted_score)

def rank_links_by_relevance(links: list, query: str = None) -> list:
    """Rank links by relevance for search results"""
    if not links:
        return []
    
    scored_links = []
    
    for link in links:
        score = calculate_importance_score(link)
        
        # Query relevance boost
        if query:
            query_lower = query.lower()
            
            # Title match (highest weight)
            if link.title and query_lower in link.title.lower():
                score += 40
                # Exact title match gets even more
                if query_lower == link.title.lower():
                    score += 20
            
            # URL match (medium weight)
            if query_lower in link.original_url.lower():
                score += 20
            
            # Notes match (lower weight)
            if link.notes and query_lower in link.notes.lower():
                score += 10
        
        scored_links.append((link, score))
    
    # Sort by score descending
    scored_links.sort(key=lambda x: x[1], reverse=True)
    return [link for link, score in scored_links]