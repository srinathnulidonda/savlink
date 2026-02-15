// src/components/dashboard/DashboardLayout.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileMenu from './MobileMenu';
import ActivityBar from './ActivityBar';
import MobileAddButton from './header/MobileAddButton';

export default function DashboardLayout({
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
    const [viewMode, setViewMode] = useState('grid');
    const [activeCollection, setActiveCollection] = useState(null);
    const [collections, setCollections] = useState([
        { id: 1, name: 'Engineering', color: 'from-blue-600 to-blue-500', count: 432, emoji: '⚡' },
        { id: 2, name: 'Design', color: 'from-purple-600 to-purple-500', count: 234, emoji: '🎨' },
        { id: 3, name: 'Marketing', color: 'from-green-600 to-green-500', count: 156, emoji: '📈' },
        { id: 4, name: 'Docs', color: 'from-amber-600 to-amber-500', count: 89, emoji: '📚' },
        { id: 5, name: 'Research', color: 'from-red-600 to-red-500', count: 67, emoji: '🔬' },
    ]);

    // Detect mobile
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleCreateCollection = async (collectionData) => {
        // This would typically call your collections service
        console.log('Creating collection:', collectionData);

        // Simulate API call
        const newCollection = {
            id: Date.now(),
            name: collectionData.name,
            emoji: collectionData.emoji,
            color: collectionData.color || 'from-blue-600 to-blue-500',
            count: 0
        };

        setCollections(prev => [...prev, newCollection]);
        // Add your collection creation logic here
    };

    return (
        <div className="flex h-screen bg-black overflow-hidden relative">
            {/* Sidebar - Hidden on mobile */}
            {!isMobile && (
                <Sidebar
                    user={user}
                    stats={stats}
                    activeView={activeView}
                    onViewChange={onViewChange}
                    collections={collections}
                    activeCollection={activeCollection}
                    onCollectionChange={setActiveCollection}
                    onOpenCommandPalette={onOpenCommandPalette}
                    onCreateCollection={handleCreateCollection}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header
                    activeView={activeView}
                    stats={stats}
                    searchQuery={searchQuery}
                    onSearch={onSearch}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onAddLink={onAddLink}
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    onOpenCommandPalette={onOpenCommandPalette}
                    isMobile={isMobile}
                />

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-black">
                    {React.Children.map(children, child =>
                        React.cloneElement(child, { viewMode })
                    )}
                </div>

                {/* Activity Bar */}
                <ActivityBar />
            </div>

            {/* Mobile Add Button - Enhanced Floating Action Button */}
            <MobileAddButton
                onAddLink={onAddLink}
                customPosition={{
                    bottom: '45px',
                    right: '24px'
                }}
                useSafeArea={false}
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
                        activeCollection={activeCollection}
                        onCollectionChange={(collectionId) => {
                            setActiveCollection(collectionId);
                            setIsMobileMenuOpen(false);
                        }}
                        onCreateCollection={handleCreateCollection}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}