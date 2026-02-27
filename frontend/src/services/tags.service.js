// src/services/tags.service.js

import apiService from '../utils/api';
import { config } from '../config/config';

const BASE = config.endpoints.links.tags;

class TagsService {
  async getTags() {
    const response = await apiService.get(BASE);
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data.tags || [] };
    }
    return { success: true, data: [] };
  }

  async createTag(data) {
    const response = await apiService.post(BASE, data);
    if (response.success && response.data?.data) {
      return { success: true, data: response.data.data.tag };
    }
    return { success: false, error: response.error || 'Failed to create tag' };
  }

  async deleteTag(id) {
    const response = await apiService.delete(`${BASE}/${id}`);
    if (response.success) return { success: true };
    return { success: false, error: response.error || 'Failed to delete tag' };
  }
}

export default new TagsService();