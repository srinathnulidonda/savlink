// src/utils/auth.js - PRODUCTION GRADE FIX
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithRedirect,
    signInWithPopup,
    getRedirectResult,
    GoogleAuthProvider,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence
} from 'firebase/auth'
import { app } from '../config/firebase'
import axios from 'axios'

const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

// Configure Google Provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
})

// Production API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
axios.defaults.baseURL = API_BASE_URL
axios.defaults.timeout = 30000

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// Storage keys
const STORAGE_KEYS = {
    PERSISTENCE_TYPE: 'savlink_auth_persistence',
    USER_PREFERENCE: 'savlink_remember_preference',
    AUTH_TIMESTAMP: 'savlink_auth_timestamp'
}

// Request interceptor
axios.interceptors.request.use(
    config => {
        config.metadata = { startTime: new Date() }
        return config
    },
    error => Promise.reject(error)
)

// Response interceptor with enhanced retry logic
axios.interceptors.response.use(
    response => {
        const duration = new Date() - response.config.metadata.startTime
        if (duration > 10000) {
            console.warn(`Slow API call: ${response.config.url} took ${duration}ms`)
        }
        return response
    },
    async error => {
        const config = error.config

        if (!config || !config.retry) {
            config.retry = 0
        }

        // Retry on timeout or network errors
        const shouldRetry =
            config.retry < MAX_RETRIES &&
            (error.code === 'ECONNABORTED' ||
                error.code === 'NETWORK_ERROR' ||
                error.message.includes('timeout') ||
                (error.response && error.response.status >= 500))

        if (shouldRetry) {
            config.retry++
            console.log(`Retrying request (${config.retry}/${MAX_RETRIES}): ${config.url}`)

            // Exponential backoff
            await new Promise(resolve =>
                setTimeout(resolve, RETRY_DELAY * Math.pow(2, config.retry - 1))
            )

            // Increase timeout for retries
            config.timeout = config.timeout * 1.5

            return axios(config)
        }

        return Promise.reject(error)
    }
)

// Enhanced warmup for cold starts
let warmupInterval = null
let isWarmedUp = false

const startWarmup = () => {
    if (warmupInterval) return

    const warmup = async () => {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)

            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (response.ok) {
                isWarmedUp = true
                console.log('✅ Backend warmed up')
            }
        } catch (e) {
            // Silent fail
        }
    }

    // Aggressive initial warmup
    warmup() // Immediate
    setTimeout(warmup, 2000)  // 2 seconds
    setTimeout(warmup, 5000)  // 5 seconds
    setTimeout(warmup, 10000) // 10 seconds

    // Regular keepalive
    warmupInterval = setInterval(warmup, 2 * 60 * 1000) // Every 2 minutes
}

const stopWarmup = () => {
    if (warmupInterval) {
        clearInterval(warmupInterval)
        warmupInterval = null
    }
}

// Auth state management
let currentUser = null
let authStateListeners = []
let authInitialized = false
let authInitPromise = null

// Enhanced storage availability check
const checkStorage = (storage) => {
    try {
        const test = '__storage_test__'
        storage.setItem(test, 'test')
        const value = storage.getItem(test)
        storage.removeItem(test)
        return value === 'test'
    } catch (e) {
        return false
    }
}

const hasSessionStorage = checkStorage(sessionStorage)
const hasLocalStorage = checkStorage(localStorage)

// Get safe storage with fallback
const safeStorage = {
    setItem: (key, value) => {
        try {
            if (hasLocalStorage) {
                localStorage.setItem(key, value)
                return true
            }
        } catch (e) {
            console.warn('Failed to set localStorage:', e)
        }
        return false
    },
    getItem: (key) => {
        try {
            if (hasLocalStorage) {
                return localStorage.getItem(key)
            }
        } catch (e) {
            console.warn('Failed to get localStorage:', e)
        }
        return null
    },
    removeItem: (key) => {
        try {
            if (hasLocalStorage) {
                localStorage.removeItem(key)
                return true
            }
        } catch (e) {
            console.warn('Failed to remove from localStorage:', e)
        }
        return false
    }
}

