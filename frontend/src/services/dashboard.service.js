// src/services/dashboard.service.js

import apiService from '../utils/api';
import { config } from '../config/config';

class DashboardService {
    async getHomeData() {
        try {
            const response = await apiService.get(config.endpoints.dashboard.home);

            if (response.success && response.data) {
                return {
                    success: true,
                    data: {
                        pinnedLinks: response.data.data?.pinned_links || [],
                        recentLinks: response.data.data?.recent_links || [],
                        collections: response.data.data?.collections || [],
                        stats: response.data.data?.stats || {
                            total: 0,
                            thisWeek: 0,
                            starred: 0,
                            collections: 0
                        },
                        activities: response.data.data?.activities || []
                    }
                };
            }

            // API returned error but didn't throw - return empty
            return this._emptyHomeData();
        } catch (error) {
            // Silently return empty data - no noisy logs
            return this._emptyHomeData();
        }
    }

    _emptyHomeData() {
        return {
            success: true,
            data: {
                pinnedLinks: [],
                recentLinks: [],
                collections: [],
                stats: {
                    total: 0,
                    thisWeek: 0,
                    starred: 0,
                    collections: 0
                },
                activities: []
            }
        };
    }

    async getStats() {
        try {
            const response = await apiService.get(config.endpoints.dashboard.stats);

            if (response.success && response.data) {
                return {
                    success: true,
                    data: {
                        stats: response.data.data?.stats || this._emptyStats()
                    }
                };
            }

            return { success: true, data: { stats: this._emptyStats() } };
        } catch (error) {
            return { success: true, data: { stats: this._emptyStats() } };
        }
    }

    _emptyStats() {
        return { all: 0, recent: 0, starred: 0, archive: 0 };
    }

    async getLinks(params = {}) {
        try {
            const {
                view = 'all',
                search = '',
                cursor = null,
                limit = 20,
                sort = 'created_at',
                order = 'desc'
            } = params;

            const queryParams = {
                view,
                limit,
                sort,
                order,
                ...(search && { search }),
                ...(cursor && { cursor })
            };

            const response = await apiService.get(config.endpoints.dashboard.links, queryParams);

            if (response.success && response.data) {
                return {
                    success: true,
                    data: {
                        links: response.data.data?.links || [],
                        cursor: response.data.data?.cursor || null,
                        hasMore: response.data.data?.has_more || false,
                        total: response.data.data?.total || 0
                    }
                };
            }

            return { success: true, data: { links: [], cursor: null, hasMore: false, total: 0 } };
        } catch (error) {
            return { success: true, data: { links: [], cursor: null, hasMore: false, total: 0 } };
        }
    }

    async searchLinks(query) {
        try {
            const response = await apiService.get(config.endpoints.links.search, { q: query });

            if (response.success && response.data) {
                return { success: true, data: response.data.data?.results || [] };
            }

            return { success: true, data: [] };
        } catch (error) {
            return { success: true, data: [] };
        }
    }
}

export default new DashboardService();