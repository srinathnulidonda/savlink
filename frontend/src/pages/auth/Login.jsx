// src/pages/auth/Login.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthService } from '../../utils/auth'
import toast from 'react-hot-toast'

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [loading, setLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)

    const navigate = useNavigate()
    const location = useLocation()

    // Handle auth redirect results
    useEffect(() => {
        const handleAuthEvents = (event) => {
            if (event.type === 'auth-redirect-success') {
                toast.success('Welcome!')
                navigate('/dashboard', { replace: true })
            } else if (event.type === 'auth-redirect-error') {
                setError('Google sign-in failed. Please try again.')
                setLoading(false)
            }
        }

        window.addEventListener('auth-redirect-success', handleAuthEvents)
        window.addEventListener('auth-redirect-error', handleAuthEvents)

        return () => {
            window.removeEventListener('auth-redirect-success', handleAuthEvents)
            window.removeEventListener('auth-redirect-error', handleAuthEvents)
        }
    }, [navigate])

    // Check authentication state
    useEffect(() => {
        const checkAuth = async () => {
            setCheckingAuth(true)

            try {
                await AuthService.ensureInitialized()

                // Check if there's a pending redirect
                const pendingRedirect = sessionStorage.getItem('auth_redirect_pending')
                if (pendingRedirect) {
                    // Show loading state while redirect completes
                    setLoading(true)
                    return
                }

                if (AuthService.isAuthenticated()) {
                    navigate('/dashboard', { replace: true })
                    return
                }
            } catch (error) {
                console.error('Auth check error:', error)
            } finally {
                setCheckingAuth(false)
            }
        }

        checkAuth()

        // Handle navigation state
        if (location.state?.message) {
            toast.success(location.state.message)
        }
        if (location.state?.email) {
            setFormData(prev => ({ ...prev, email: location.state.email }))
        }
    }, [navigate, location])

    // Show loading while checking auth
    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 border-t-2 border-primary rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading...</p>
                </motion.div>
            </div>
        )
    }

    const handleInputChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await AuthService.login({
                email: formData.email.trim(),
                password: formData.password,
                rememberMe
            })

            if (!response.success) {
                setError(response.error?.message || 'Login failed')
                return
            }

            // Check email verification
            const user = AuthService.getFirebaseUser()
            if (user && !user.emailVerified) {
                toast.error('Please verify your email to continue') // FIXED: Changed from toast.warning
                navigate('/verify-email', {
                    state: {
                        email: formData.email,
                        message: 'Please check your email for verification link'
                    }
                })
                return
            }

            toast.success(response.message || 'Welcome back!')
            const from = location.state?.from?.pathname || '/dashboard'
            navigate(from, { replace: true })
        } catch (err) {
            console.error('Login error:', err)
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        setError('')

        try {
            const response = await AuthService.loginWithGoogle()

            if (response.cancelled) {
                setLoading(false)
                return
            }

            if (response.pending) {
                // Redirect flow initiated
                toast.info('Redirecting to Google...')
                return
            }

            if (!response.success) {
                setError(response.error?.message || 'Google sign-in failed')
                setLoading(false)
                return
            }

            toast.success(response.message || 'Welcome!')
            const from = location.state?.from?.pathname || '/dashboard'
            navigate(from, { replace: true })
        } catch (err) {
            console.error('Google login error:', err)
            setError('Google sign-in failed. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute left-1/3 top-1/4 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] rounded-full bg-primary/10 blur-[100px] sm:blur-[128px]" />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative w-full sm:mx-auto sm:w-full sm:max-w-md"
            >
                {/* Header */}
                <div className="text-center">
                    <Link to="/" className="inline-flex items-center gap-2 group">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg group-hover:blur-xl transition-all duration-300" />
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light shadow-lg">
                                <svg
                                    className="h-5 w-5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                                    />
                                </svg>
                            </div>
                        </div>
                        <span className="text-xl font-semibold text-white">Savlink</span>
                    </Link>

                    <h2 className="mt-6 text-2xl sm:text-3xl font-semibold text-white">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Sign in to manage your links
                    </p>
                </div>

                {/* Form */}
                <div className="mt-6 sm:mt-8">
                    <div className="bg-gray-950/50 backdrop-blur-xl border border-gray-900/50 py-6 px-4 sm:py-8 sm:px-10 shadow-2xl rounded-lg">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4"
                                >
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                                    Email address
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md placeholder-gray-500 text-white bg-gray-900/50 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 text-sm sm:text-base transition-colors"
                                        placeholder="Enter your email"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                    Password
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-700 rounded-md placeholder-gray-500 text-white bg-gray-900/50 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 text-sm sm:text-base transition-colors"
                                        placeholder="Enter your password"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-700 rounded bg-gray-900"
                                        disabled={loading}
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <Link to="/forgot-password" className="font-medium text-primary hover:text-primary-light transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading || !formData.email || !formData.password}
                                    className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </>
                                    ) : 'Sign in'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-5 sm:mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-800" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-gray-950/50 text-gray-400">
                                        Don't have an account?{' '}
                                        <Link to="/register" className="font-medium text-primary hover:text-primary-light transition-colors">
                                            Sign up
                                        </Link>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 sm:mt-6">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-800" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-gray-950/50 text-gray-400">or</span>
                                </div>
                            </div>

                            <button
                                onClick={handleGoogleLogin}
                                type="button"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-3 px-4 py-2.5 sm:py-3 border border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-900/50 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                )}
                                <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}