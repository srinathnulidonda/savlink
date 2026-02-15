// src/components/dashboard/LinksView.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LinkCard from './LinkCard';
import LinkDetails from './LinkDetails';

export default function LinksView({
    links,
    view,
    searchQuery,
    viewMode = 'grid',
    onUpdateLink,
    onDeleteLink,
    onPinLink,
    onArchiveLink,
    onRefresh,
    loading = false
}) {
    const [selectedLink, setSelectedLink] = useState(null);
    const [hoveredLinkId, setHoveredLinkId] = useState(null);

    // Filter links based on search
    const filteredLinks = links.filter(link => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            link.title?.toLowerCase().includes(query) ||
            link.original_url?.toLowerCase().includes(query) ||
            link.notes?.toLowerCase().includes(query) ||
            link.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    });

    // Loading skeleton
    if (loading) {
        return (
            <div className="flex">
                <div className="flex-1 p-3 sm:p-4 lg:p-6">
                    <div className={
                        viewMode === 'grid'
                            ? "grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                            : "space-y-2 sm:space-y-3"
                    }>
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`
                                    ${viewMode === 'grid'
                                        ? 'rounded-lg sm:rounded-xl overflow-hidden'
                                        : 'rounded-lg sm:rounded-xl p-3 sm:p-4'
                                    }
                                    bg-gray-900/50 border border-gray-800
                                `}
                            >
                                {viewMode === 'grid' ? (
                                    <>
                                        <div className="aspect-[16/10] bg-gray-800 animate-pulse" />
                                        <div className="p-3 sm:p-4 space-y-3">
                                            <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
                                            <div className="h-3 bg-gray-800 rounded animate-pulse w-1/2" />
                                            <div className="flex gap-2">
                                                <div className="h-6 w-16 bg-gray-800 rounded-full animate-pulse" />
                                                <div className="h-6 w-16 bg-gray-800 rounded-full animate-pulse" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-gray-800 rounded-lg animate-pulse flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-800 rounded animate-pulse w-1/3" />
                                            <div className="h-3 bg-gray-800 rounded animate-pulse w-1/4" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Empty state
    if (filteredLinks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                >
                    <svg className="h-12 sm:h-16 w-12 sm:w-16 text-gray-600 mb-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        {searchQuery ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        )}
                    </svg>
                    <h3 className="text-lg sm:text-xl font-medium text-white mb-2">
                        {searchQuery ? 'No results found' : 'No links yet'}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500 text-center max-w-md">
                        {searchQuery
                            ? 'Try different keywords or filters'
                            : 'Start saving links to build your personal library'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={onRefresh}
                            className="mt-6 btn-primary"
                        >
                            Add your first link
                        </button>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex">
            <div className="flex-1 p-3 sm:p-4 lg:p-6">
                <div className={
                    viewMode === 'grid'
                        ? "grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        : "space-y-2 sm:space-y-3"
                }>
                    <AnimatePresence mode="popLayout">
                        {filteredLinks.map((link, index) => (
                            <LinkCard
                                key={link.id}
                                link={link}
                                index={index}
                                viewMode={viewMode}
                                isHovered={hoveredLinkId === link.id}
                                onHover={setHoveredLinkId}
                                onClick={() => setSelectedLink(link)}
                                onPin={() => onPinLink(link.id)}
                                onArchive={() => onArchiveLink(link.id)}
                                onDelete={() => onDeleteLink(link.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Link Details Panel - Desktop only */}
            <AnimatePresence>
                {selectedLink && window.innerWidth >= 768 && (
                    <LinkDetails
                        link={selectedLink}
                        onClose={() => setSelectedLink(null)}
                        onUpdate={onUpdateLink}
                        onDelete={onDeleteLink}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}