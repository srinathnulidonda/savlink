// src/components/home/Features.jsx
import { useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useTransform } from 'framer-motion';

export default function Features() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.1 });
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Your specific features with enhanced design
    const features = [
        {
            title: 'Instant Save',
            description: 'Save any link with a single click. Browser extension, mobile app.',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
            ),
            gradient: 'from-amber-600 via-orange-600 to-red-600',
            shadowColor: 'shadow-orange-500/20',
            badge: 'INSTANT',
            badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        },
        {
            title: 'Smart Organization',
            description: 'Auto-categorization, custom tags, and folders that adapt to your workflow.',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
            ),
            gradient: 'from-blue-600 via-indigo-600 to-purple-600',
            shadowColor: 'shadow-indigo-500/20',
            badge: 'SMART',
            badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        },
        {
            title: 'Lightning Search',
            description: 'Find anything instantly. Full-text search across titles, descriptions, and content.',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            ),
            gradient: 'from-emerald-600 via-green-600 to-teal-600',
            shadowColor: 'shadow-emerald-500/20',
            badge: 'FAST',
            badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        },
        {
            title: 'Private & Secure',
            description: 'Your data encrypted and private. No tracking, no ads, no compromises.',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
            ),
            gradient: 'from-violet-600 via-purple-600 to-pink-600',
            shadowColor: 'shadow-purple-500/20',
            badge: 'SECURE',
            badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        },
        {
            title: 'Clean Short Links',
            description: 'Create branded short links when you need them. Full analytics included.',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
            ),
            gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
            shadowColor: 'shadow-cyan-500/20',
            badge: 'BRANDED',
            badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        },
        {
            title: 'Everywhere Sync',
            description: 'Access your links on any device. Real-time sync across all platforms.',
            icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            ),
            gradient: 'from-rose-600 via-pink-600 to-fuchsia-600',
            shadowColor: 'shadow-pink-500/20',
            badge: 'SYNCED',
            badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        },
    ];

    // Additional features for bento grid
    const additionalFeatures = [
        {
            title: 'Website',
            description: 'Access from any browser',
            icon: '🌐',
            size: 'medium',
        },
        {
            title: 'Web App',
            description: 'Progressive web app with offline support',
            icon: '📱',
            size: 'medium',
        },
        {
            title: 'Import & Export',
            description: 'Bulk import from any bookmark manager',
            icon: '📥',
            size: 'small',
        },
        {
            title: 'API Access',
            description: 'RESTful API for developers',
            icon: '🔧',
            size: 'small',
        },
        {
            title: 'Analytics Dashboard',
            description: 'Track your reading habits and link performance',
            icon: '📊',
            size: 'large',
            highlight: true,
        },
        {
            title: 'Share Collections',
            description: 'Public or private sharing',
            icon: '🔗',
            size: 'small',
        },
        {
            title: 'Dark Mode',
            description: 'Easy on your eyes',
            icon: '🌙',
            size: 'small',
        },
    ];

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    return (
        <section
            id="features"
            ref={ref}
            className="relative bg-black py-12 sm:py-20 lg:py-32 overflow-hidden"
        >
            {/* Premium Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

                {/* Animated gradient orbs - smaller on mobile */}
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -100, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute left-1/4 top-1/4 h-[200px] sm:h-[350px] lg:h-[500px] w-[200px] sm:w-[350px] lg:w-[500px] rounded-full bg-primary/5 blur-[80px] sm:blur-[120px] lg:blur-[150px]"
                />
                <motion.div
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 100, 0],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute right-1/4 bottom-1/4 h-[200px] sm:h-[350px] lg:h-[500px] w-[200px] sm:w-[350px] lg:w-[500px] rounded-full bg-purple-600/5 blur-[80px] sm:blur-[120px] lg:blur-[150px]"
                />

                {/* Top gradient line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Premium Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="mx-auto max-w-3xl text-center"
                >
                    {/* Animated badge - smaller on mobile */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={isInView ? { scale: 1 } : {}}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-md px-2 sm:px-3 lg:px-4 py-0.5 sm:py-1 lg:py-1.5 mb-4 sm:mb-6 lg:mb-8"
                    >
                        <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-full w-full rounded-full bg-primary" />
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Features</span>
                    </motion.div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white">
                        Everything you need
                        <span className="block mt-1 sm:mt-2">
                            <span className="relative inline-block">
                                <motion.span
                                    className="relative z-10 bg-gradient-to-r from-primary via-primary-light to-purple-500 bg-clip-text text-transparent"
                                    animate={{
                                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                    }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                    style={{
                                        backgroundSize: "200% 200%",
                                    }}
                                >
                                    nothing you don't
                                </motion.span>
                                <motion.div
                                    className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary/10 via-primary-light/10 to-purple-500/10 blur-xl sm:blur-2xl"
                                    animate={{
                                        opacity: [0.3, 0.6, 0.3],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                    }}
                                />
                            </span>
                        </span>
                    </h2>
                    <p className="mt-3 sm:mt-4 lg:mt-6 text-sm sm:text-base lg:text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
                        Powerful features designed for professionals who value simplicity and efficiency.
                    </p>
                </motion.div>

                {/* Main Features Grid - Updated for smaller mobile text */}
                <motion.div
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="mt-10 sm:mt-14 lg:mt-20"
                    onMouseMove={handleMouseMove}
                >
                    <div className="grid gap-3 sm:gap-6 lg:gap-8 grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{
                                    duration: 0.5,
                                    delay: index * 0.1,
                                    ease: [0.21, 0.47, 0.32, 0.98]
                                }}
                                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                                onHoverStart={() => setHoveredIndex(index)}
                                onHoverEnd={() => setHoveredIndex(null)}
                                className="group relative"
                            >
                                {/* Glow effect */}
                                <div
                                    className={`absolute inset-0 rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 blur-xl sm:blur-2xl transition-opacity duration-500 group-hover:opacity-20`}
                                />

                                {/* Animated border */}
                                <div className="absolute -inset-[1px] rounded-xl sm:rounded-2xl lg:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                    <div className={`absolute inset-0 rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-30 blur-sm`} />
                                    <div className="absolute inset-0 rounded-xl sm:rounded-2xl lg:rounded-3xl bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                                </div>

                                {/* Card - Adjusted padding and sizes for mobile */}
                                <div className="relative h-full rounded-xl sm:rounded-2xl lg:rounded-3xl border border-gray-900 bg-gray-950/80 backdrop-blur-xl p-3 sm:p-5 lg:p-8 overflow-hidden transition-all duration-300 group-hover:border-gray-800 group-hover:bg-gray-950/90">

                                    {/* Badge - Hidden on mobile for space */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        className="absolute top-2 right-2 sm:top-4 sm:right-4 lg:top-6 lg:right-6 hidden sm:block"
                                    >
                                        <span className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] font-bold tracking-wider ${feature.badgeColor} border backdrop-blur-sm`}>
                                            {feature.badge}
                                        </span>
                                    </motion.div>

                                    {/* Icon - Smaller on mobile */}
                                    <div className="relative inline-block">
                                        <div className={`absolute inset-0 rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-20 blur-xl transition-all duration-300 group-hover:opacity-30`} />
                                        <div className={`relative inline-flex rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br ${feature.gradient} p-2.5 sm:p-3 lg:p-4 shadow-xl sm:shadow-2xl`}>
                                            <motion.div
                                                animate={hoveredIndex === index ? { rotate: [0, -10, 10, -10, 0] } : {}}
                                                transition={{ duration: 0.5 }}
                                                className="text-white h-3.5 sm:h-4 lg:h-5 w-3.5 sm:w-4 lg:w-5"
                                            >
                                                {feature.icon}
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* Content - Adjusted for mobile */}
                                    <div className="mt-3 sm:mt-5 lg:mt-6">
                                        <h3 className="text-sm sm:text-base lg:text-xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 group-hover:bg-clip-text transition-all duration-300">
                                            {feature.title}
                                        </h3>
                                        <p className="mt-1.5 sm:mt-2 lg:mt-3 text-[10px] sm:text-xs lg:text-sm text-gray-400 leading-relaxed line-clamp-3 sm:line-clamp-none">
                                            {feature.description}
                                        </p>
                                    </div>

                                    {/* Shimmer effect on hover - Desktop only */}
                                    {hoveredIndex === index && (
                                        <motion.div
                                            className="absolute inset-0 -translate-x-full hidden sm:block"
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ duration: 1.5, ease: "easeInOut" }}
                                            style={{
                                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                                            }}
                                        />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Bento Grid Section - Updated for mobile with smaller text */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-12 sm:mt-16 lg:mt-24"
                >
                    <div className="text-center mb-6 sm:mb-10 lg:mb-12">
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Plus everything else you'd expect</h3>
                        <p className="mt-1.5 sm:mt-2 lg:mt-3 text-xs sm:text-sm lg:text-base text-gray-400">Thoughtful features that enhance your workflow</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                        {additionalFeatures.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                                transition={{ duration: 0.5, delay: 0.6 + index * 0.05 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className={`relative group ${feature.size === 'large' ? 'col-span-2 row-span-2' :
                                    feature.size === 'medium' ? 'col-span-2 sm:col-span-2' : ''
                                    }`}
                            >
                                <div className={`relative h-full min-h-[80px] sm:min-h-[100px] lg:min-h-[140px] rounded-lg sm:rounded-xl lg:rounded-2xl border ${feature.highlight ? 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent' : 'border-gray-900 bg-gray-950/50'
                                    } backdrop-blur-sm p-3 sm:p-4 lg:p-6 overflow-hidden transition-all duration-300 hover:border-gray-800 hover:bg-gray-950/70`}>
                                    <div className="text-xl sm:text-2xl lg:text-3xl mb-1.5 sm:mb-2 lg:mb-3">{feature.icon}</div>
                                    <h4 className="text-[10px] sm:text-xs lg:text-sm font-semibold text-white">{feature.title}</h4>
                                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] lg:text-xs text-gray-400 line-clamp-2">{feature.description}</p>

                                    {/* Hover gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Stats Section - Updated for mobile with smaller text */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="mt-12 sm:mt-16 lg:mt-24"
                >
                    <div className="relative rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden">
                        {/* Glass effect background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-950/50 backdrop-blur-xl" />

                        {/* Animated gradient overlay */}
                        <motion.div
                            className="absolute inset-0 opacity-30"
                            animate={{
                                background: [
                                    'linear-gradient(0deg, transparent, rgba(10,42,143,0.1))',
                                    'linear-gradient(180deg, transparent, rgba(10,42,143,0.1))',
                                    'linear-gradient(0deg, transparent, rgba(10,42,143,0.1))',
                                ],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />

                        <div className="relative border border-gray-800 rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-12">
                            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 md:grid-cols-4">
                                {[
                                    { value: '50M+', label: 'Links Saved', trend: '↑ 23% this month' },
                                    { value: '99.99%', label: 'Uptime SLA', trend: 'Enterprise ready' },
                                    { value: '<50ms', label: 'Response Time', trend: 'Lightning fast' },
                                    { value: '5.0★', label: 'User Rating', trend: '2k+ reviews' },
                                ].map((stat, index) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                                        whileHover={{ scale: 1.05 }}
                                        className="text-center group cursor-pointer"
                                    >
                                        <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text group-hover:from-primary group-hover:to-primary-light transition-all duration-300">
                                            {stat.value}
                                        </div>
                                        <div className="mt-0.5 sm:mt-1 lg:mt-2 text-[10px] sm:text-xs lg:text-sm font-medium text-gray-300">
                                            {stat.label}
                                        </div>
                                        <div className="mt-0.5 lg:mt-1 text-[10px] sm:text-[11px] lg:text-xs text-primary/70">
                                            {stat.trend}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}