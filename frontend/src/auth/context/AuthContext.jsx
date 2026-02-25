// frontend/src/auth/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { AuthService } from '../services/auth.service'
import apiService from '../../utils/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('savlink_user')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const unsubscribe = AuthService.onAuthStateChange(({ user: authUser, token }) => {
      if (!mountedRef.current) return

      if (authUser) {
        setUser(authUser)
        if (token) apiService.setAuthToken(token)
      } else {
        setUser(null)
        apiService.removeAuthToken()
      }
      setLoading(false)
      setInitialized(true)
    })

    AuthService.ensureInitialized().then(() => {
      if (mountedRef.current) {
        setLoading(false)
        setInitialized(true)
      }
    })

    const safety = setTimeout(() => {
      if (mountedRef.current && loading) {
        setLoading(false)
        setInitialized(true)
      }
    }, 6000)

    return () => {
      mountedRef.current = false
      unsubscribe()
      clearTimeout(safety)
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      setUser(null)
      apiService.removeAuthToken()
    }
    window.addEventListener('auth:session-expired', handler)
    return () => window.removeEventListener('auth:session-expired', handler)
  }, [])

  const signIn = useCallback(async (email, password, rememberMe = true) => {
    setLoading(true)
    try {
      return await AuthService.login({ email, password, rememberMe })
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const signUp = useCallback(async (email, password, name) => {
    setLoading(true)
    try {
      return await AuthService.register({ email, password, name })
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    try {
      return await AuthService.loginWithGoogle()
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      return await AuthService.logout()
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [])

  const resetPassword = useCallback(async (email) => {
    try {
      return await AuthService.resetPassword(email)
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [])

  const value = {
    user,
    loading,
    initialized,
    authenticated: !!user,
    synced: user?._synced === true,
    emailVerified: user?.email_verified ?? false,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    getToken: () => AuthService.getIdToken(),
    forceSync: () => AuthService.forceSync(),
    getFirebaseUser: () => AuthService.getFirebaseUser(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}