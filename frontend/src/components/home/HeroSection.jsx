// src/components/home/HeroSection.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardPreview from './DashboardPreview';

export default function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-black">
            {/* Subtle grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            {/* Gradient orbs - Fixed overflow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-[300px] sm:w-[400px] lg:w-[500px] rounded-full bg-primary/20 blur-[80px] sm:blur-[100px] lg:blur-[128px]" />
                </div>
                {/* Fixed: Removed translate-x-1/2 that was pushing beyond viewport */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <div className="h-[250px] sm:h-[350px] lg:h-[400px] w-[250px] sm:w-[350px] lg:w-[400px] rounded-full bg-primary/10 blur-[60px] sm:blur-[80px] lg:blur-[96px] translate-x-1/3" />
                </div>
            </div>

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28 lg:pb-40 pt-24 sm:pt-32 lg:pt-48">
                <div className="mx-auto max-w-3xl text-center">
                    {/* Badge - Smaller on mobile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-6 sm:mb-8"
                    >
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-primary backdrop-blur-sm">
                            <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex h-full w-full rounded-full bg-primary" />
                            </span>
                            Now in Public Beta
                        </span>
                    </motion.div>

                    {/* Headline - Much smaller on mobile */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white"
                    >
                        Your personal library
                        <br />
                        <span className="text-gradient">for the web</span>
                    </motion.h1>

                    {/* Subheadline - Smaller on mobile */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg leading-relaxed text-gray-400"
                    >
                        Save links, organize effortlessly, access anywhere.
                        <br className="hidden sm:inline" />
                        Built for people who collect the internet.
                    </motion.p>

                    {/* CTAs - Smaller on mobile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mt-8 sm:mt-10 flex items-center justify-center gap-3 sm:gap-4 px-2 sm:px-0"
                    >
                        <Link
                            to="/register"
                            className="group relative inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition-all duration-200 bg-primary hover:bg-primary-light active:scale-[0.98]"
                        >
                            <span>Get started</span>
                            <svg className="h-3 sm:h-4 w-3 sm:w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <button
                            onClick={() => document.getElementById('dashboard-preview')?.scrollIntoView({ behavior: 'smooth' })}
                            className="relative inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-gray-800 bg-gray-950/50 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-100 transition-all duration-200 hover:bg-gray-900 hover:border-gray-700"
                        >
                            View demo
                        </button>
                    </motion.div>

                    {/* Trust indicators - Smaller on mobile */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="mt-10 sm:mt-12 lg:mt-16 flex items-center justify-center gap-3 sm:gap-6 lg:gap-8"
                    >
                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs lg:text-sm text-gray-500">
                            <svg className="h-3 sm:h-3.5 lg:h-4 w-3 sm:w-3.5 lg:w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="whitespace-nowrap">Free forever</span>
                        </div>
                        <div className="hidden xs:flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs lg:text-sm text-gray-500">
                            <svg className="h-3 sm:h-3.5 lg:h-4 w-3 sm:w-3.5 lg:w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="whitespace-nowrap">No card</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs lg:text-sm text-gray-500">
                            <svg className="h-3 sm:h-3.5 lg:h-4 w-3 sm:w-3.5 lg:w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="whitespace-nowrap">2k+ users</span>
                        </div>
                    </motion.div>

                    {/* Statistics - Smaller on mobile */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="mt-12 sm:mt-14 lg:mt-16 grid grid-cols-3 gap-6 sm:gap-8 border-t border-gray-900 pt-6 sm:pt-8"
                    >
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">50M+</div>
                            <div className="mt-1 text-[10px] sm:text-xs lg:text-sm text-gray-500">Links Saved</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">99.9%</div>
                            <div className="mt-1 text-[10px] sm:text-xs lg:text-sm text-gray-500">Uptime</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">4.9★</div>
                            <div className="mt-1 text-[10px] sm:text-xs lg:text-sm text-gray-500">User Rating</div>
                        </div>
                    </motion.div>
                </div>

                {/* Dashboard Preview Component - Added overflow container */}
                <div id="dashboard-preview" className="relative overflow-hidden">
                    <DashboardPreview />
                </div>
            </div>
        </section>
    );
}