// src/services/links.service.js

import apiService from '../utils/api';
import { config } from '../config/config';
import {
  invalidateHome,
  invalidateLinks,
  invalidatePinned,
  invalidateStarred,
} from '../cache';

const BASE = config.endpoints.links.base;

class LinksService {
  async createLink(data) {
    const response = await apiService.post(BASE, data);
    if (response.success && response.data) {
      invalidateHome();
      return { success: true, data: response.data.data?.link || response.data };
    }
    return { success: false, error: response.error || 'Failed to create link' };
  }

  async updateLink(id, data) {
    const response = await apiService.put(`${BASE}/${id}`, data);
    if (response.success && response.data) {
      invalidateHome();
      return { success: true, data: response.data.data?.link || response.data };
    }
    return { success: false, error: response.error || 'Failed to update link' };
  }

  async deleteLink(id) {
    const response = await apiService.delete(`${BASE}/${id}`);
    if (response.success) { invalidateLinks(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to delete link' };
  }

  async pinLink(id) {
    const response = await apiService.post(`${BASE}/${id}/pin`);
    if (response.success) { invalidatePinned(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to pin link' };
  }

  async unpinLink(id) {
    const response = await apiService.post(`${BASE}/${id}/unpin`);
    if (response.success) { invalidatePinned(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to unpin link' };
  }

  async starLink(id) {
    const response = await apiService.post(`${BASE}/${id}/star`);
    if (response.success) { invalidateStarred(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to star link' };
  }

  async unstarLink(id) {
    const response = await apiService.post(`${BASE}/${id}/unstar`);
    if (response.success) { invalidateStarred(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to unstar link' };
  }

  async archiveLink(id) {
    const response = await apiService.post(`${BASE}/${id}/archive`);
    if (response.success) { invalidateLinks(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to archive link' };
  }

  async restoreLink(id) {
    const response = await apiService.post(`${BASE}/${id}/restore`);
    if (response.success) { invalidateLinks(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to restore link' };
  }

  async bulkAction(action, linkIds, params = {}) {
    const response = await apiService.post(`${BASE}/bulk`, {
      action,
      link_ids: linkIds,
      ...params,
    });
    if (response.success) { invalidateLinks(); return { success: true, data: response.data?.data }; }
    return { success: false, error: response.error || 'Bulk action failed' };
  }

  async bulkDelete(ids) { return this.bulkAction('delete', ids); }
  async bulkArchive(ids) { return this.bulkAction('archive', ids); }

  async toggleFrequent(id) {
    const response = await apiService.post(`${BASE}/${id}/toggle-frequent`);
    if (response.success) { invalidateHome(); return { success: true, data: response.data?.data }; }
    return { success: false, error: response.error || 'Failed to toggle frequent' };
  }

  async duplicateLink(id) {
    const response = await apiService.post(`${BASE}/${id}/duplicate`);
    if (response.success) { invalidateLinks(); return { success: true, data: response.data?.data?.link }; }
    return { success: false, error: response.error || 'Failed to duplicate link' };
  }

  async moveToFolder(id, folderId) {
    const response = await apiService.post(`${BASE}/${id}/move-folder`, { folder_id: folderId });
    if (response.success) { invalidateHome(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to move link' };
  }

  async updateTags(id, add = [], remove = []) {
    const response = await apiService.post(`${BASE}/${id}/tags`, { add, remove });
    if (response.success) { invalidateHome(); return { success: true }; }
    return { success: false, error: response.error || 'Failed to update tags' };
  }

  async checkDuplicate(url) {
    const response = await apiService.post(`${BASE}/check-duplicate`, { original_url: url });
    if (response.success) return { success: true, data: response.data?.data?.duplicate };
    return { success: false };
  }
}

export default new LinksService();