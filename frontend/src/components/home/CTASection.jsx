// src/components/home/CTASection.jsx
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useTransform } from 'framer-motion';

export default function CTASection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    const [hoveredCard, setHoveredCard] = useState(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    // Animated counter for statistics
    const Counter = ({ end, duration = 2, suffix = '' }) => {
        const [count, setCount] = useState(0);
        const countRef = useRef(null);

        useEffect(() => {
            if (!isInView) return;

            let start = 0;
            const increment = end / (duration * 60);
            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setCount(end);
                    clearInterval(timer);
                } else {
                    setCount(Math.floor(start));
                }
            }, 1000 / 60);

            return () => clearInterval(timer);
        }, [isInView, end, duration]);

        return <span>{count.toLocaleString()}{suffix}</span>;
    };

    const plans = [
        {
            name: 'Starter',
            price: 'Free',
            description: 'Perfect for personal use',
            features: [
                '100 links/month',
                'Basic organization',
                'Browser extension',
                'Mobile app',
            ],
            cta: 'Start free',
            popular: false,
            gradient: 'from-gray-600 to-gray-500',
        },
        {
            name: 'Pro',
            price: '$9',
            period: '/month',
            description: 'For power users & teams',
            features: [
                'Unlimited links',
                'Advanced search & filters',
                'Team collaboration',
                'API access',
                'Priority support',
                'Custom domains',
            ],
            cta: 'Start 14-day trial',
            popular: true,
            gradient: 'from-primary to-primary-light',
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            description: 'Tailored for your organization',
            features: [
                'Everything in Pro',
                'SSO/SAML',
                'Advanced analytics',
                'Dedicated support',
                'Custom integrations',
            ],
            cta: 'Contact sales',
            popular: false,
            gradient: 'from-purple-600 to-purple-500',
        },
    ];

    return (
        <section
            ref={ref}
            className="relative bg-black py-12 sm:py-20 lg:py-32 overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Premium Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

                {/* Animated gradient orbs - smaller on mobile */}
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                >
                    <div className="h-[250px] sm:h-[350px] lg:h-[400px] w-[250px] sm:w-[350px] lg:w-[400px] rounded-full bg-primary/10 blur-[80px] sm:blur-[100px] lg:blur-[120px]" />
                </motion.div>
                <motion.div
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 50, 0],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                >
                    <div className="h-[250px] sm:h-[350px] lg:h-[400px] w-[250px] sm:w-[350px] lg:w-[400px] rounded-full bg-purple-600/10 blur-[80px] sm:blur-[100px] lg:blur-[120px]" />
                </motion.div>

                {/* Floating particles effect - only on desktop */}
                <div className="hidden sm:block">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute h-1 w-1 rounded-full bg-primary/20"
                            initial={{
                                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                            }}
                            animate={{
                                y: [null, -100],
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                duration: Math.random() * 5 + 5,
                                repeat: Infinity,
                                delay: Math.random() * 5,
                                ease: "easeOut"
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Main CTA Header */}
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
                        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-green-500/20 bg-gradient-to-r from-green-500/5 to-emerald-500/5 backdrop-blur-md px-2 sm:px-3 lg:px-4 py-0.5 sm:py-1 lg:py-1.5 mb-4 sm:mb-6 lg:mb-8"
                    >
                        <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-green-400 uppercase tracking-wider">Limited Time Offer</span>
                    </motion.div>

                    {/* Main heading - significantly smaller on mobile */}
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white"
                    >
                        Start building your
                        <span className="block mt-1 sm:mt-2">
                            <motion.span
                                className="relative inline-block"
                                animate={{
                                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                }}
                                transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                style={{
                                    backgroundImage: "linear-gradient(90deg, #fff, #0A2A8F, #1E3A9F, #fff)",
                                    backgroundSize: "200% 100%",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                }}
                            >
                                digital library
                            </motion.span>
                            {' '}today
                        </span>
                    </motion.h2>

                    {/* Subheading - smaller on mobile */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mt-3 sm:mt-4 lg:mt-6 text-sm sm:text-base lg:text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto px-2 sm:px-4 lg:px-0"
                    >
                        Join over <span className="text-white font-medium">50,000 professionals</span> who save
                        hours every week managing their digital resources with Savlink.
                    </motion.p>
                </motion.div>

                {/* Trust Indicators - smaller on mobile */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-6 sm:mt-8 lg:mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-8 text-[10px] sm:text-xs lg:text-sm text-gray-500"
                >
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <svg className="h-3 sm:h-3.5 lg:h-4 w-3 sm:w-3.5 lg:w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>14-day trial</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <svg className="h-3 sm:h-3.5 lg:h-4 w-3 sm:w-3.5 lg:w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>No card required</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <svg className="h-3 sm:h-3.5 lg:h-4 w-3 sm:w-3.5 lg:w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Cancel anytime</span>
                    </div>
                </motion.div>

                {/* Pricing Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-10 sm:mt-16 lg:mt-20 grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto"
                >
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                            whileHover={{ y: -8, transition: { duration: 0.3 } }}
                            onHoverStart={() => setHoveredCard(index)}
                            onHoverEnd={() => setHoveredCard(null)}
                            className={`relative group ${plan.popular ? 'md:-mt-8' : ''}`}
                        >
                            {/* Popular badge - smaller on mobile */}
                            {plan.popular && (
                                <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 z-10">
                                    <motion.div
                                        animate={{ rotate: [0, -2, 2, -2, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="rounded-full bg-gradient-to-r from-primary to-primary-light px-3 sm:px-4 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-white shadow-lg"
                                    >
                                        MOST POPULAR
                                    </motion.div>
                                </div>
                            )}

                            {/* Glow effect */}
                            <div className={`absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r ${plan.gradient} opacity-0 blur-xl transition-opacity duration-500 ${plan.popular || hoveredCard === index ? 'opacity-20' : ''}`} />

                            {/* Card */}
                            <div className={`relative h-full rounded-xl sm:rounded-2xl border ${plan.popular ? 'border-primary/30 bg-gray-950' : 'border-gray-900 bg-gray-950/50'} backdrop-blur-sm p-4 sm:p-6 lg:p-8 transition-all duration-300`}>
                                {/* Plan header - smaller text on mobile */}
                                <div className="mb-4 sm:mb-6">
                                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">{plan.name}</h3>
                                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-400">{plan.description}</p>
                                    <div className="mt-3 sm:mt-4 flex items-baseline gap-1">
                                        <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{plan.price}</span>
                                        {plan.period && <span className="text-xs sm:text-sm text-gray-400">{plan.period}</span>}
                                    </div>
                                </div>

                                {/* Features list - smaller text on mobile */}
                                <ul className="mb-6 sm:mb-8 space-y-2 sm:space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-300">
                                            <svg className="h-4 sm:h-5 w-4 sm:w-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA button - smaller padding on mobile */}
                                <Link
                                    to="/register"
                                    className={`block w-full rounded-lg py-2 sm:py-2.5 lg:py-3 text-center text-xs sm:text-sm font-semibold transition-all ${plan.popular
                                            ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg hover:shadow-primary/25 hover:shadow-xl'
                                            : 'border border-gray-800 bg-gray-900/50 text-gray-300 hover:bg-gray-900 hover:text-white hover:border-gray-700'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Stats Section - smaller text on mobile */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="mt-12 sm:mt-16 lg:mt-24"
                >
                    <div className="rounded-xl sm:rounded-2xl border border-gray-900 bg-gray-950/30 backdrop-blur-sm p-4 sm:p-6 lg:p-8">
                        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 md:grid-cols-4">
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                                    <Counter end={50000} suffix="+" />
                                </div>
                                <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs lg:text-sm text-gray-500">Active Users</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                                    <Counter end={2} suffix="M+" />
                                </div>
                                <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs lg:text-sm text-gray-500">Links Saved</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                                    <Counter end={99.9} suffix="%" />
                                </div>
                                <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs lg:text-sm text-gray-500">Uptime</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                                    4.9<span className="text-yellow-500">★</span>
                                </div>
                                <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs lg:text-sm text-gray-500">Rating</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Final CTA buttons - smaller on mobile */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="mt-12 sm:mt-16 lg:mt-20 text-center"
                >
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                        <Link
                            to="/register"
                            className="group relative inline-flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-primary to-primary-light px-5 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 text-xs sm:text-sm lg:text-base font-semibold text-white shadow-lg transition-all hover:shadow-primary/25 hover:shadow-xl active:scale-[0.98] w-full sm:w-auto"
                        >
                            <span className="relative z-10">Start your free trial</span>
                            <svg className="relative z-10 h-3 sm:h-3.5 lg:h-4 w-3 sm:w-3.5 lg:w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <motion.div
                                className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100"
                                animate={{
                                    background: [
                                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                                    ],
                                    x: ["-100%", "200%"],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                }}
                            />
                        </Link>

                        <Link
                            to="/demo"
                            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-gray-800 bg-gray-950/50 px-5 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 text-xs sm:text-sm lg:text-base font-semibold text-gray-300 transition-all hover:bg-gray-900 hover:text-white hover:border-gray-700 w-full sm:w-auto"
                        >
                            <svg className="h-3 sm:h-3.5 lg:h-4 w-3 sm:w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Watch demo
                        </Link>
                    </div>

                    <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs lg:text-sm text-gray-500">
                        No credit card required • Free forever on Starter plan
                    </p>
                </motion.div>
            </div>
        </section>
    );
}