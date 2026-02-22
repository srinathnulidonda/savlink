// src/dashboard/layout/DashboardLayout.jsx 

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileShell from './MobileShell';
import MobileMenu from './MobileMenu';
import DashboardErrorBoundary from './DashboardErrorBoundary';

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
        console.log('Creating collection:', collectionData);
        const newCollection = {
            id: Date.now(),
            name: collectionData.name,
            emoji: collectionData.emoji,
            color: collectionData.color || 'from-blue-600 to-blue-500',
            count: 0
        };
        setCollections(prev => [...prev, newCollection]);
    };

    // ✅ Pass navigation props correctly
    if (isMobile) {
        return (
            <DashboardErrorBoundary>
                <MobileShell
                    user={user}
                    stats={stats}
                    activeView={activeView}
                    onViewChange={onViewChange}
                    onSearch={onSearch}
                    searchQuery={searchQuery}
                    onAddLink={onAddLink}
                    onOpenCommandPalette={onOpenCommandPalette}
                    collections={collections}
                    activeCollection={activeCollection}
                    onCollectionChange={setActiveCollection}
                    onCreateCollection={handleCreateCollection}
                >
                    {React.Children.map(children, child =>
                        React.cloneElement(child, { viewMode })
                    )}
                </MobileShell>
            </DashboardErrorBoundary>
        );
    }

    // Desktop Layout
    return (
        <DashboardErrorBoundary>
            <div className="flex h-screen bg-black overflow-hidden relative">
                {/* Desktop Sidebar */}
                <Sidebar
                    user={user}
                    stats={stats}
                    activeView={activeView}
                    onViewChange={onViewChange} // ✅ Pass this prop
                    collections={collections}
                    activeCollection={activeCollection}
                    onCollectionChange={setActiveCollection}
                    onOpenCommandPalette={onOpenCommandPalette}
                    onCreateCollection={handleCreateCollection}
                />

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
                        isMobile={false}
                    />

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-black">
                        {React.Children.map(children, child =>
                            React.cloneElement(child, { viewMode })
                        )}
                    </div>

                </div>
            </div>
        </DashboardErrorBoundary>
    );
}