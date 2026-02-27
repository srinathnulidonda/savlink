// src/services/dashboard.service.js

import apiService from '../utils/api';
import { config } from '../config/config';

class DashboardService {
  async getOverview() {
    try {
      const response = await apiService.get('/api/dashboard/overview');
      if (!response.success || !response.data?.data) {
        return { success: false, error: response.error || 'Failed to load' };
      }

      const raw = response.data.data;
      const home = raw.home || {};
      const statsRaw = raw.stats || {};
      const pinned = raw.pinned || {};
      const starred = raw.starred || {};

      const quickAccess = home.quick_access || [];
      const pinnedLinks = [];
      const pinnedIds = new Set();

      quickAccess.forEach(qa => {
        if (qa.type === 'link' && qa.item?.pinned) {
          pinnedLinks.push(qa.item);
          pinnedIds.add(qa.item.id);
        }
      });

      (pinned.pinned_links || []).forEach(l => {
        if (!pinnedIds.has(l.id)) { pinnedLinks.push(l); pinnedIds.add(l.id); }
      });

      (home.recent_links || []).forEach(l => {
        if (l.pinned && !pinnedIds.has(l.id)) pinnedLinks.push(l);
      });

      const counts = statsRaw.counts || {};
      const overview = statsRaw.overview || {};

      return {
        success: true,
        data: {
          recentLinks: home.recent_links || [],
          pinnedLinks,
          starredLinks: starred.starred_links || [],
          collections: (home.folders || []).map(f => ({
            id: f.id, name: f.name, icon: f.icon || '📁',
            color: f.color, count: f.link_count ?? f.count ?? 0, pinned: f.pinned,
          })),
          activities: home.activities || [],
          quickAccess,
          stats: {
            total: overview.total_links ?? 0,
            thisWeek: overview.this_week ?? 0,
            starred: counts.starred ?? 0,
            collections: home.stats?.total_folders ?? 0,
            totalClicks: overview.total_clicks ?? 0,
          },
          countsForNav: {
            all: counts.all ?? 0,
            recent: counts.recent ?? 0,
            starred: counts.starred ?? 0,
            pinned: counts.pinned ?? 0,
            archive: counts.archive ?? 0,
            short: counts.short ?? 0,
            unassigned: counts.unassigned ?? 0,
            frequently_used: counts.frequently_used ?? 0,
          },
          folders: raw.folder_tree || [],
          tags: raw.tags || [],
        },
      };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to load' };
    }
  }

  async getStats() {
    try {
      const response = await apiService.get(config.endpoints.dashboard.stats);
      if (!response.success || !response.data?.data) {
        return { success: true, data: { stats: this._emptyStats() } };
      }
      const raw = response.data.data.stats || {};
      const counts = raw.counts || {};
      const overview = raw.overview || {};
      return {
        success: true,
        data: {
          stats: {
            all: counts.all ?? overview.active_links ?? 0,
            recent: counts.recent ?? overview.this_week ?? 0,
            starred: counts.starred ?? 0,
            pinned: counts.pinned ?? 0,
            archive: counts.archive ?? 0,
            short: counts.short ?? 0,
            unassigned: counts.unassigned ?? 0,
            frequently_used: counts.frequently_used ?? 0,
            totalClicks: overview.total_clicks ?? 0,
          },
          folders: raw.folders || [],
          tags: raw.tags || [],
        },
      };
    } catch {
      return { success: true, data: { stats: this._emptyStats() } };
    }
  }

  _emptyStats() {
    return {
      all: 0, recent: 0, starred: 0, pinned: 0,
      archive: 0, short: 0, unassigned: 0,
      frequently_used: 0, totalClicks: 0,
    };
  }

  async getLinks(params = {}) {
    try {
      const { view = 'all', search = '', cursor = null, limit = 20, sort = 'created_at', order = 'desc' } = params;
      const qp = { view, limit, sort, order };
      if (search) qp.search = search;
      if (cursor) qp.cursor = cursor;

      const response = await apiService.get(config.endpoints.dashboard.links, qp);
      if (!response.success || !response.data?.data) {
        return { success: true, data: { links: [], cursor: null, hasMore: false } };
      }
      const raw = response.data.data;
      return {
        success: true,
        data: {
          links: raw.links || [],
          cursor: raw.meta?.next_cursor || null,
          hasMore: raw.meta?.has_more || false,
        },
      };
    } catch {
      return { success: true, data: { links: [], cursor: null, hasMore: false } };
    }
  }
}

export default new DashboardService();