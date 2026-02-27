// src/services/folders.service.js
import apiService from '../utils/api';
import { config } from '../config/config';
import { invalidateFolders } from '../cache';

const BASE = config.endpoints.links.collections;

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

  async getFolderLinks(id, params = {}) {
    const response = await apiService.get(`${BASE}/${id}/links`, params);
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