// src/components/dashboard/Header.jsx
import { useState, useEffect } from 'react';
import HeaderMobile from './header/HeaderMobile';
import HeaderDesktop from './header/HeaderDesktop';

export default function Header({
    activeView,
    stats,
    searchQuery,
    onSearch,
    viewMode,
    onViewModeChange,
    onAddLink,
    onMenuClick,
    onOpenCommandPalette,
    isMobile
}) {
    // Mobile detection with state to prevent hydration mismatch
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="border-b border-gray-900 bg-gray-950/50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
            {isMobileView ? (
                <HeaderMobile
                    activeView={activeView}
                    stats={stats}
                    onMenuClick={onMenuClick}
                    onOpenCommandPalette={onOpenCommandPalette}
                // Note: onAddLink is handled by the floating button on mobile
                />
            ) : (
                <HeaderDesktop
                    activeView={activeView}
                    stats={stats}
                    searchQuery={searchQuery}
                    onSearch={onSearch}
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                    onAddLink={onAddLink}
                />
            )}
        </div>
    );
}