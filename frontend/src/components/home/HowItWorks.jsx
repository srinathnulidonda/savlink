// src/components/home/HowItWorks.jsx
import { useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useTransform } from 'framer-motion';

export default function HowItWorks() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.1 });
    const [hoveredStep, setHoveredStep] = useState(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    const x = useTransform(mouseX, [0, 1000], [-10, 10]);
    const y = useTransform(mouseY, [0, 1000], [-10, 10]);

    return (
        <section
            id="how-it-works"
            ref={ref}
            className="relative bg-black py-12 sm:py-20 md:py-28 lg:py-36 overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Advanced Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

                {/* Animated flow lines in background - hidden on mobile */}
                <svg className="absolute inset-0 w-full h-full opacity-10 hidden sm:block">
                    <motion.path
                        d="M 100 100 Q 500 200 900 100"
                        stroke="url(#gradient1)"
                        strokeWidth="2"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
                    />
                    <defs>
                        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#0A2A8F" />
                            <stop offset="100%" stopColor="#1E3A9F" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Floating orbs - smaller on mobile */}
                <motion.div
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -25, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute left-5 sm:left-10 top-10 sm:top-20 h-24 w-24 sm:h-48 sm:w-48 lg:h-64 lg:w-64 rounded-full bg-primary/10 blur-[40px] sm:blur-[80px] lg:blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, -50, 0],
                        y: [0, 25, 0],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute right-5 sm:right-10 bottom-10 sm:bottom-20 h-24 w-24 sm:h-48 sm:w-48 lg:h-64 lg:w-64 rounded-full bg-purple-600/10 blur-[40px] sm:blur-[80px] lg:blur-[100px]"
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="mx-auto max-w-3xl text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={isInView ? { scale: 1 } : {}}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-md px-2 sm:px-3 lg:px-4 py-0.5 sm:py-1 lg:py-1.5 mb-3 sm:mb-5 lg:mb-6"
                    >
                        <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-full w-full rounded-full bg-primary" />
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Workflow</span>
                    </motion.div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                        Your link management
                        <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-primary via-primary-light to-purple-500 bg-clip-text text-transparent">
                            workflow simplified
                        </span>
                    </h2>
                    <p className="mt-2 sm:mt-3 md:mt-4 lg:mt-6 text-xs sm:text-sm md:text-base lg:text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto px-2 sm:px-4 lg:px-0">
                        Two powerful paths: Save links for later or create branded short URLs.
                        Choose your workflow and get started in seconds.
                    </p>
                </motion.div>

                {/* Flow Chart */}
                <div className="mt-10 sm:mt-14 md:mt-18 lg:mt-24">
                    <div className="relative">
                        {/* Flow Steps */}
                        <div className="relative max-w-4xl mx-auto">
                            {/* Start Node */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                                transition={{ duration: 0.5, type: "spring" }}
                                className="flex justify-center"
                            >
                                <div className="relative">
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 blur-lg sm:blur-xl opacity-50"
                                    />
                                    <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 rounded-full p-3 sm:p-5 lg:p-6 shadow-2xl">
                                        <span className="text-xl sm:text-2xl lg:text-3xl">🚀</span>
                                    </div>
                                    <div className="absolute -bottom-5 sm:-bottom-7 lg:-bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-white">Start Here</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Arrow Down */}
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.2 }}
                                className="flex justify-center py-5 sm:py-6 lg:py-8"
                            >
                                <svg className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-gray-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </motion.div>

                            {/* Input URL */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={isInView ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: 0.3 }}
                                className="flex justify-center px-2 sm:px-4 lg:px-0"
                            >
                                <div className="relative group w-full max-w-xs sm:max-w-sm lg:max-w-md">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-500" />
                                    <div className="relative bg-gray-950 border border-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 hover:border-gray-700 transition-all">
                                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
                                            <div className="p-1 sm:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                                                <svg className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold text-xs sm:text-sm lg:text-base">Paste Your URL</h3>
                                                <p className="text-[10px] lg:text-xs text-gray-500">Any link from the web</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-1.5 sm:p-2 lg:p-3 bg-gray-900 rounded-md sm:rounded-lg">
                                            <input
                                                type="text"
                                                value="https://example.com/article"
                                                readOnly
                                                className="flex-1 bg-transparent text-[10px] sm:text-xs lg:text-sm text-gray-400 outline-none truncate"
                                            />
                                            <button className="px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-primary text-white rounded hover:bg-primary-light transition-colors whitespace-nowrap">
                                                Paste
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Arrow Down */}
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.4 }}
                                className="flex justify-center py-5 sm:py-6 lg:py-8"
                            >
                                <svg className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-gray-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </motion.div>

                            {/* Decision Diamond - Simplified for mobile */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                                transition={{ delay: 0.5 }}
                                className="flex justify-center my-5 sm:my-6 lg:my-8"
                            >
                                <div className="relative">
                                    <motion.div
                                        animate={{ rotate: [0, 360] }}
                                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 blur-lg sm:blur-xl lg:blur-2xl opacity-20"
                                    />
                                    <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl lg:rounded-3xl sm:transform sm:rotate-45">
                                        <div className="bg-gray-950 rounded-xl sm:rounded-2xl lg:rounded-3xl p-5 sm:p-6 lg:p-8">
                                            <div className="sm:transform sm:-rotate-45 text-center">
                                                <span className="text-lg sm:text-xl lg:text-2xl mb-1 sm:mb-2 block">⚡</span>
                                                <h3 className="text-white font-bold text-xs sm:text-sm">Choose Action</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Split Arrows - Always side by side */}
                            <div className="flex flex-row justify-center items-center gap-6 sm:gap-12 lg:gap-16 my-4 sm:my-6 lg:my-8">
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.6 }}
                                    className="flex items-center"
                                >
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                                    </svg>
                                    <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs text-gray-500">Save</span>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.6 }}
                                    className="flex items-center"
                                >
                                    <span className="mr-1.5 sm:mr-2 text-[10px] sm:text-xs text-gray-500">Shorten</span>
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </motion.div>
                            </div>

                            {/* Two Action Paths - Always side by side */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 lg:gap-8 px-2 sm:px-4 lg:px-0">
                                {/* Save Path */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 0.7 }}
                                    onMouseEnter={() => setHoveredStep('save')}
                                    onMouseLeave={() => setHoveredStep(null)}
                                    className="relative group"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-500" />
                                    <div className="relative bg-gray-950 border border-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-2.5 sm:p-3 md:p-4 lg:p-6 h-full hover:border-gray-700 transition-all">
                                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
                                            <div className="p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex-shrink-0">
                                                <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold text-[10px] sm:text-xs md:text-sm lg:text-base">Save Link</h3>
                                                <p className="text-[10px] lg:text-xs text-gray-500 hidden sm:block">Organize for later</p>
                                            </div>
                                        </div>
                                        <div className="space-y-0.5 sm:space-y-1 md:space-y-1.5 lg:space-y-2">
                                            {['📁 Folders', '🏷️ Tags', '📝 Notes'].map((feature, i) => (
                                                <motion.div
                                                    key={feature}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={hoveredStep === 'save' ? { opacity: 1, x: 0 } : { opacity: 0.7, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs lg:text-sm text-gray-400"
                                                >
                                                    <span className="truncate">{feature}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Shorten Path */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 0.8 }}
                                    onMouseEnter={() => setHoveredStep('shorten')}
                                    onMouseLeave={() => setHoveredStep(null)}
                                    className="relative group"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg sm:rounded-xl lg:rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-500" />
                                    <div className="relative bg-gray-950 border border-gray-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-2.5 sm:p-3 md:p-4 lg:p-6 h-full hover:border-gray-700 transition-all">
                                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
                                            <div className="p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-md sm:rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white flex-shrink-0">
                                                <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold text-[10px] sm:text-xs md:text-sm lg:text-base">Short URL</h3>
                                                <p className="text-[10px] lg:text-xs text-gray-500 hidden sm:block">Share anywhere</p>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                                            <div className="p-0.5 sm:p-1 md:p-1.5 lg:p-2 bg-gray-900 rounded-md sm:rounded-lg">
                                                <div className="text-[10px] text-gray-500 mb-0.5 hidden sm:block">Before:</div>
                                                <div className="text-[10px] sm:text-xs text-gray-400 truncate">example.com/long</div>
                                            </div>
                                            <div className="p-0.5 sm:p-1 md:p-1.5 lg:p-2 bg-gradient-to-r from-orange-600/10 to-red-600/10 border border-orange-600/20 rounded-md sm:rounded-lg">
                                                <div className="text-[10px] text-gray-500 mb-0.5 hidden sm:block">After:</div>
                                                <div className="text-[10px] sm:text-xs lg:text-sm font-mono text-orange-400 truncate">savl.ink/abc</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Final Result */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                                transition={{ delay: 1.1, type: "spring" }}
                                className="flex justify-center px-2 sm:px-4 lg:px-0 mt-8 sm:mt-10 lg:mt-12"
                            >
                                <div className="relative w-full max-w-xs sm:max-w-sm">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.05, 1],
                                            rotate: [0, 5, -5, 0]
                                        }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        className="absolute -inset-2 sm:-inset-3 lg:-inset-4 rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-r from-violet-600 to-purple-600 blur-lg sm:blur-xl lg:blur-2xl opacity-30"
                                    />
                                    <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl lg:rounded-3xl">
                                        <div className="bg-gray-950 rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-5 md:p-6 lg:p-8">
                                            <div className="text-center">
                                                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 mb-2 sm:mb-3 lg:mb-4">
                                                    <svg className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-white mb-0.5 sm:mb-1 lg:mb-2">Access Anywhere</h3>
                                                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-400 mb-2 sm:mb-3 lg:mb-4">Your links, always synced</p>

                                                <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 lg:gap-2">
                                                    {['💻 Desktop', '📱 Mobile', '🌐 Web', '🔌 API'].map((device) => (
                                                        <span key={device} className="px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-violet-600/10 text-violet-400 rounded-full border border-violet-600/20">
                                                            {device}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA - Always side by side */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 1.2 }}
                    className="mt-10 sm:mt-14 md:mt-18 lg:mt-20 text-center px-2 sm:px-4 lg:px-0"
                >
                    <p className="text-gray-400 text-xs sm:text-sm lg:text-base mb-3 sm:mb-5 lg:mb-6">Ready to streamline your workflow?</p>
                    <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 sm:px-5 md:px-6 lg:px-8 py-2 sm:py-2.5 md:py-3 lg:py-4 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg sm:rounded-xl lg:rounded-2xl text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold shadow-2xl shadow-primary/20 hover:shadow-primary/30 transition-all"
                        >
                            Start Saving
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 sm:px-5 md:px-6 lg:px-8 py-2 sm:py-2.5 md:py-3 lg:py-4 bg-gray-900 text-white rounded-lg sm:rounded-xl lg:rounded-2xl text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold border border-gray-800 hover:bg-gray-850 transition-all"
                        >
                            Try Shortener
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}