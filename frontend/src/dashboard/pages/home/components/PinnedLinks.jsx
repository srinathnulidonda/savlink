// src/dashboard/pages/home/components/PinnedLinks.jsx

import { motion } from 'framer-motion';

export default function PinnedLinks({ links = [] }) {
    const pinnedLinks = links.filter(link => link.pinned).slice(0, 8);

    const handleLinkClick = (link) => {
        if (link.original_url) {
            window.open(link.original_url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-yellow-500">⭐</span>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Starred
                </h2>
            </div>

            {pinnedLinks.length === 0 ? (
                <div className="text-center py-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="w-12 h-12 mx-auto mb-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                            <span className="text-2xl">⭐</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            No starred links
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Star important links for quick access
                        </p>
                    </motion.div>
                </div>
            ) : (
                <div className="space-y-2">
                    {pinnedLinks.map((link, index) => (
                        <motion.button
                            key={link.id || index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleLinkClick(link)}
                            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-left group transition-all"
                        >
                            <span className="text-sm">{link.favicon || '🔗'}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {link.title || 'Untitled'}
                            </span>
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
}