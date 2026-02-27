// src/services/export.service.js

import apiService from '../utils/api';
import { invalidateLinks } from '../cache';

class ExportService {
  async importFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiService.upload('/api/export/links/import', formData);
    if (response.success && response.data?.data) {
      invalidateLinks();
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.error || 'Import failed' };
  }

  async exportJSON() {
    const response = await apiService.get('/api/export/links/json');
    if (response.success) return response.data;
    return null;
  }

  async exportCSV() {
    const response = await apiService.get('/api/export/links/csv');
    if (response.success) return response.data;
    return null;
  }
}

export default new ExportService();