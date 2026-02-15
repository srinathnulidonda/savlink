// src/pages/auth/VerifyEmail.jsx
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthService } from '../../utils/auth'
import { applyActionCode, getAuth } from 'firebase/auth'
import toast from 'react-hot-toast'

export default function VerifyEmail() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const [verifying, setVerifying] = useState(false)
    const [verified, setVerified] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(5)
    const [resending, setResending] = useState(false)

    const oobCode = searchParams.get('oobCode')
    const mode = searchParams.get('mode')
    const continueUrl = searchParams.get('continueUrl')

    // Extract email from continueUrl or location state
    const extractEmail = () => {
        if (continueUrl) {
            try {
                const url = new URL(continueUrl)
                return url.searchParams.get('email')
            } catch (e) {
                // Invalid URL
            }
        }
        return location.state?.email || AuthService.getFirebaseUser()?.email || ''
    }

    const email = extractEmail()

    useEffect(() => {
        if (mode === 'verifyEmail' && oobCode) {
            // Automatically start verification when landing on page
            handleVerification()
        }
    }, [mode, oobCode])

    // Countdown timer for redirect
    useEffect(() => {
        if (verified && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        } else if (verified && countdown === 0) {
            navigate('/dashboard')
        }
    }, [verified, countdown, navigate])

    const handleVerification = async () => {
        setVerifying(true)
        setError('')

        try {
            const auth = getAuth()
            await applyActionCode(auth, oobCode)

            // Reload user to get updated email verification status
            if (auth.currentUser) {
                await auth.currentUser.reload()
            }

            setVerified(true)
            toast.success('Email verified successfully!')

            // Start countdown
            setCountdown(5)
        } catch (error) {
            console.error('Verification error:', error)
            setError(getErrorMessage(error.code))
        } finally {
            setVerifying(false)
        }
    }

    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/invalid-action-code':
                return 'This verification link is invalid or has already been used.'
            case 'auth/expired-action-code':
                return 'This verification link has expired. Please request a new one.'
            case 'auth/user-disabled':
                return 'This account has been disabled. Please contact support.'
            default:
                return 'Failed to verify email. Please try again or request a new link.'
        }
    }

    const resendVerification = async () => {
        setResending(true)
        try {
            const response = await AuthService.resendVerificationEmail()
            if (response.success) {
                toast.success('New verification email sent!')
            } else {
                toast.error(response.error?.message || 'Failed to send email')
            }
        } catch (error) {
            toast.error('Failed to send verification email')
        } finally {
            setResending(false)
        }
    }

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, ease: "easeOut" }
        }
    }

    const iconVariants = {
        hidden: { scale: 0 },
        visible: {
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2
            }
        }
    }

    return (
        <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-[400px] w-[400px] rounded-full bg-primary/10 blur-[128px] animate-pulse" />
                </div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-8"
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
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-gray-950/50 backdrop-blur-xl border border-gray-900/50 py-8 px-4 shadow-2xl rounded-lg sm:px-10"
                >
                    <AnimatePresence mode="wait">
                        {verifying ? (
                            <motion.div
                                key="verifying"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8"
                            >
                                <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                </div>
                                <h2 className="text-xl font-semibold text-white mb-2">Verifying Your Email</h2>
                                <p className="text-gray-400">Please wait while we confirm your email address...</p>
                            </motion.div>
                        ) : verified ? (
                            <motion.div
                                key="verified"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8"
                            >
                                <motion.div
                                    variants={iconVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4"
                                >
                                    <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <motion.path
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.5}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </motion.div>
                                <h2 className="text-2xl font-semibold text-white mb-2">Email Verified!</h2>
                                <p className="text-gray-400 mb-6">Your email has been successfully verified.</p>

                                <div className="space-y-4">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-center"
                                    >
                                        <p className="text-sm text-gray-500 mb-4">
                                            Redirecting to dashboard in {countdown} seconds...
                                        </p>
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-950 transition-all"
                                        >
                                            Go to Dashboard Now
                                            <svg className="ml-2 -mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </button>
                                    </motion.div>
                                </div>
                            </motion.div>
                        ) : error ? (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8"
                            >
                                <motion.div
                                    variants={iconVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/20 mb-4"
                                >
                                    <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </motion.div>
                                <h2 className="text-2xl font-semibold text-white mb-2">Verification Failed</h2>
                                <p className="text-gray-400 mb-6">{error}</p>

                                <div className="space-y-3">
                                    <button
                                        onClick={resendVerification}
                                        disabled={resending}
                                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {resending ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sending...
                                            </>
                                        ) : (
                                            'Request New Verification Email'
                                        )}
                                    </button>

                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full flex justify-center py-2.5 px-4 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-900/50 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 focus:ring-offset-gray-950 transition-all"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="waiting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-8"
                            >
                                <motion.div
                                    variants={iconVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 mb-4"
                                >
                                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </motion.div>
                                <h2 className="text-2xl font-semibold text-white mb-2">Check Your Email</h2>
                                <p className="text-gray-400 mb-2">
                                    We've sent a verification link to
                                </p>
                                <p className="text-sm font-medium text-white mb-6">{email || 'your email address'}</p>

                                <div className="space-y-6">
                                    <div className="bg-gray-900/50 rounded-lg p-4 text-left">
                                        <h3 className="text-sm font-medium text-gray-300 mb-2">Didn't receive the email?</h3>
                                        <ul className="text-xs text-gray-500 space-y-1">
                                            <li>• Check your spam or junk folder</li>
                                            <li>• Make sure you entered the correct email</li>
                                            <li>• Wait a few minutes and try again</li>
                                        </ul>
                                    </div>

                                    <button
                                        onClick={resendVerification}
                                        disabled={resending}
                                        className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-900/50 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 focus:ring-offset-gray-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {resending ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Resend Verification Email
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer link */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                        >
                            ← Back to login
                        </Link>
                    </div>
                </motion.div>

                {/* Help text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 text-center text-xs text-gray-500"
                >
                    Need help? <a href="mailto:support@savlink.com" className="text-primary hover:text-primary-light">Contact support</a>
                </motion.p>
            </div>
        </div>
    )
}