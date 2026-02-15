// src/pages/auth/Register.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuthService } from '../../utils/auth'
import toast from 'react-hot-toast'

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [passwordValidation, setPasswordValidation] = useState({
        minLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasSpecial: false
    })

    const navigate = useNavigate()

    useEffect(() => {
        // Check if user is already authenticated
        if (AuthService.isAuthenticated()) {
            navigate('/dashboard', { replace: true })
        }
    }, [navigate])

    useEffect(() => {
        // Validate password in real-time
        const password = formData.password
        setPasswordValidation({
            minLength: password.length >= 8,
            hasUpper: /[A-Z]/.test(password),
            hasLower: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'`~]/.test(password)
        })
    }, [formData.password])

    const handleInputChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
        setError('')
    }

    const isPasswordValid = Object.values(passwordValidation).every(Boolean)
    const passwordsMatch = formData.password === formData.confirmPassword

    const handleEmailRegister = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validation
        if (!formData.name.trim()) {
            setError('Name is required')
            setLoading(false)
            return
        }

        if (!isPasswordValid) {
            setError('Please ensure your password meets all requirements')
            setLoading(false)
            return
        }

        if (!passwordsMatch) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        if (!agreedToTerms) {
            setError('You must agree to the terms and conditions')
            setLoading(false)
            return
        }

        try {
            const response = await AuthService.register({
                email: formData.email,
                password: formData.password,
                name: formData.name
            })

            if (!response.success) {
                throw new Error(response.error?.message || 'Registration failed')
            }

            // Email verification is required for Firebase Auth
            toast.success('Account created! Please check your email to verify your account.')
            navigate('/verify-email', {
                state: {
                    email: formData.email,
                    message: 'Please check your email to verify your account.'
                }
            })
        } catch (err) {
            console.error('Registration error:', err)
            setError(err.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleRegister = async () => {
        setLoading(true)
        setError('')

        try {
            const response = await AuthService.loginWithGoogle()

            // Check if user cancelled the popup
            if (response.cancelled) {
                // User closed the popup - don't show as error
                setLoading(false)
                return
            }

            if (!response.success) {
                throw new Error(response.error?.message || 'Google sign-up failed')
            }

            toast.success('Account created successfully!')
            navigate('/dashboard', { replace: true })
        } catch (err) {
            console.error('Google registration error:', err)
            setError(err.message || 'Google sign-up failed. Please try again.')
        } finally {
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
                <div className="absolute right-1/3 bottom-1/3 hidden sm:block">
                    <div className="h-[250px] w-[250px] sm:h-[300px] sm:w-[300px] rounded-full bg-primary/5 blur-[80px] sm:blur-[96px]" />
                </div>
            </div>

            <div className="relative w-full sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
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
                        Create your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Join thousands organizing their digital life
                    </p>
                </motion.div>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mt-6 sm:mt-8"
                >
                    <div className="bg-gray-950/50 backdrop-blur-xl border border-gray-900/50 py-6 px-4 sm:py-8 sm:px-10 shadow-2xl rounded-lg">

                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        {/* Email/Password Form */}
                        <form className="space-y-4 sm:space-y-6" onSubmit={handleEmailRegister}>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                                    Full name
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md placeholder-gray-500 text-white bg-gray-900/50 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 text-sm sm:text-base"
                                        placeholder="Enter your full name"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

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
                                        className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md placeholder-gray-500 text-white bg-gray-900/50 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 text-sm sm:text-base"
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
                                        autoComplete="new-password"
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-700 rounded-md placeholder-gray-500 text-white bg-gray-900/50 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 text-sm sm:text-base"
                                        placeholder="Create a password"
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

                                {/* Password Requirements */}
                                {formData.password && (
                                    <div className="mt-2 space-y-1">
                                        <div className="text-xs text-gray-400">Password must contain:</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                                            <div className={`flex items-center gap-1 ${passwordValidation.minLength ? 'text-green-400' : 'text-gray-500'}`}>
                                                <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                At least 8 characters
                                            </div>
                                            <div className={`flex items-center gap-1 ${passwordValidation.hasUpper ? 'text-green-400' : 'text-gray-500'}`}>
                                                <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                One uppercase letter
                                            </div>
                                            <div className={`flex items-center gap-1 ${passwordValidation.hasLower ? 'text-green-400' : 'text-gray-500'}`}>
                                                <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                One lowercase letter
                                            </div>
                                            <div className={`flex items-center gap-1 ${passwordValidation.hasNumber ? 'text-green-400' : 'text-gray-500'}`}>
                                                <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                One number
                                            </div>
                                            <div className={`flex items-center gap-1 col-span-1 sm:col-span-2 ${passwordValidation.hasSpecial ? 'text-green-400' : 'text-gray-500'}`}>
                                                <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                One special character
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                                    Confirm password
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-white bg-gray-900/50 focus:outline-none focus:ring-primary focus:z-10 text-sm sm:text-base ${formData.confirmPassword && !passwordsMatch
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-gray-700 focus:border-primary'
                                            }`}
                                        placeholder="Confirm your password"
                                        disabled={loading}
                                    />
                                    {formData.confirmPassword && !passwordsMatch && (
                                        <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start">
                                <input
                                    id="agree-terms"
                                    name="agree-terms"
                                    type="checkbox"
                                    required
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-700 rounded bg-gray-900 mt-0.5"
                                    disabled={loading}
                                />
                                <label htmlFor="agree-terms" className="ml-2 block text-xs sm:text-sm text-gray-400">
                                    I agree to the{' '}
                                    <Link to="/terms" className="text-primary hover:text-primary-light">
                                        Terms of Service
                                    </Link>
                                    {' '}and{' '}
                                    <Link to="/privacy" className="text-primary hover:text-primary-light">
                                        Privacy Policy
                                    </Link>
                                </label>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading || !isPasswordValid || !passwordsMatch || !agreedToTerms}
                                    className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : null}
                                    {loading ? 'Creating account...' : 'Create account'}
                                </button>
                            </div>
                        </form>

                        {/* Login Link */}
                        <div className="mt-5 sm:mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-800" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-gray-950/50 text-gray-400">
                                        Already have an account?{' '}
                                        <Link to="/login" className="font-medium text-primary hover:text-primary-light">
                                            Sign in
                                        </Link>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Google Sign Up */}
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
                                onClick={handleGoogleRegister}
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
                                <span>{loading ? 'Creating account...' : 'Continue with Google'}</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}