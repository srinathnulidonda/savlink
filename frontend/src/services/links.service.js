// src/services/links.service.js
import { config, getApiUrl } from '../utils/config';
import { AuthService } from '../utils/auth';

export const LinksService = {
    async getAuthToken() {
        // Wait for auth to be ready
        await AuthService.ensureInitialized();

        if (!AuthService.isAuthenticated()) {
            throw new Error('User not authenticated');
        }

        const token = await AuthService.getIdToken();
        if (!token) {
            throw new Error('Failed to get auth token');
        }

        return token;
    },

    async getLinks({ view = 'all', search = '', cursor = null, limit = 20 }) {
        const token = await this.getAuthToken();
        const params = new URLSearchParams({
            view,
            ...(search && { search }),
            ...(cursor && { cursor }),
            limit: limit.toString()
        });

        // Fix: Use the correct backend route pattern
        const response = await fetch(getApiUrl(`/api/dashboard/links?${params}`), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Failed to fetch links (${response.status})`);
        }

        const result = await response.json();

        // Handle the response structure from your backend
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch links');
        }

        return result; // Return the full response with success, data, etc.
    },

    async getStats() {
        const token = await this.getAuthToken();

        // Fix: Use the correct backend route pattern
        const response = await fetch(getApiUrl('/api/dashboard/stats'), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Failed to fetch stats (${response.status})`);
        }

        const result = await response.json();

        // Handle the response structure from your backend
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch stats');
        }

        return result; // Return the full response with success, data, etc.
    },

    async createLink(linkData) {
        const token = await this.getAuthToken();
        const response = await fetch(getApiUrl('/api/links'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(linkData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to create link');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to create link');
        }

        return result;
    },

    async updateLink(linkId, updates) {
        const token = await this.getAuthToken();
        const response = await fetch(getApiUrl(`/api/links/${linkId}`), {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to update link');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to update link');
        }

        return result;
    },

    async deleteLink(linkId) {
        const token = await this.getAuthToken();
        const response = await fetch(getApiUrl(`/api/links/${linkId}`), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to delete link');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to delete link');
        }

        return result;
    },

    async pinLink(linkId) {
        const token = await this.getAuthToken();
        const response = await fetch(getApiUrl(`/api/links/${linkId}/pin`), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to pin link');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to pin link');
        }

        return result;
    },

    async unpinLink(linkId) {
        const token = await this.getAuthToken();
        const response = await fetch(getApiUrl(`/api/links/${linkId}/unpin`), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to unpin link');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to unpin link');
        }

        return result;
    },

    async archiveLink(linkId) {
        const token = await this.getAuthToken();
        const response = await fetch(getApiUrl(`/api/links/${linkId}/archive`), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to archive link');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to archive link');
        }

        return result;
    },

    async restoreLink(linkId) {
        const token = await this.getAuthToken();
        const response = await fetch(getApiUrl(`/api/links/${linkId}/restore`), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to restore link');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to restore link');
        }

        return result;
    },
};