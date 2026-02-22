// src/dashboard/components/links/LinkDetails.jsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function LinkDetails({ link, onClose, onUpdate, onDelete }) {
    const [copying, setCopying] = useState(null);

    const handleCopy = async (text, type) => {
        setCopying(type);
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch (error) {
            toast.error('Failed to copy');
        }
        setTimeout(() => setCopying(null), 1000);
    };

    const handleShare = async () => {
        const shareData = {
            title: link.title || 'Shared link',
            url: link.short_url || link.original_url,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await handleCopy(shareData.url, 'share');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                await handleCopy(shareData.url, 'share');
            }
        }
    };

    const handleDelete = () => {
        if (window.confirm('Delete this link? This action cannot be undone.')) {
            onDelete(link.id);
        }
    };

    return (
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: 320 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0"
        >
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Link details
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Title
                            </label>
                            <p className="text-sm text-gray-900 dark:text-white">
                                {link.title || 'Untitled'}
                            </p>
                        </div>

                        {/* URL */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                URL
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
                                        {link.original_url}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCopy(link.original_url, 'url')}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                    title="Copy URL"
                                >
                                    {copying === 'url' ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Short URL */}
                        {link.short_url && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    Short URL
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-mono truncate">
                                            {link.short_url}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(link.short_url, 'shortUrl')}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                        title="Copy short URL"
                                    >
                                        {copying === 'shortUrl' ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {(link.notes || link.notes_preview) && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    Notes
                                </label>
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                    {link.notes || link.notes_preview}
                                </p>
                            </div>
                        )}

                        {/* Tags */}
                        {link.tags && link.tags.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    Tags
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {link.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Created
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {link.relative_time || 'Unknown'}
                            </p>
                        </div>

                        {/* Click count */}
                        {link.click_count !== undefined && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    Clicks
                                </label>
                                <p className="text-sm text-gray-900 dark:text-white">
                                    {link.click_count.toLocaleString()}
                                </p>
                            </div>
                        )}

                        {/* Status */}
                        <div className="flex flex-wrap gap-2">
                            {link.pinned && (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded">
                                    Pinned
                                </span>
                            )}
                            {link.archived && (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                    Archived
                                </span>
                            )}
                            {link.is_public && (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
                                    Public
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
                    {/* Primary action */}
                    <button
                        onClick={() => window.open(link.original_url, '_blank')}
                        className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                        Open link
                    </button>

                    {/* Secondary actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleShare}
                            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                            Share
                        </button>
                        <button
                            onClick={() => onUpdate && onUpdate(link.id)}
                            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                            Edit
                        </button>
                    </div>

                    {/* Danger zone */}
                    <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </motion.div>
    );
}