// src/components/home/home-navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../utils/auth';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { app } from '../../config/firebase';

const auth = getAuth(app);

export default function HomeNavbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Direct Firebase auth state listener for immediate updates
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'How it works', href: '#how-it-works' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Docs', href: '/docs' },
    ];

    const handleNavClick = (e, href) => {
        if (href.startsWith('#')) {
            e.preventDefault();
            const element = document.querySelector(href);
            if (element) {
                const offset = 80;
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }
    };

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/');
    };

    // Render auth buttons based on user state
    const renderAuthButtons = () => {
        if (loading) {
            return (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-20 bg-gray-800 animate-pulse rounded-md"></div>
                    <div className="h-9 w-28 bg-primary/50 animate-pulse rounded-lg"></div>
                </div>
            );
        }

        if (user) {
            return (
                <>
                    <Link
                        to="/dashboard"
                        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-primary/25 hover:shadow-xl active:scale-[0.98]"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        <span className="relative z-10">Dashboard</span>
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-light to-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:text-white"
                    >
                        Sign out
                    </button>
                </>
            );
        }

        return (
            <>
                <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:text-white"
                >
                    Sign in
                </Link>
                <Link
                    to="/register"
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-primary/25 hover:shadow-xl active:scale-[0.98]"
                >
                    <span className="relative z-10">Get started</span>
                    <svg
                        className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                    </svg>
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-light to-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </Link>
            </>
        );
    };

    // Mobile auth buttons
    const renderMobileAuthButtons = () => {
        if (loading) {
            return (
                <div className="space-y-2">
                    <div className="h-10 bg-gray-800 animate-pulse rounded-lg"></div>
                    <div className="h-10 bg-gray-800 animate-pulse rounded-lg"></div>
                </div>
            );
        }

        if (user) {
            return (
                <>
                    <Link
                        to="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 w-full rounded-lg bg-primary px-3 py-2.5 text-center text-base font-medium text-white shadow-lg transition-all hover:bg-primary-light active:scale-[0.98]"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        Dashboard
                    </Link>
                    <button
                        onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                        }}
                        className="block w-full rounded-lg border border-gray-800 px-3 py-2.5 text-center text-base font-medium text-gray-300 transition-all hover:bg-gray-900 hover:text-white"
                    >
                        Sign out
                    </button>
                </>
            );
        }

        return (
            <>
                <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full rounded-lg bg-primary px-3 py-2.5 text-center text-base font-medium text-white shadow-lg transition-all hover:bg-primary-light active:scale-[0.98]"
                >
                    Get started
                </Link>
                <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full rounded-lg border border-gray-800 px-3 py-2.5 text-center text-base font-medium text-gray-300 transition-all hover:bg-gray-900 hover:text-white"
                >
                    Sign in
                </Link>
            </>
        );
    };

    return (
        <>
            {/* Main Navbar */}
            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
                        ? 'bg-black/50 backdrop-blur-xl border-b border-gray-900/50'
                        : 'bg-transparent'
                    }`}
            >
                <nav className="mx-auto max-w-7xl">
                    <div className="px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between">
                            {/* Logo */}
                            <div className="flex items-center">
                                <Link
                                    to="/"
                                    className="group flex items-center gap-2.5 transition-transform hover:scale-105"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg group-hover:blur-xl transition-all duration-300" />
                                        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light shadow-lg">
                                            <svg
                                                className="h-4 w-4 text-white transition-transform duration-300 group-hover:scale-110"
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
                                    <span className="text-lg font-semibold text-white">
                                        Savlink
                                    </span>
                                </Link>
                            </div>

                            {/* Desktop Navigation */}
                            <div className="hidden md:flex md:items-center md:gap-1">
                                {navLinks.map((link) => (
                                    <a
                                        key={link.name}
                                        href={link.href}
                                        onClick={(e) => handleNavClick(e, link.href)}
                                        className="relative px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white group"
                                    >
                                        {link.name}
                                        <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </a>
                                ))}
                            </div>

                            {/* Desktop Auth Buttons */}
                            <div className="hidden md:flex md:items-center md:gap-3">
                                {renderAuthButtons()}
                            </div>

                            {/* Mobile Menu Button */}
                            <div className="flex md:hidden">
                                <button
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    className="relative inline-flex items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-900 hover:text-white"
                                >
                                    <span className="sr-only">Open main menu</span>
                                    <div className="relative h-5 w-5">
                                        <span
                                            className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'rotate-45 top-2' : 'top-0.5'
                                                }`}
                                        />
                                        <span
                                            className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out top-2 ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100'
                                                }`}
                                        />
                                        <span
                                            className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${isMobileMenuOpen ? '-rotate-45 top-2' : 'top-3.5'
                                                }`}
                                        />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Navigation Dropdown */}
                    <AnimatePresence>
                        {isMobileMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="md:hidden overflow-hidden"
                            >
                                <div className="space-y-1 px-4 pb-4 pt-2">
                                    {navLinks.map((link) => (
                                        <a
                                            key={link.name}
                                            href={link.href}
                                            onClick={(e) => {
                                                handleNavClick(e, link.href);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="block rounded-lg px-3 py-2.5 text-base font-medium text-gray-300 transition-all hover:bg-gray-900 hover:text-white"
                                        >
                                            {link.name}
                                        </a>
                                    ))}
                                    <div className="pt-4 space-y-2">
                                        {renderMobileAuthButtons()}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </nav>
            </motion.header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Announcement Bar - Only show when not logged in */}
            {!isScrolled && !user && !loading && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="fixed top-16 left-0 right-0 z-40 hidden lg:block"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-center">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex h-full w-full rounded-full bg-primary" />
                                </span>
                                <span>New: API access now available for Pro users</span>
                                <a href="/changelog" className="font-semibold underline underline-offset-2">
                                    Learn more →
                                </a>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </>
    );
}