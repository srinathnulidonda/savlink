// frontend/src/config/config.js

export const config = {
    apiBaseUrl: import.meta.env.VITE_API_URL,
    
    appName: 'Savlink',
    appVersion: '.001',

    features: {
        googleAuth: true,
        emailVerification: true,
        passwordReset: true,
        rememberMe: true,
    },

    tokens: {
        accessTokenKey: 'auth_token',
        refreshTokenKey: 'savlink_refresh_token',
        userDataKey: 'user',
        tokenExpiry: 15 * 60 * 1000,
        refreshExpiry: 7 * 24 * 60 * 60 * 1000,
    },

    endpoints: {
        auth: {
            register: '/auth/register',
            login: '/auth/login',
            logout: '/auth/logout',
            refresh: '/auth/refresh',
            verifyEmail: '/auth/verify-email',
            resendVerification: '/auth/resend-verification',
            forgotPassword: '/auth/forgot-password',
            resetPassword: '/auth/reset-password',
            changePassword: '/auth/change-password',
            deleteAccount: '/auth/delete-account',
            profile: '/auth/me',
        },
        links: {
            base: '/api/links',
            collections: '/api/folders',
            tags: '/api/tags',
            search: '/api/search',
            analytics: '/api/analytics',
        },
        dashboard: {
            links: '/api/dashboard/links',
            stats: '/api/dashboard/stats',
            home: '/api/dashboard/home'
        }
    },

    ui: {
        toastDuration: 4000,
        animationDuration: 300,
        debounceDelay: 500,
    },

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
}

export const getApiUrl = (endpoint) => {
    const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
}

export default config