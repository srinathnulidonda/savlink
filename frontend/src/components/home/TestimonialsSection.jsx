// src/components/home/TestimonialsSection.jsx
import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

export default function TestimonialsSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.1 });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [testimonialsPerView, setTestimonialsPerView] = useState(3);

    const testimonials = [
        {
            id: 1,
            quote: "Savlink transformed how our team manages resources. The UI is so intuitive that onboarding takes minutes, not hours.",
            author: "Sarah Chen",
            role: "Product Designer",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
            rating: 5,
        },
        {
            id: 2,
            quote: "Finally, a tool that respects my workflow. The keyboard shortcuts and API integration save me hours every week.",
            author: "Alex Rivera",
            role: "Engineering Manager",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
            rating: 5,
        },
        {
            id: 3,
            quote: "We switched from three different tools. Savlink does everything better and costs less. The ROI is incredible.",
            author: "Jordan Park",
            role: "Developer Advocate",
            avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop",
            rating: 5,
        },
        {
            id: 4,
            quote: "The AI categorization is mind-blowing. It knows exactly how to organize my links before I even think about it.",
            author: "Maya Patel",
            role: "Content Strategist",
            avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
            rating: 5,
        },
        {
            id: 5,
            quote: "As a researcher, having all my sources in one place with full-text search is game-changing. Can't imagine working without it.",
            author: "Dr. James Wu",
            role: "Research Lead",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
            rating: 5,
        },
        {
            id: 6,
            quote: "The collaboration features are perfect. Sharing collections with my team has never been easier or more secure.",
            author: "Emma Thompson",
            role: "Marketing Director",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop",
            rating: 5,
        }
    ];

    // Handle responsive testimonials per view
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 640) {
                setTestimonialsPerView(1); // Mobile: 1 testimonial
            } else if (window.innerWidth < 1024) {
                setTestimonialsPerView(2); // Tablet: 2 testimonials
            } else {
                setTestimonialsPerView(3); // Desktop: 3 testimonials
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Create an extended array for infinite scrolling
    const extendedTestimonials = [...testimonials, ...testimonials.slice(0, testimonialsPerView)];

    // Auto-scroll every 3 seconds - moves one testimonial at a time
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                // When we reach the end of original testimonials, reset to start
                if (prevIndex >= testimonials.length - 1) {
                    // Use setTimeout to reset after the transition completes
                    setTimeout(() => {
                        setCurrentIndex(0);
                    }, 500);
                    return prevIndex + 1;
                }
                return prevIndex + 1;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [testimonials.length]);

    // Calculate the translation percentage based on testimonials per view
    const translateX = -(currentIndex * (100 / testimonialsPerView));

    // Dynamic width class based on testimonials per view
    const getWidthClass = () => {
        switch (testimonialsPerView) {
            case 1: return 'w-full';
            case 2: return 'w-1/2';
            case 3: return 'w-1/3';
            default: return 'w-1/3';
        }
    };

    return (
        <section
            id="testimonials"
            ref={ref}
            className="relative bg-black py-12 sm:py-20 lg:py-32"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Animated badge and Trust badges */}
                <div className="text-center mb-4 sm:mb-8 lg:mb-12">
                    {/* Animated badge */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={isInView ? { scale: 1 } : {}}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-purple-500/10 backdrop-blur-md px-2 sm:px-3 lg:px-4 py-0.5 sm:py-1 lg:py-1.5 mb-3 sm:mb-5 lg:mb-6"
                    >
                        <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-500 opacity-75" />
                            <span className="relative inline-flex h-full w-full rounded-full bg-purple-500" />
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-purple-400 uppercase tracking-wider">Testimonials</span>
                    </motion.div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white">
                        Loved by
                        <span className="relative inline-block ml-1 sm:ml-2 lg:ml-3">
                            <span className="relative z-10 bg-gradient-to-r from-purple-400 via-pink-400 to-primary bg-clip-text text-transparent">
                                thousands
                            </span>
                        </span>
                    </h2>
                    <p className="mt-2 sm:mt-4 lg:mt-6 text-xs sm:text-sm lg:text-base xl:text-lg text-gray-400 max-w-2xl mx-auto px-2 sm:px-4">
                        Join <span className="sm:hidden">10k+</span><span className="hidden sm:inline">10,000+</span> professionals who trust Savlink
                        <span className="hidden sm:inline"> to manage their digital knowledge</span>
                    </p>
                    {/* Trust badges */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="flex flex-row items-center justify-center gap-2 sm:gap-4 lg:gap-6 mt-3 sm:mt-5 lg:mt-6"
                    >
                        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 text-[10px] sm:text-xs lg:text-sm text-gray-400">
                            <div className="flex -space-x-1">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-4 lg:w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <span className="font-medium">
                                <span className="hidden sm:inline">4.9/5 from 2,847 reviews</span>
                                <span className="sm:hidden">4.9/5 (2.8k)</span>
                            </span>
                        </div>
                        <div className="h-3 sm:h-4 w-px bg-gray-800" />
                        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 text-[10px] sm:text-xs lg:text-sm text-gray-400">
                            <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-4 lg:w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="font-medium whitespace-nowrap">SOC 2 Certified</span>
                        </div>
                    </motion.div>
                </div>

                {/* Horizontal Scrolling Testimonials */}
                <div className="relative overflow-hidden">
                    <motion.div
                        className="flex"
                        style={{
                            transform: `translateX(${translateX}%)`,
                            transition: currentIndex === 0 ? 'none' : 'transform 500ms ease-in-out'
                        }}
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                    >
                        {extendedTestimonials.map((testimonial, index) => (
                            <div
                                key={`${testimonial.id}-${index}`}
                                className={`${getWidthClass()} flex-shrink-0 px-2 sm:px-3`}
                            >
                                <div className="rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-900 bg-gray-950/50 p-3 sm:p-4 lg:p-6 h-full">
                                    {/* Ratings */}
                                    <div className="mb-2 sm:mb-3 lg:mb-4 flex gap-0.5 sm:gap-1">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <svg key={i} className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-4 lg:w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>

                                    {/* Quote */}
                                    <p className="text-xs sm:text-sm lg:text-base text-gray-400 mb-3 sm:mb-4 lg:mb-6 line-clamp-3 sm:line-clamp-4">
                                        "{testimonial.quote}"
                                    </p>

                                    {/* Author */}
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <img
                                            src={testimonial.avatar}
                                            alt={testimonial.author}
                                            className="h-8 w-8 sm:h-10 sm:w-10 lg:h-11 lg:w-11 rounded-full object-cover"
                                        />
                                        <div>
                                            <div className="text-xs sm:text-sm lg:text-base font-medium text-white">
                                                {testimonial.author}
                                            </div>
                                            <div className="text-[10px] sm:text-xs lg:text-sm text-gray-500">
                                                {testimonial.role}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}