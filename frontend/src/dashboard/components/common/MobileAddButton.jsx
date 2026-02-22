// src/dashboard/components/common/MobileAddButton.jsx

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function MobileAddButton({
    onAddLink,
    position = 'bottom-right',
    useSafeArea = true
}) {
    const [isMobile, setIsMobile] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }

            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Don't render on desktop
    if (!isMobile) return null;

    const positionClasses = {
        'bottom-right': 'bottom-6 right-4',
        'bottom-left': 'bottom-6 left-4',
        'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2'
    };

    const safeAreaStyles = useSafeArea ? {
        paddingBottom: 'env(safe-area-inset-bottom)',
        marginBottom: 'env(safe-area-inset-bottom)'
    } : {};

    return (
        <motion.button
            onClick={onAddLink}
            initial={{ scale: 0 }}
            animate={{
                scale: isVisible ? 1 : 0,
                y: isVisible ? 0 : 15
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`fixed z-50 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${positionClasses[position]}`}
            style={safeAreaStyles}
        >
            <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
        </motion.button>
    );
}