// frontend/src/auth/guards/RequireAuth.jsx

import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AuthLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
      </div>
    </div>
  )
}

export function RequireAuth({ children }) {
  const { user, loading, initialized } = useAuth()
  const location = useLocation()
  const [graceActive, setGraceActive] = useState(true)

  const hasToken = !!localStorage.getItem('savlink_token')
  const hasUserData = !!localStorage.getItem('savlink_user')

  useEffect(() => {
    const timer = setTimeout(() => setGraceActive(false), 3000)
    if (user) {
      setGraceActive(false)
      clearTimeout(timer)
    }
    return () => clearTimeout(timer)
  }, [user])

  if (!initialized || loading) {
    return <AuthLoader />
  }

  if (user) {
    return children
  }

  if ((hasToken || hasUserData) && graceActive) {
    return <AuthLoader />
  }

  return <Navigate to="/login" state={{ from: location }} replace />
}