// src/utils/config.js
// Determine if we're in development or production
const isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development'

// API Configuration
export const config = {
    // API Base URL - uses environment variable or defaults
    apiBaseUrl: import.meta.env.VITE_API_URL,

    // App Configuration
    appName: 'Savlink',
    appVersion: '1.0.0',

    // Feature flags
    features: {
        googleAuth: true, // Enable Google OAuth
        emailVerification: true,
        passwordReset: true,
        rememberMe: true,
    },

    // Token configuration
    tokens: {
        accessTokenKey: 'savlink_access_token',
        refreshTokenKey: 'savlink_refresh_token',
        userDataKey: 'savlink_user',
        tokenExpiry: 15 * 60 * 1000, // 15 minutes in ms
        refreshExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    },

    // API Endpoints
    endpoints: {
        auth: {
            register: '/api/auth/register',
            login: '/api/auth/login',
            logout: '/api/auth/logout',
            refresh: '/api/auth/refresh',
            verifyEmail: '/api/auth/verify-email',
            resendVerification: '/api/auth/resend-verification',
            forgotPassword: '/api/auth/forgot-password',
            resetPassword: '/api/auth/reset-password',
            changePassword: '/api/auth/change-password',
            deleteAccount: '/api/auth/delete-account',
            profile: '/auth/me', // This matches backend
        },
        links: {
            base: '/api/links',
            collections: '/api/collections',
            tags: '/api/tags',
            search: '/api/links/search',
            analytics: '/api/analytics',
        },
        dashboard: {
            links: '/api/dashboard/links',
            stats: '/api/dashboard/stats'
        }
    },

    // UI Configuration
    ui: {
        toastDuration: 4000,
        animationDuration: 300,
        debounceDelay: 500,
    },

    // Validation rules
    validation: {
        password: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumber: true,
            requireSpecial: true,
            specialCharacters: '!@#$%^&*(),.?":{}|<>\\-_=+\\[\\]\\\\;\'`~',
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            maxLength: 255,
        },
        name: {
            minLength: 2,
            maxLength: 100,
        },
    },

    // Development/Production specific settings
    isDevelopment,
    isProduction: !isDevelopment,

    // Debugging
    debug: isDevelopment,
    logLevel: isDevelopment ? 'debug' : 'error',
}

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
    const baseUrl = config.apiBaseUrl.replace(/\/$/, '') // Remove trailing slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${baseUrl}${cleanEndpoint}`
}

// Environment-specific logging
export const log = {
    debug: (...args) => {
        if (config.debug) console.log('[DEBUG]', ...args)
    },
    info: (...args) => {
        if (config.logLevel !== 'error') console.info('[INFO]', ...args)
    },
    warn: (...args) => {
        console.warn('[WARN]', ...args)
    },
    error: (...args) => {
        console.error('[ERROR]', ...args)
    },
}

// Export default for convenience
export default config