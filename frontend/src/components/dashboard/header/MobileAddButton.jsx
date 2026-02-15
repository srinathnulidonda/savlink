// src/components/dashboard/header/MobileAddButton.jsx
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function MobileAddButton({
    onAddLink,
    position = 'auto',
    useSafeArea = true,
    customPosition = null
}) {
    const [isMobile, setIsMobile] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [screenSize, setScreenSize] = useState('normal');
    const [dynamicPosition, setDynamicPosition] = useState('bottom-right');

    useEffect(() => {
        const checkMobile = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);

            // Determine screen size category
            if (width < 360) {
                setScreenSize('small');
            } else if (width < 400) {
                setScreenSize('compact');
            } else if (width < 500) {
                setScreenSize('normal');
            } else {
                setScreenSize('large');
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Dynamic Position Based on Screen Size
    useEffect(() => {
        const getDynamicPosition = () => {
            switch (screenSize) {
                case 'small':
                    return 'bottom-center';
                case 'compact':
                    return 'bottom-right-small';
                case 'normal':
                    return 'bottom-right';
                case 'large':
                    return 'bottom-right-large';
                default:
                    return 'bottom-right';
            }
        };

        if (position === 'auto') {
            setDynamicPosition(getDynamicPosition());
        } else {
            setDynamicPosition(position);
        }
    }, [screenSize, position]);

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

    // Common Positioning Patterns
    const getPositionClasses = () => {
        const positions = {
            'bottom-right': 'bottom-4 right-4',
            'bottom-left': 'bottom-4 left-4',
            'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
            'top-right': 'top-4 right-4',
            'top-left': 'top-4 left-4',
            'center-right': 'top-1/2 right-4 -translate-y-1/2',
            'center-left': 'top-1/2 left-4 -translate-y-1/2',
            'bottom-right-large': 'bottom-8 right-8',
            'bottom-left-large': 'bottom-8 left-8',
            'bottom-center-large': 'bottom-8 left-1/2 -translate-x-1/2',
            'bottom-right-small': 'bottom-3 right-3',
            'bottom-left-small': 'bottom-3 left-3',
            'bottom-center-small': 'bottom-3 left-1/2 -translate-x-1/2',
            'bottom-right-thumb': 'bottom-16 right-4',
            'bottom-left-thumb': 'bottom-16 left-4',
            'bottom-right-safe': 'bottom-20 right-4',
            'bottom-left-safe': 'bottom-20 left-4',
        };

        return positions[dynamicPosition] || positions['bottom-right'];
    };

    // Safe Area Aware Positioning
    const getSafeAreaStyles = () => {
        if (!useSafeArea) {
            return {
                boxShadow: '0 6px 24px rgba(17, 60, 207, 0.25)'
            };
        }

        const baseStyles = {
            boxShadow: '0 6px 24px rgba(17, 60, 207, 0.25)'
        };

        if (dynamicPosition.includes('bottom')) {
            baseStyles.paddingBottom = 'env(safe-area-inset-bottom)';
            baseStyles.marginBottom = 'env(safe-area-inset-bottom)';
        }

        if (dynamicPosition.includes('top')) {
            baseStyles.paddingTop = 'env(safe-area-inset-top)';
            baseStyles.marginTop = 'env(safe-area-inset-top)';
        }

        if (dynamicPosition.includes('right')) {
            baseStyles.paddingRight = 'env(safe-area-inset-right)';
            baseStyles.marginRight = 'env(safe-area-inset-right)';
        }

        if (dynamicPosition.includes('left')) {
            baseStyles.paddingLeft = 'env(safe-area-inset-left)';
            baseStyles.marginLeft = 'env(safe-area-inset-left)';
        }

        return baseStyles;
    };

    // Custom position override
    const getCustomStyles = () => {
        if (!customPosition) return {};

        return {
            ...customPosition,
            boxShadow: '0 6px 24px rgba(17, 60, 207, 0.25)'
        };
    };

    // Determine final styles
    const finalStyles = customPosition ? getCustomStyles() : getSafeAreaStyles();

    // Determine final classes
    const positionClasses = customPosition ? 'fixed' : `fixed ${getPositionClasses()}`;

    return (
        <motion.button
            onClick={onAddLink}
            initial={{ scale: 0 }}
            animate={{
                scale: isVisible ? 1 : 0,
                y: isVisible ? 0 : 15
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.92 }}
            className={`${positionClasses} z-50 h-11 w-11 rounded-full bg-primary hover:bg-primary-light shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group mobile-fab-safe`}
            style={finalStyles}
        >
            {/* Plus Icon */}
            <svg
                className="h-5 w-5 text-white transition-transform group-active:scale-85"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>

            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:scale-100 transition-transform duration-150"></div>

            {/* Floating shadow */}
            <div className="absolute inset-0 rounded-full bg-primary/40 blur-lg scale-75 -z-10 group-hover:scale-85 transition-transform duration-300"></div>
        </motion.button>
    );
}