// frontend/src/auth/services/auth.service.js

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth'
import { app } from '../../config/firebase'

const API_BASE_URL = import.meta.env.VITE_API_URL

const STORAGE_KEYS = {
  TOKEN: 'savlink_token',
  USER: 'savlink_user',
  PREFERENCE: 'savlink_persist',
  LAST_SYNC: 'savlink_last_sync'
}

const TIMING = {
  TOKEN_REFRESH_MS: 50 * 60 * 1000,
  BACKGROUND_SYNC_MS: 5 * 60 * 1000,
  BACKEND_SYNC_DELAY_MS: 300,
  STALE_THRESHOLD_MS: 10 * 60 * 1000,
  MAX_RETRY_MS: 15000,
  INIT_TIMEOUT_MS: 8000
}

const SYNC_MAX_ATTEMPTS = 3

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Another sign-in popup is already open.',
  'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
  'auth/account-exists-with-different-credential': 'Account exists with a different sign-in method.',
  'auth/requires-recent-login': 'Please sign in again for security.',
  'auth/user-token-expired': 'Session expired. Please sign in again.',
  'auth/missing-initial-state': 'Browser session issue. Please try again.'
}

//  Firebase Setup 
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
googleProvider.addScope('email')
googleProvider.addScope('profile')

//  Internal State 
let _currentUser = null
let _currentToken = null
let _listeners = new Set()
let _initialized = false
let _initPromise = null
let _tokenRefreshTimer = null
let _backgroundSyncTimer = null
let _isSyncing = false
let _lastSyncTime = 0
let _googleLoginInProgress = false
let _authStateVersion = 0

//  Safe Storage 
const storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    } catch { /* quota exceeded or private browsing */ }
  },
  get(key, parse = true) {
    try {
      const val = localStorage.getItem(key)
      if (!val) return null
      return parse ? JSON.parse(val) : val
    } catch { return null }
  },
  remove(key) {
    try { localStorage.removeItem(key) } catch { /* noop */ }
  },
  clear() {
    Object.values(STORAGE_KEYS).forEach(key => this.remove(key))
    this.remove('auth_token')
    this.remove('user')
    this.remove('savlink_cached_user')
    this.remove('savlink_cached_token')
    this.remove('savlink_cache_timestamp')
    this.remove('savlink_token_expiry')
    this.remove('savlink_auth_persistence')
    this.remove('savlink_remember_preference')
    this.remove('savlink_auth_timestamp')
  }
}

//  Notification System 
function notifyListeners() {
  _authStateVersion++
  const snapshot = { user: _currentUser, token: _currentToken }
  _listeners.forEach(fn => {
    try { fn(snapshot) } catch (e) { console.error('Auth listener error:', e) }
  })
}

//  Token Management 
async function refreshToken(force = false) {
  const firebaseUser = auth.currentUser
  if (!firebaseUser) {
    _currentToken = null
    storage.remove(STORAGE_KEYS.TOKEN)
    return null
  }

  try {
    const token = await firebaseUser.getIdToken(force)
    _currentToken = token
    storage.set(STORAGE_KEYS.TOKEN, token)
    return token
  } catch (error) {
    console.error('[Auth] Token refresh failed:', error.code || error.message)
    if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-not-found') {
      await handleSignOut('token_expired')
    }
    return null
  }
}

function startTokenRefreshTimer() {
  stopTokenRefreshTimer()
  _tokenRefreshTimer = setInterval(async () => {
    if (auth.currentUser) await refreshToken(true)
  }, TIMING.TOKEN_REFRESH_MS)
}

function stopTokenRefreshTimer() {
  if (_tokenRefreshTimer) { clearInterval(_tokenRefreshTimer); _tokenRefreshTimer = null }
}

//  Wait for auth state to propagate 
async function _waitForAuthReady(timeoutMs = 3000) {
  const startVersion = _authStateVersion
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (_currentUser && _authStateVersion > startVersion) {
      await new Promise(r => setTimeout(r, 50))
      return _currentUser
    }
    await new Promise(r => setTimeout(r, 30))
  }

  return _currentUser
}

