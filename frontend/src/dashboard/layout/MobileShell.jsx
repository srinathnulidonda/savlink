// src/dashboard/layout/MobileShell.jsx

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderMobile from '../components/header/HeaderMobile';
import MobileMenu from './MobileMenu';
import MobileAddButton from '../components/common/MobileAddButton';

export default function MobileShell({
    user,
    stats,
    activeView,
    onViewChange,
    onSearch,
    searchQuery,
    onAddLink,
    onOpenCommandPalette,
    children
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [collections] = useState([
        { id: 1, name: 'Engineering', color: 'from-blue-600 to-blue-500', count: 432, emoji: '⚡' },
        { id: 2, name: 'Design', color: 'from-purple-600 to-purple-500', count: 234, emoji: '🎨' },
        { id: 3, name: 'Marketing', color: 'from-green-600 to-green-500', count: 156, emoji: '📈' },
    ]);

    // Prevent body scroll when menu is open
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

    const handleCreateCollection = async (collectionData) => {
        console.log('Creating collection:', collectionData);
        // Add collection creation logic here
    };

    return (
        <div className="flex h-screen bg-black overflow-hidden relative">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <div className="border-b border-gray-900 bg-gray-950/50 px-3 py-3 safe-area-top">
                    <HeaderMobile
                        activeView={activeView}
                        stats={stats}
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                        onOpenCommandPalette={onOpenCommandPalette}
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-black safe-area-bottom">
                    {children}
                </div>

                {/* ✅ ActivityBar removed */}
            </div>

            {/* Floating Add Button */}
            <MobileAddButton
                onAddLink={onAddLink}
                useSafeArea={true}
            />

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <MobileMenu
                        isOpen={isMobileMenuOpen}
                        onClose={() => setIsMobileMenuOpen(false)}
                        user={user}
                        stats={stats}
                        activeView={activeView}
                        onViewChange={(view) => {
                            onViewChange(view);
                            setIsMobileMenuOpen(false);
                        }}
                        collections={collections}
                        onCreateCollection={handleCreateCollection}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}