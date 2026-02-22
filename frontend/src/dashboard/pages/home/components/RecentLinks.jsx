// src/dashboard/pages/home/components/RecentLinks.jsx

import { motion } from 'framer-motion';

export default function RecentLinks({ links = [] }) {
    const handleLinkClick = (link) => {
        window.open(link.original_url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Links
                </h2>
                {links.length > 0 && (
                    <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        View all →
                    </button>
                )}
            </div>
            
            {links.length === 0 ? (
                <div className="text-center py-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No recent links
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
                            Start saving links to see them appear here. Your most recently added links will be shown in this section.
                        </p>
                        <button className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add your first link
                        </button>
                    </motion.div>
                </div>
            ) : (
                <div className="space-y-3">
                    {links.slice(0, 6).map((link, index) => (
                        <motion.div
                            key={link.id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleLinkClick(link)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group transition-all"
                        >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-sm">
                                    {link.favicon || '🔗'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {link.title || 'Untitled'}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {link.display_url || link.original_url}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                                <span>{link.relative_time || 'Recently'}</span>
                                {link.pinned && <span className="text-yellow-500">⭐</span>}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}