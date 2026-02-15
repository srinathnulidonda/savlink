// src/components/dashboard/LinkCard.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState, forwardRef } from 'react';

const LinkCard = forwardRef(({
    link,
    index,
    viewMode,
    isHovered,
    onHover,
    onClick,
    onPin,
    onArchive,
    onDelete
}, ref) => {
    const [showActions, setShowActions] = useState(false);
    const isMobile = window.innerWidth < 768;

    const handleOpenLink = (e) => {
        e.stopPropagation();
        window.open(link.original_url, '_blank', 'noopener,noreferrer');
    };

    const handleCopyLink = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(link.short_url || link.original_url);
    };

    const getColorFromLink = () => {
        const colors = [
            'from-purple-500/20 to-indigo-500/20',
            'from-blue-500/20 to-cyan-500/20',
            'from-gray-600/20 to-gray-500/20',
            'from-cyan-500/20 to-teal-500/20',
            'from-blue-400/20 to-blue-600/20',
            'from-pink-500/20 to-rose-500/20',
        ];
        return colors[index % colors.length];
    };

    const getFaviconEmoji = () => {
        const emojis = ['🟣', '🔵', '▲', '🎨', '⚛️', '🎭'];
        return emojis[index % emojis.length];
    };

    if (viewMode === 'list') {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={onClick}
                onMouseEnter={() => !isMobile && onHover(link.id)}
                onMouseLeave={() => !isMobile && onHover(null)}
                className="group relative cursor-pointer overflow-hidden rounded-lg sm:rounded-xl border border-gray-900 bg-gray-950/50 p-3 sm:p-4 transition-all hover:border-gray-800 hover:bg-gray-950"
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gradient-to-br ${getColorFromLink()} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-xl sm:text-2xl">{link.favicon || getFaviconEmoji()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-medium text-white truncate group-hover:text-primary transition-colors">
                                {link.title || link.display_url}
                            </h3>
                            {link.is_public && (
                                <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {link.pinned && (
                                <span className="text-yellow-500">⭐</span>
                            )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-mono truncate">{link.display_url}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 sm:gap-4">
                        {link.tags && link.tags.length > 0 && (
                            <div className="hidden lg:flex gap-1">
                                {link.tags.slice(0, 2).map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <span className="text-xs text-gray-500">{link.relative_time}</span>
                    </div>

                    {/* Quick Actions for List View */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={handleOpenLink}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors"
                            title="Open link"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onPin();
                            }}
                            className={`p-1.5 transition-colors ${link.pinned ? 'text-yellow-500' : 'text-gray-400 hover:text-white'}`}
                            title={link.pinned ? 'Unpin' : 'Pin'}
                        >
                            <svg className="h-4 w-4" fill={link.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Grid View
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            onMouseEnter={() => !isMobile && onHover(link.id)}
            onMouseLeave={() => !isMobile && onHover(null)}
            onClick={onClick}
            className="group relative cursor-pointer overflow-hidden rounded-lg sm:rounded-xl border border-gray-900 bg-gray-950/50 transition-all hover:border-gray-800 hover:bg-gray-950"
        >
            {/* Preview Area */}
            <div className={`aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-gradient-to-br ${getColorFromLink()}`}>
                <div className="flex h-full items-center justify-center">
                    <span className="text-3xl sm:text-4xl">{link.favicon || getFaviconEmoji()}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-medium text-white line-clamp-1 group-hover:text-primary transition-colors">
                            {link.title || link.display_url}
                        </h3>
                        <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500 font-mono truncate">
                            {link.display_url}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        {link.is_public && (
                            <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        {link.pinned && (
                            <span className="text-yellow-500">⭐</span>
                        )}
                    </div>
                </div>

                {link.notes_preview && (
                    <p className="mt-2 text-xs sm:text-sm text-gray-400 line-clamp-2">
                        {link.notes_preview}
                    </p>
                )}

                {link.tags && link.tags.length > 0 && (
                    <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                        {link.tags.slice(0, 2).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] sm:text-xs text-gray-400"
                            >
                                {tag}
                            </span>
                        ))}
                        {link.tags.length > 2 && (
                            <span className="text-[10px] sm:text-xs text-gray-600">
                                +{link.tags.length - 2}
                            </span>
                        )}
                    </div>
                )}

                <div className="mt-2 sm:mt-3 flex items-center justify-between border-t border-gray-900 pt-2 sm:pt-3">
                    <span className="text-[10px] sm:text-xs text-gray-500">{link.relative_time}</span>
                    {link.link_type === 'shortened' && (
                        <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                            <svg className="h-3 sm:h-3.5 w-3 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {link.click_count || 0}
                        </span>
                    )}
                </div>
            </div>

            {/* Hover Actions - Desktop only */}
            <AnimatePresence>
                {!isMobile && isHovered && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-2 top-2 flex gap-1"
                    >
                        <button
                            onClick={handleOpenLink}
                            className="rounded-lg bg-black/80 backdrop-blur-sm p-1.5 sm:p-2 text-white hover:bg-black transition-all"
                        >
                            <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="rounded-lg bg-black/80 backdrop-blur-sm p-1.5 sm:p-2 text-white hover:bg-black transition-all"
                        >
                            <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

LinkCard.displayName = 'LinkCard';

export default LinkCard;