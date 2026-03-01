// src/services/folders.service.js

import apiService from '../utils/api';
import { config } from '../config/config';
import { cache, KEYS, STALE_TIMES } from '../cache';
import { invalidateFolders } from '../cache';

const BASE = config.endpoints.links.collections;

// ═══ Prefetch state (prevents duplicate prefetches) ═══
const _prefetching = new Set();

class FoldersService {
  async getFolders() {
    const response = await apiService.get(BASE);
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data.folders || [] };
    }
    return { success: true, data: [] };
  }

  async getFolderTree() {
    const response = await apiService.get(BASE, { view: 'tree' });
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data.folders || [] };
    }
    return { success: true, data: [] };
  }

  async getFolder(id) {
    const response = await apiService.get(`${BASE}/${id}`);
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.error || 'Folder not found' };
  }

  async getFolderBySlug(slug) {
    const response = await apiService.get(`${BASE}/s/${encodeURIComponent(slug)}`);
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.error || 'Folder not found' };
  }

  // ═══ NEW: Combined folder + links in one call ═══
  async getFolderFull(slug, params = {}) {
    const response = await apiService.get(
      `${BASE}/s/${encodeURIComponent(slug)}/full`,
      params
    );
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.error || 'Folder not found' };
  }

  // ═══ NEW: Prefetch folder data on hover ═══
  prefetchFolder(slug) {
    if (!slug) return;
    const cacheKey = KEYS.FOLDER_DETAIL + slug;

    // Skip if already cached and fresh, or already prefetching
    if (_prefetching.has(slug)) return;
    if (cache.has(cacheKey) && !cache.isStale(cacheKey, STALE_TIMES.FOLDER_DETAIL)) return;

    _prefetching.add(slug);

    this.getFolderFull(slug, { sort: 'title', order: 'asc', limit: 30 })
      .then(result => {
        if (result.success) {
          cache.set(cacheKey, {
            folder: result.data.folder,
            children: result.data.children,
            breadcrumb: result.data.breadcrumb,
            parent: result.data.parent,
            stats: result.data.stats,
          });
          // Cache links too
          const lk = KEYS.FOLDER_LINKS + `${slug}:title:asc:`;
          cache.set(lk, {
            links: result.data.links || [],
            meta: result.data.links_meta || { has_more: false, next_cursor: null, total: null },
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        _prefetching.delete(slug);
      });
  }

  async getRootItems(params = {}) {
    const response = await apiService.get(`${BASE}/root`, params);
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data };
    }
    return { success: true, data: { folders: [], links: [], meta: { has_more: false }, stats: {} } };
  }

  async getFolderLinks(id, params = {}) {
    const response = await apiService.get(`${BASE}/${id}/links`, params);
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data };
    }
    return { success: true, data: { links: [], meta: { has_more: false } } };
  }

  async getFolderLinksBySlug(slug, params = {}) {
    const response = await apiService.get(
      `${BASE}/s/${encodeURIComponent(slug)}/links`, params
    );
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data };
    }
    return { success: true, data: { links: [], meta: { has_more: false } } };
  }

  async createFolder(data) {
    const response = await apiService.post(BASE, data);
    if (response.success && response.data?.data) {
      invalidateFolders();
      return { success: true, data: response.data.data.folder };
    }
    return { success: false, error: response.error || 'Failed to create folder' };
  }

  async updateFolder(id, data) {
    const response = await apiService.put(`${BASE}/${id}`, data);
    if (response.success && response.data?.data) {
      invalidateFolders();
      return { success: true, data: response.data.data.folder };
    }
    return { success: false, error: response.error || 'Failed to update folder' };
  }

  async deleteFolder(id) {
    const response = await apiService.delete(`${BASE}/${id}`);
    if (response.success) { invalidateFolders(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to delete folder' };
  }

  async togglePin(id) {
    const response = await apiService.post(`${BASE}/${id}/pin`);
    if (response.success) { invalidateFolders(); return { success: true, data: response.data?.data }; }
    return { success: false, error: response.error || 'Failed to toggle pin' };
  }
}

export default new FoldersService();