//  Backend Sync 
async function syncWithBackend(token, forceSync = false, _attempt = 0) {
  if (_isSyncing && _attempt === 0) return _currentUser

  const now = Date.now()
  if (!forceSync && _attempt === 0 && now - _lastSyncTime < TIMING.STALE_THRESHOLD_MS) {
    return _currentUser
  }

  _isSyncing = true

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMING.MAX_RETRY_MS)

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      signal: controller.signal,
      credentials: 'omit',
      mode: 'cors'
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data) {
        _currentUser = {
          ...data.data,
          email_verified: auth.currentUser?.emailVerified ?? data.data.email_verified,
          _synced: true,
          _lastSync: now
        }
        storage.set(STORAGE_KEYS.USER, _currentUser)
        storage.set(STORAGE_KEYS.LAST_SYNC, now)
        _lastSyncTime = now
        notifyListeners()
        return _currentUser
      }
    }

    const retryable = [401, 502, 503]
    if (retryable.includes(response.status) && _attempt < SYNC_MAX_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, _attempt), 5000)
      _isSyncing = false
      await new Promise(r => setTimeout(r, delay))
      if (response.status === 401) {
        const freshToken = await refreshToken(true)
        if (freshToken) return syncWithBackend(freshToken, true, _attempt + 1)
      } else {
        return syncWithBackend(token, true, _attempt + 1)
      }
    }

    return _currentUser
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.warn('[Auth] Backend sync failed:', error.message)
    }
    if (_attempt < SYNC_MAX_ATTEMPTS && error.name !== 'AbortError') {
      _isSyncing = false
      const delay = Math.min(1000 * Math.pow(2, _attempt), 5000)
      await new Promise(r => setTimeout(r, delay))
      return syncWithBackend(token, true, _attempt + 1)
    }
    return _currentUser
  } finally {
    _isSyncing = false
  }
}

function startBackgroundSync() {
  stopBackgroundSync()
  _backgroundSyncTimer = setInterval(async () => {
    if (auth.currentUser && _currentToken) await syncWithBackend(_currentToken)
  }, TIMING.BACKGROUND_SYNC_MS)
}

function stopBackgroundSync() {
  if (_backgroundSyncTimer) { clearInterval(_backgroundSyncTimer); _backgroundSyncTimer = null }
}

//  Auth State Handler 
async function handleAuthStateChange(firebaseUser) {
  if (firebaseUser) {
    const token = await refreshToken(true)
    if (!token) return

    const firebaseData = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
      avatar_url: firebaseUser.photoURL,
      email_verified: firebaseUser.emailVerified,
      auth_provider: firebaseUser.providerData?.[0]?.providerId || 'password',
      created_at: firebaseUser.metadata?.creationTime,
      last_login_at: firebaseUser.metadata?.lastSignInTime,
      _synced: false,
      _lastSync: 0
    }

    storage.set(STORAGE_KEYS.USER, firebaseData)
    storage.set(STORAGE_KEYS.TOKEN, token)
    
    _currentUser = firebaseData
    _currentToken = token
    
    notifyListeners()

    startTokenRefreshTimer()
    startBackgroundSync()
    setTimeout(() => syncWithBackend(token, true), TIMING.BACKEND_SYNC_DELAY_MS)
  } else {
    _currentUser = null
    _currentToken = null
    storage.clear()
    stopTokenRefreshTimer()
    stopBackgroundSync()
    notifyListeners()
  }
}

//  Sign Out Handler 
async function handleSignOut(reason = 'user_action') {
  try {
    stopTokenRefreshTimer()
    stopBackgroundSync()
    _currentUser = null
    _currentToken = null
    _googleLoginInProgress = false
    storage.clear()
    sessionStorage.removeItem('auth_redirect_pending')
    await signOut(auth)
  } catch (error) {
    console.error('[Auth] Sign out error:', error)
  }
  notifyListeners()
  if (reason !== 'user_action') {
    window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { reason } }))
  }
}

