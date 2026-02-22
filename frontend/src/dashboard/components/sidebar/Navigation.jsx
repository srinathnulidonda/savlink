// src/dashboard/components/sidebar/Navigation.jsx

import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navigation({ stats, activeView, onViewChange }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Enhanced view detection
    const getCurrentView = () => {
        const path = location.pathname;
        
        if (path.includes('/home')) return 'home';
        if (path.includes('/my-files')) return 'myfiles';
        if (path.includes('/all')) return 'all';
        if (path.includes('/starred')) return 'starred';
        if (path.includes('/recent')) return 'recent';
        if (path.includes('/archive')) return 'archive';
        
        return 'home';
    };

    const currentView = getCurrentView();

    // All navigation items in one list
    const navigationItems = [
        {
            id: 'home',
            label: 'Home',
            path: '/dashboard/home',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            type: 'workspace'
        },
        {
            id: 'myfiles',
            label: 'My Files',
            path: '/dashboard/my-files',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
            ),
            type: 'workspace'
        },
        // Divider indicator
        { type: 'divider' },
        // Link views
        {
            id: 'all',
            label: 'All Links',
            count: stats.all,
            path: '/dashboard/links/all',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            ),
            type: 'filter'
        },
        {
            id: 'starred',
            label: 'Starred',
            count: stats.starred,
            path: '/dashboard/links/starred',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            ),
            type: 'filter'
        },
        {
            id: 'recent',
            label: 'Recent',
            count: stats.recent,
            path: '/dashboard/links/recent',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            type: 'filter'
        },
        {
            id: 'archive',
            label: 'Archive',
            count: stats.archive,
            path: '/dashboard/links/archive',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-3m-13 0h3m-3 0v-3m3 3v3" />
                </svg>
            ),
            type: 'filter'
        }
    ];

    // Navigation handler
    const handleNavigation = (path, itemId) => {
        navigate(path);
        if (onViewChange) {
            onViewChange(itemId);
        }
    };

    const getCountDisplay = (count) => {
        if (!count || count === 0) return null;
        if (count > 9999) return '9999+';
        if (count > 999) return `${Math.floor(count / 1000)}k`;
        return count.toString();
    };

    const getItemStyles = (isActive) => {
        return isActive
            ? 'bg-primary/10 text-primary'
            : 'text-gray-400 hover:bg-gray-900/50 hover:text-white';
    };

    const getIconStyles = (isActive) => {
        return isActive ? 'text-primary' : 'text-gray-500';
    };

    const getCountStyles = (isActive) => {
        return isActive ? 'text-primary/70' : 'text-gray-500';
    };

    const renderNavigationItem = (item) => {
        if (item.type === 'divider') {
            return (
                <div key="divider" className="my-3 border-t border-gray-800"></div>
            );
        }

        const isActive = currentView === item.id;
        const countDisplay = getCountDisplay(item.count);

        return (
            <motion.button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.id)}
                whileHover={{ 
                    scale: isActive ? 1 : 1.01
                }}
                whileTap={{ 
                    scale: 0.995
                }}
                transition={{ 
                    duration: 0.1,
                    ease: "easeOut"
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${getItemStyles(isActive)}`}
            >
                {/* Icon */}
                <div className={`transition-colors flex-shrink-0 ${getIconStyles(isActive)}`}>
                    {item.icon}
                </div>

                {/* Label */}
                <span className="flex-1 text-left font-medium">
                    {item.label}
                </span>

                {/* Count and Active Indicator */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Count Display */}
                    {countDisplay && (
                        <span className={`text-xs font-medium ${getCountStyles(isActive)}`}>
                            {countDisplay}
                        </span>
                    )}

                    {/* Active Indicator */}
                    {isActive && (
                        <motion.div
                            layoutId="navigationActiveIndicator"
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                </div>
            </motion.button>
        );
    };

    return (
        <nav className="px-3 pb-3">
            <div className="space-y-1">
                {navigationItems.map(item => renderNavigationItem(item))}
            </div>
        </nav>
    );
}