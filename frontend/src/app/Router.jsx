// frontend/src/app/Router.jsx
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, lazy } from 'react'
import { RequireAuth } from '../auth/guards/RequireAuth'
import Home from '../public-site/pages/Home'
import VerifyEmail from '../auth/pages/VerifyEmail'

const Login = lazy(() => import('../auth/pages/Login'))
const Register = lazy(() => import('../auth/pages/Register'))
const Dashboard = lazy(() => import('../dashboard/DashboardApp'))
const NotFound = lazy(() => import('../public-site/pages/NotFound'))

function RedirectHandler() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const redirectPath = params.get('redirect')

    if (redirectPath && redirectPath !== location.pathname) {
      navigate(redirectPath, { replace: true })
      return
    }

    if (window.location.hash && window.location.hash.length > 1) {
      const hashPath = window.location.hash.substring(1)
      if (hashPath !== location.pathname && hashPath.startsWith('/')) {
        window.history.replaceState(null, '', hashPath)
        navigate(hashPath, { replace: true })
      }
    }
  }, [location, navigate])

  return null
}

function ScrollRestoration() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
    } else {
      const el = document.getElementById(location.hash.substring(1))
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location.pathname])

  return null
}

export default function Router() {
  return (
    <>
      <RedirectHandler />
      <ScrollRestoration />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/callback" element={<Login />} />

        <Route
          path="/dashboard/*"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/sign-in" element={<Navigate to="/login" replace />} />
        <Route path="/sign-up" element={<Navigate to="/register" replace />} />
        <Route path="/log-in" element={<Navigate to="/login" replace />} />
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}