//  Initialization 
function initialize() {
  if (_initPromise) return _initPromise

  _initPromise = new Promise(async (resolve) => {
    try {
      const cachedUser = storage.get(STORAGE_KEYS.USER)
      const cachedToken = storage.get(STORAGE_KEYS.TOKEN, false)
      if (cachedUser && cachedToken) {
        _currentUser = { ...cachedUser, _synced: false }
        _currentToken = cachedToken
        notifyListeners()
      }

      const preference = storage.get(STORAGE_KEYS.PREFERENCE, false)
      try {
        await setPersistence(auth, preference === 'session' ? browserSessionPersistence : browserLocalPersistence)
      } catch { /* default */ }

      await Promise.race([
        new Promise((res) => {
          const unsub = onAuthStateChanged(auth, async (user) => {
            unsub()
            await handleAuthStateChange(user)
            res()
          })
        }),
        new Promise((res) => setTimeout(res, TIMING.INIT_TIMEOUT_MS))
      ])

      try {
        const hadPending = sessionStorage.getItem('auth_redirect_pending')
        const result = await getRedirectResult(auth)
        if (result?.user) {
          await handleAuthStateChange(result.user)
          sessionStorage.removeItem('auth_redirect_pending')
          window.dispatchEvent(new CustomEvent('auth:redirect-success'))
        } else if (hadPending) {
          sessionStorage.removeItem('auth_redirect_pending')
        }
      } catch (redirectError) {
        sessionStorage.removeItem('auth_redirect_pending')
        if (redirectError.code !== 'auth/no-auth-event') {
          console.warn('[Auth] Redirect result error:', redirectError.code)
        }
      }

      _initialized = true
      resolve(true)
    } catch (error) {
      console.error('[Auth] Initialization error:', error)
      _initialized = true
      resolve(false)
    }
  })

  return _initPromise
}

onAuthStateChanged(auth, async (user) => {
  if (!_initialized) return
  await handleAuthStateChange(user)
})

initialize()