// Determine the best persistence strategy
const getBestPersistence = () => {
    // Check user preference first
    const userPreference = safeStorage.getItem(STORAGE_KEYS.USER_PREFERENCE)

    // If user explicitly chose "Don't remember me", respect that
    if (userPreference === 'session') {
        return browserSessionPersistence
    }

    // Default to local persistence for better UX
    // This ensures users stay logged in across browser restarts
    if (hasLocalStorage) {
        return browserLocalPersistence
    }

    // Fallback to session if localStorage is not available
    if (hasSessionStorage) {
        console.warn('localStorage not available, falling back to session persistence')
        return browserSessionPersistence
    }

    // Last resort: in-memory persistence
    console.warn('No storage available, using in-memory persistence')
    return inMemoryPersistence
}

// Initialize auth with robust persistence handling
const initializeAuth = async () => {
    if (authInitPromise) return authInitPromise

    authInitPromise = new Promise(async (resolve) => {
        try {
            console.log('🔐 Initializing authentication...')

            // Set persistence with fallback chain
            const persistence = getBestPersistence()

            try {
                await setPersistence(auth, persistence)
                console.log(`✅ Auth persistence set to: ${persistence.type}`)

                // Store the persistence type for debugging
                safeStorage.setItem(STORAGE_KEYS.PERSISTENCE_TYPE, persistence.type)
            } catch (persistenceError) {
                console.error('Failed to set persistence, using fallback:', persistenceError)

                // Try fallback persistence options
                const fallbacks = [browserSessionPersistence, inMemoryPersistence]
                for (const fallback of fallbacks) {
                    try {
                        await setPersistence(auth, fallback)
                        console.log(`✅ Fallback persistence set to: ${fallback.type}`)
                        safeStorage.setItem(STORAGE_KEYS.PERSISTENCE_TYPE, fallback.type)
                        break
                    } catch (e) {
                        continue
                    }
                }
            }

            // Wait for auth state to be restored
            await new Promise((resolve) => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    unsubscribe()
                    resolve(user)
                })
            })

            // Handle redirect result with enhanced error handling
            try {
                const result = await getRedirectResult(auth)
                if (result?.user) {
                    console.log('🔄 Redirect sign-in completed')
                    await handleSuccessfulAuth(result.user)

                    if (hasSessionStorage) {
                        sessionStorage.removeItem('auth_redirect_pending')
                    }

                    window.dispatchEvent(new CustomEvent('auth-redirect-success', {
                        detail: { user: currentUser }
                    }))
                }
            } catch (redirectError) {
                if (redirectError.code === 'auth/missing-initial-state' ||
                    redirectError.code === 'auth/web-storage-unsupported') {
                    console.warn('⚠️ Redirect state issue, checking current auth')

                    // Give Firebase more time to restore auth state
                    await new Promise(resolve => setTimeout(resolve, 2000))

                    if (auth.currentUser) {
                        console.log('✅ Found authenticated user after delay')
                        await handleSuccessfulAuth(auth.currentUser)
                    }
                } else if (redirectError.code !== 'auth/no-auth-event') {
                    console.error('Redirect error:', redirectError)
                }

                if (hasSessionStorage) {
                    sessionStorage.removeItem('auth_redirect_pending')
                }
            }

            authInitialized = true
            console.log('✅ Auth initialization complete')

            // Start warmup in production
            if (import.meta.env.PROD) {
                startWarmup()
            }

            resolve(true)
        } catch (error) {
            console.error('❌ Auth initialization error:', error)
            authInitialized = true
            resolve(false)
        }
    })

    return authInitPromise
}

// Initialize immediately
initializeAuth()

