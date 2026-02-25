// frontend/src/utils/api.js

import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL

//  Axios Instance 
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false
})

//  Request Deduplication 
const _inflight = new Map()
const _recentResults = new Map()
const DEDUP_WINDOW_MS = 2000  

function _dedupKey(url, params) {
  const cleanParams = { ...params }
  delete cleanParams._t  
  return `GET:${url}:${JSON.stringify(cleanParams)}`
}

function _dedupGet(url, params = {}) {
  const key = _dedupKey(url, params)

  if (_inflight.has(key)) {
    return _inflight.get(key)
  }

  const recent = _recentResults.get(key)
  if (recent && Date.now() - recent.time < DEDUP_WINDOW_MS) {
    return Promise.resolve(recent.result)
  }

  const promise = api.get(url, { params })
    .then(result => {
      _recentResults.set(key, { time: Date.now(), result })
      if (_recentResults.size > 50) {
        const oldest = _recentResults.keys().next().value
        _recentResults.delete(oldest)
      }
      return result
    })
    .finally(() => {
      _inflight.delete(key)
    })

  _inflight.set(key, promise)
  return promise
}

//  Token Refresh Queue 
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

async function attemptTokenRefresh() {
  try {
    const { AuthService } = await import('../auth/services/auth.service')
    const newToken = await AuthService.getIdToken(true)
    if (newToken) {
      localStorage.setItem('savlink_token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      return newToken
    }
    return null
  } catch (error) {
    console.error('[API] Token refresh failed:', error)
    return null
  }
}

//  Request Interceptor 
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('savlink_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    config._requestId = Math.random().toString(36).substring(2, 9)
    config._startTime = Date.now()

    if (import.meta.env.DEV) {
      console.log(`🔄 [${config._requestId}] ${config.method?.toUpperCase()} ${config.url}`)
    }

    return config
  },
  (error) => Promise.reject(error)
)

//  Response Interceptor 
api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config._startTime || Date.now())

    if (import.meta.env.DEV) {
      const status = duration > 3000 ? '🐌' : '✅'
      console.log(`${status} [${response.config._requestId}] ${response.config.url} (${duration}ms)`)
    }

    return {
      success: true,
      data: response.data,
      status: response.status
    }
  },
  async (error) => {
    const originalRequest = error.config

    //  Handle 401: Token refresh + retry 
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await attemptTokenRefresh()
        if (newToken) {
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } else {
          processQueue(new Error('Token refresh failed'), null)
          handleAuthFailure()
          return createErrorResponse('Session expired. Please sign in again.', 401)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        handleAuthFailure()
        return createErrorResponse('Session expired. Please sign in again.', 401)
      } finally {
        isRefreshing = false
      }
    }

    return handleApiError(error)
  }
)

//  Error Handling 
function handleApiError(error) {
  let message = 'An unexpected error occurred'
  let status = 0

  if (error.response) {
    status = error.response.status
    message = error.response.data?.error || error.response.data?.message || `Error ${status}`

    const errorMap = {
      400: message,
      403: 'You do not have permission for this action',
      404: 'Resource not found',
      409: 'Conflict: Resource already exists',
      422: message || 'Invalid data provided',
      429: 'Too many requests. Please wait a moment.',
      500: 'Server error. Please try again later.',
      502: 'Server is temporarily unavailable.',
      503: 'Service is under maintenance.',
      504: 'Request timed out. Please try again.'
    }

    message = errorMap[status] || message

    // Show toast for user-relevant errors (not 401, 404, 429)
    if (![401, 404, 429].includes(status)) {
      toast.error(message)
    }
  } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    message = 'Request timed out. Please try again.'
    toast.error(message)
  } else if (error.request) {
    message = 'Network error. Please check your connection.'
    toast.error(message)
  }

  return {
    success: false,
    error: message,
    status,
    data: null
  }
}

function handleAuthFailure() {
  localStorage.removeItem('savlink_token')
  localStorage.removeItem('savlink_user')
  delete api.defaults.headers.common['Authorization']
  window.dispatchEvent(new CustomEvent('auth:session-expired', {
    detail: { reason: 'api_401' }
  }))
}

function createErrorResponse(message, status) {
  return { success: false, error: message, status, data: null }
}

//  API Service 
const apiService = {
  get: (url, params = {}) => _dedupGet(url, params),

  post:   (url, data = {})  => api.post(url, data),
  put:    (url, data = {})  => api.put(url, data),
  patch:  (url, data = {})  => api.patch(url, data),
  delete: (url, data)       => api.delete(url, data ? { data } : undefined),

  upload: (url, formData, onProgress) => {
    return api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      }
    })
  },

  setAuthToken(token) {
    if (token) {
      localStorage.setItem('savlink_token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  },
  removeAuthToken() {
    localStorage.removeItem('savlink_token')
    delete api.defaults.headers.common['Authorization']
  },
  getAuthToken()     { return localStorage.getItem('savlink_token') },
  isAuthenticated()  { return !!localStorage.getItem('savlink_token') },
  getBaseUrl()       { return API_BASE_URL },

  invalidateCache() {
    _recentResults.clear()
  }
}

export default apiService
export { api }