//  Exported Service 
export const AuthService = {
  async ensureInitialized() {
    if (_initialized) return true
    return initialize()
  },

  async register({ email, password, name }) {
    try {
      await this.ensureInitialized()
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      if (name) await updateProfile(credential.user, { displayName: name })

      await setPersistence(auth, browserLocalPersistence)
      storage.set(STORAGE_KEYS.PREFERENCE, 'local')

      try {
        await sendEmailVerification(credential.user, {
          url: `${window.location.origin}/login?email=${encodeURIComponent(email)}`
        })
      } catch (emailError) {
        console.warn('[Auth] Verification email failed:', emailError.message)
      }

      await _waitForAuthReady(2000)

      return {
        success: true,
        data: { user: _currentUser },
        message: 'Account created! Please verify your email.'
      }
    } catch (error) {
      console.error('[Auth] Registration error:', error.code)
      return { success: false, error: { code: error.code, message: getErrorMessage(error.code) } }
    }
  },

  async login({ email, password, rememberMe = true }) {
    try {
      await this.ensureInitialized()

      try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
        storage.set(STORAGE_KEYS.PREFERENCE, rememberMe ? 'local' : 'session')
      } catch { /* default */ }

      await signInWithEmailAndPassword(auth, email, password)
      await _waitForAuthReady(3000)

      return {
        success: true,
        data: { user: _currentUser },
        message: 'Welcome back!'
      }
    } catch (error) {
      console.error('[Auth] Login error:', error.code)
      return { success: false, error: { code: error.code, message: getErrorMessage(error.code) } }
    }
  },

  async loginWithGoogle() {
    if (_googleLoginInProgress) {
      return { success: false, cancelled: true }
    }

    _googleLoginInProgress = true

    try {
      await this.ensureInitialized()

      try {
        await setPersistence(auth, browserLocalPersistence)
        storage.set(STORAGE_KEYS.PREFERENCE, 'local')
      } catch { /* default */ }

      const mustRedirect = detectRedirectRequired()

      if (!mustRedirect) {
        try {
          await signInWithPopup(auth, googleProvider)
          await _waitForAuthReady(3000)

          return {
            success: true,
            data: { user: _currentUser },
            message: 'Welcome!'
          }
        } catch (popupError) {
          if (popupError.code === 'auth/popup-closed-by-user' ||
              popupError.code === 'auth/cancelled-popup-request') {
            return { success: false, cancelled: true }
          }
          if (popupError.code === 'auth/popup-blocked') {
            console.warn('[Auth] Popup blocked, falling back to redirect')
          } else {
            throw popupError
          }
        }
      }

      try {
        sessionStorage.setItem('auth_redirect_pending', 'true')
        await signInWithRedirect(auth, googleProvider)
        return { success: true, pending: true, message: 'Redirecting to Google...' }
      } catch (redirectError) {
        sessionStorage.removeItem('auth_redirect_pending')
        return {
          success: false,
          error: { code: 'auth/redirect-failed', message: 'Unable to open Google sign-in.' }
        }
      }
    } catch (error) {
      console.error('[Auth] Google login error:', error.code)
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, cancelled: true }
      }
      return { success: false, error: { code: error.code, message: getErrorMessage(error.code) } }
    } finally {
      _googleLoginInProgress = false
    }
  },

  async logout() {
    try {
      await handleSignOut('user_action')
      return { success: true, message: 'Signed out successfully' }
    } catch (error) {
      return { success: false, error: { message: 'Failed to sign out' } }
    }
  },

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false
      })
      return { success: true, message: 'Password reset email sent.' }
    } catch (error) {
      return { success: false, error: { code: error.code, message: getErrorMessage(error.code) } }
    }
  },

  async resendVerificationEmail() {
    try {
      const user = auth.currentUser
      if (!user) return { success: false, error: { message: 'No user signed in' } }
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login?email=${encodeURIComponent(user.email)}`
      })
      return { success: true, message: 'Verification email sent!' }
    } catch (error) {
      return { success: false, error: { message: 'Failed to send verification email.' } }
    }
  },

  getCurrentUser()   { return _currentUser },
  getFirebaseUser()  { return auth.currentUser },
  getToken()         { return _currentToken },
  isAuthenticated()  { return !!_currentUser && !!_currentToken },
  isInitialized()    { return _initialized },
  isSynced()         { return _currentUser?._synced === true },

  async getIdToken(forceRefresh = false) {
    if (!auth.currentUser) return null
    return refreshToken(forceRefresh)
  },

  onAuthStateChange(callback) {
    _listeners.add(callback)

    if (_initialized || _currentUser) {
      try { 
        callback({ user: _currentUser, token: _currentToken }) 
      } catch (e) {
        console.error('[AuthService] Listener callback error:', e)
      }
    }

    return () => _listeners.delete(callback)
  },

  async forceSync() {
    if (!_currentToken) return { success: false, error: 'No token' }
    const token = await refreshToken(true)
    if (!token) return { success: false, error: 'Token refresh failed' }
    const user = await syncWithBackend(token, true)
    return { success: !!user, user }
  },

  clearCache() { storage.clear(); _lastSyncTime = 0 },

  debug() {
    return {
      initialized: _initialized,
      hasUser: !!_currentUser,
      hasFirebaseUser: !!auth.currentUser,
      hasToken: !!_currentToken,
      synced: _currentUser?._synced,
      lastSync: _lastSyncTime,
      listeners: _listeners.size,
      googleLoginActive: _googleLoginInProgress,
      authStateVersion: _authStateVersion,
      persistence: storage.get(STORAGE_KEYS.PREFERENCE, false)
    }
  }
}

//  Helpers 
function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || 'An error occurred. Please try again.'
}

function detectRedirectRequired() {
  const isIframe = window !== window.parent
  let hasStorageIssues = false
  try { sessionStorage.setItem('__test', '1'); sessionStorage.removeItem('__test') }
  catch { hasStorageIssues = true }
  return isIframe || hasStorageIssues
}

//  Cleanup 
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopTokenRefreshTimer()
    stopBackgroundSync()
  })
  if (import.meta.env.DEV) window.__auth = AuthService
}

export { auth }
export default AuthService