// Enhanced auth handler with progressive timeouts
async function handleSuccessfulAuth(firebaseUser) {
    if (!firebaseUser) return null

    try {
        const token = await firebaseUser.getIdToken()
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

        // Store auth timestamp
        safeStorage.setItem(STORAGE_KEYS.AUTH_TIMESTAMP, new Date().toISOString())

        // Set Firebase data immediately for UI
        currentUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            avatar_url: firebaseUser.photoURL,
            email_verified: firebaseUser.emailVerified,
            auth_provider: firebaseUser.providerData[0]?.providerId || 'password',
            created_at: firebaseUser.metadata.creationTime,
            last_login_at: firebaseUser.metadata.lastSignInTime,
            firebaseUser,
            _syncedWithBackend: false,
            _syncPending: true
        }

        // Notify listeners immediately
        authStateListeners.forEach(listener => listener(currentUser))

        // Warm up backend if cold
        if (!isWarmedUp && import.meta.env.PROD) {
            console.log('⏳ Warming up backend...')
            try {
                await axios.get('/health', {
                    timeout: 5000,
                    validateStatus: () => true
                })
                isWarmedUp = true
            } catch (e) {
                console.log('⚠️ Backend is cold, will retry...')
            }
        }

        // Backend sync with progressive timeout
        let syncSuccess = false
        const maxAttempts = 3
        const baseTimeout = isWarmedUp ? 10000 : 20000

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🔄 Syncing with backend (attempt ${attempt}/${maxAttempts})...`)

                const timeout = baseTimeout + (attempt - 1) * 10000

                const response = await axios.get('/auth/me', {
                    timeout,
                    validateStatus: (status) => status < 500
                })

                if (response.status === 200 && response.data.success) {
                    currentUser = {
                        ...response.data.data,
                        firebaseUser,
                        _syncedWithBackend: true,
                        _syncPending: false
                    }

                    console.log('✅ Backend sync successful')
                    syncSuccess = true
                    isWarmedUp = true

                    // Notify listeners with synced data
                    authStateListeners.forEach(listener => listener(currentUser))
                    break
                }
            } catch (syncError) {
                console.warn(`Sync attempt ${attempt} failed:`, syncError.message)

                if (attempt < maxAttempts) {
                    // Wait before retry with exponential backoff
                    await new Promise(resolve =>
                        setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000))
                    )
                }
            }
        }

        if (!syncSuccess) {
            console.warn('⚠️ Using Firebase data only (backend sync failed)')
            currentUser._syncedWithBackend = false
            currentUser._syncPending = false
            currentUser._syncError = 'Backend sync failed after retries'

            // Still notify listeners
            authStateListeners.forEach(listener => listener(currentUser))
        }

        return currentUser
    } catch (error) {
        console.error('❌ Auth handler error:', error)
        currentUser = null
        delete axios.defaults.headers.common['Authorization']
        throw error
    }
}

// Robust auth state listener
onAuthStateChanged(auth, async (firebaseUser) => {
    // Skip if auth not initialized to prevent race conditions
    if (!authInitialized) {
        console.log('⏳ Auth state changed but initialization pending...')
        return
    }

    console.log('🔄 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out')

    if (firebaseUser) {
        try {
            await handleSuccessfulAuth(firebaseUser)
        } catch (error) {
            console.error('Auth state change error:', error)
            currentUser = null
        }
    } else {
        currentUser = null
        delete axios.defaults.headers.common['Authorization']
        stopWarmup()

        // Clear auth timestamp
        safeStorage.removeItem(STORAGE_KEYS.AUTH_TIMESTAMP)
    }

    authStateListeners.forEach(listener => listener(currentUser))
})

// Token refresh with retry
let tokenRefreshInterval = null
const startTokenRefresh = () => {
    stopTokenRefresh()

    tokenRefreshInterval = setInterval(async () => {
        if (auth.currentUser) {
            try {
                const token = await auth.currentUser.getIdToken(true)
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
                console.log('🔄 Token refreshed')

                // Retry backend sync if needed
                if (currentUser && !currentUser._syncedWithBackend) {
                    try {
                        const response = await axios.get('/auth/me', { timeout: 15000 })
                        if (response.data.success) {
                            currentUser = {
                                ...response.data.data,
                                firebaseUser: auth.currentUser,
                                _syncedWithBackend: true
                            }
                            authStateListeners.forEach(listener => listener(currentUser))
                        }
                    } catch (e) {
                        // Silent fail
                    }
                }
            } catch (error) {
                console.error('Token refresh failed:', error)

                // If token refresh fails, try to re-authenticate
                if (error.code === 'auth/user-token-expired') {
                    try {
                        await auth.currentUser.reload()
                        const newToken = await auth.currentUser.getIdToken(true)
                        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
                    } catch (reloadError) {
                        console.error('Failed to reload user:', reloadError)
                    }
                }
            }
        }
    }, 45 * 60 * 1000) // 45 minutes
}

const stopTokenRefresh = () => {
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval)
        tokenRefreshInterval = null
    }
}

// Auto-start token refresh
onAuthStateChanged(auth, (user) => {
    if (user) {
        startTokenRefresh()
        if (import.meta.env.PROD) {
            startWarmup()
        }
    } else {
        stopTokenRefresh()
        stopWarmup()
    }
})

export const AuthService = {
    async ensureInitialized() {
        if (!authInitialized) {
            await initializeAuth()
        }
        return authInitialized
    },

    async register({ email, password, name }) {
        try {
            await this.ensureInitialized()

            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            if (name) {
                await updateProfile(user, { displayName: name })
            }

            // Always use local persistence for new registrations
            await setPersistence(auth, browserLocalPersistence)
            safeStorage.setItem(STORAGE_KEYS.USER_PREFERENCE, 'local')

            await sendEmailVerification(user, {
                url: `${window.location.origin}/login?email=${encodeURIComponent(email)}`
            })

            const userData = await handleSuccessfulAuth(user)

            return {
                success: true,
                data: {
                    user: userData,
                    token: await user.getIdToken()
                }
            }
        } catch (error) {
            console.error('Registration error:', error)
            return {
                success: false,
                error: {
                    code: error.code,
                    message: this.getErrorMessage(error.code)
                }
            }
        }
    },

    async login({ email, password, rememberMe = true }) {
        try {
            await this.ensureInitialized()

            // Set persistence based on user choice
            const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence

            try {
                await setPersistence(auth, persistence)
                safeStorage.setItem(STORAGE_KEYS.USER_PREFERENCE, rememberMe ? 'local' : 'session')
            } catch (persistError) {
                console.warn('Failed to set persistence, continuing with current setting:', persistError)
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const userData = await handleSuccessfulAuth(userCredential.user)

            return {
                success: true,
                data: {
                    user: userData,
                    token: await userCredential.user.getIdToken()
                },
                message: 'Welcome back!'
            }
        } catch (error) {
            console.error('Login error:', error)
            return {
                success: false,
                error: {
                    code: error.code,
                    message: this.getErrorMessage(error.code)
                }
            }
        }
    },

    async loginWithGoogle(forceRedirect = false) {
        try {
            await this.ensureInitialized()

            // Always set local persistence for social logins
            try {
                await setPersistence(auth, browserLocalPersistence)
                safeStorage.setItem(STORAGE_KEYS.USER_PREFERENCE, 'local')
            } catch (e) {
                console.warn('Failed to set persistence for Google login')
            }

            // Detect if we should use redirect
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            const hasStorageIssues = !hasSessionStorage || !hasLocalStorage
            const isIframe = window !== window.parent
            const isPrivateBrowsing = !hasLocalStorage && hasSessionStorage

            // Check for COOP issues
            let hasCOOPIssues = false
            try {
                hasCOOPIssues = window.crossOriginIsolated === true
            } catch (e) {
                // Can't detect, assume false
            }

            const shouldUseRedirect = forceRedirect || isMobile || hasStorageIssues ||
                isIframe || hasCOOPIssues || isPrivateBrowsing

            if (shouldUseRedirect) {
                console.log('Using redirect flow for Google sign-in')
                if (hasSessionStorage) {
                    sessionStorage.setItem('auth_redirect_pending', 'true')
                }
                await signInWithRedirect(auth, googleProvider)
                return {
                    success: true,
                    pending: true,
                    message: 'Redirecting to Google...'
                }
            }

            // Try popup
            try {
                const userCredential = await signInWithPopup(auth, googleProvider)
                const userData = await handleSuccessfulAuth(userCredential.user)

                return {
                    success: true,
                    data: {
                        user: userData,
                        token: await userCredential.user.getIdToken()
                    },
                    message: 'Welcome!'
                }
            } catch (popupError) {
                // Fallback to redirect if popup fails
                if (popupError.code === 'auth/popup-blocked' ||
                    popupError.code === 'auth/cancelled-popup-request' ||
                    popupError.code === 'auth/popup-closed-by-user') {

                    if (popupError.code === 'auth/popup-closed-by-user') {
                        return { success: false, cancelled: true }
                    }

                    console.log('Popup failed, using redirect')
                    return this.loginWithGoogle(true)
                }

                throw popupError
            }
        } catch (error) {
            console.error('Google login error:', error)

            if (error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/cancelled-popup-request') {
                return { success: false, cancelled: true }
            }

            return {
                success: false,
                error: {
                    code: error.code,
                    message: this.getErrorMessage(error.code)
                }
            }
        }
    },

    async logout() {
        try {
            await signOut(auth)
            delete axios.defaults.headers.common['Authorization']

            // Clear stored preferences
            safeStorage.removeItem(STORAGE_KEYS.USER_PREFERENCE)
            safeStorage.removeItem(STORAGE_KEYS.AUTH_TIMESTAMP)
            safeStorage.removeItem(STORAGE_KEYS.PERSISTENCE_TYPE)

            if (hasSessionStorage) {
                sessionStorage.clear()
            }

            stopTokenRefresh()
            stopWarmup()
            currentUser = null

            return { success: true }
        } catch (error) {
            console.error('Logout error:', error)
            return {
                success: false,
                error: { message: 'Failed to sign out' }
            }
        }
    },

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email, {
                url: `${window.location.origin}/login`,
                handleCodeInApp: false
            })

            return {
                success: true,
                message: 'Password reset email sent.'
            }
        } catch (error) {
            return {
                success: false,
                error: {
                    code: error.code,
                    message: this.getErrorMessage(error.code)
                }
            }
        }
    },

    async resendVerificationEmail() {
        try {
            const user = auth.currentUser
            if (!user) throw new Error('No user logged in')

            await sendEmailVerification(user, {
                url: `${window.location.origin}/login?email=${encodeURIComponent(user.email)}`
            })

            return {
                success: true,
                message: 'Verification email sent'
            }
        } catch (error) {
            return {
                success: false,
                error: { message: 'Failed to send verification email' }
            }
        }
    },

    getCurrentUser() {
        return currentUser
    },

    getFirebaseUser() {
        return auth.currentUser
    },

    isAuthenticated() {
        return !!auth.currentUser
    },

    isBackendSynced() {
        return currentUser?._syncedWithBackend || false
    },

    getSyncStatus() {
        if (!currentUser) return { synced: false, reason: 'not_authenticated' }

        return {
            synced: currentUser._syncedWithBackend || false,
            pending: currentUser._syncPending || false,
            error: currentUser._syncError || null
        }
    },

    async getIdToken(forceRefresh = false) {
        try {
            if (auth.currentUser) {
                return await auth.currentUser.getIdToken(forceRefresh)
            }
            return null
        } catch (error) {
            console.error('Get ID token error:', error)
            return null
        }
    },

    onAuthStateChange(callback) {
        authStateListeners.push(callback)

        // If already initialized, call immediately with current state
        if (authInitialized) {
            callback(currentUser)
        }

        return () => {
            authStateListeners = authStateListeners.filter(listener => listener !== callback)
        }
    },

    async retryBackendSync() {
        if (auth.currentUser) {
            try {
                console.log('Manual backend sync retry...')
                await handleSuccessfulAuth(auth.currentUser)
                return {
                    success: true,
                    synced: currentUser?._syncedWithBackend || false
                }
            } catch (error) {
                return { success: false, error: error.message }
            }
        }
        return { success: false, error: 'No authenticated user' }
    },

    // Debug methods for production issues
    async debugAuthState() {
        const debugInfo = {
            initialized: authInitialized,
            hasCurrentUser: !!currentUser,
            hasFirebaseUser: !!auth.currentUser,
            persistenceType: safeStorage.getItem(STORAGE_KEYS.PERSISTENCE_TYPE),
            userPreference: safeStorage.getItem(STORAGE_KEYS.USER_PREFERENCE),
            lastAuthTime: safeStorage.getItem(STORAGE_KEYS.AUTH_TIMESTAMP),
            storageAvailable: {
                local: hasLocalStorage,
                session: hasSessionStorage
            }
        }

        console.log('🔍 Auth Debug Info:', debugInfo)
        return debugInfo
    },

    getErrorMessage(code) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/operation-not-allowed': 'This operation is not allowed.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/too-many-requests': 'Too many failed attempts. Try again later.',
            'auth/network-request-failed': 'Network error. Check your connection.',
            'auth/popup-closed-by-user': 'Sign-in was cancelled.',
            'auth/cancelled-popup-request': 'Another sign-in in progress.',
            'auth/account-exists-with-different-credential': 'Account exists with different sign-in method.',
            'auth/popup-blocked': 'Sign-in popup blocked. Please allow popups.',
            'auth/requires-recent-login': 'Please login again.',
            'auth/missing-initial-state': 'Session storage issue detected. Please try again.',
            'auth/user-token-expired': 'Your session has expired. Please login again.'
        }

        return errorMessages[code] || 'An error occurred. Please try again.'
    }
}

// Export for debugging in production
if (typeof window !== 'undefined') {
    window.SavlinkAuth = {
        debugAuthState: AuthService.debugAuthState,
        getCurrentUser: AuthService.getCurrentUser,
        getFirebaseUser: AuthService.getFirebaseUser
    }
}

export { auth }