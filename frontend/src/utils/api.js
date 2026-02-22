import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://savlinks-test-g445.onrender.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: new Date().getTime(),
      };
    }

    if (import.meta.env.DEV) {
      console.log(`🔄 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        params: config.params,
        data: config.data,
        headers: config.headers,
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    if (response.data) {
      return {
        success: true,
        data: response.data,
        status: response.status,
      };
    }
    return response;
  },
  (error) => {
    let message = 'An error occurred';
    let status = 500;

    if (error.response) {
      status = error.response.status;
      message =
        error.response.data?.error ||
        error.response.data?.message ||
        `Error ${status}`;

      switch (status) {
        case 401:
          console.warn('🔓 Authentication failed');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          message = 'Session expired. Please login again.';
          break;
        case 403:
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
      }
    } else if (error.request) {
      message = 'Network error. Please check your connection.';
    }

    if (status !== 401 && status !== 404) {
      toast.error(message);
    }

    return {
      success: false,
      error: message,
      status,
      data: null,
    };
  }
);

const apiService = {
  get: async (url, params = {}) => {
    return await api.get(url, { params });
  },

  post: async (url, data = {}) => {
    return await api.post(url, data);
  },

  put: async (url, data = {}) => {
    return await api.put(url, data);
  },

  patch: async (url, data = {}) => {
    return await api.patch(url, data);
  },

  delete: async (url) => {
    return await api.delete(url);
  },

  upload: async (url, formData, onProgress) => {
    return await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },

  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem('auth_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common['Authorization'];
    }
  },

  removeAuthToken: () => {
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
  },

  getAuthToken: () => {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

  getBaseUrl: () => {
    return api.defaults.baseURL;
  },
};

export default apiService;