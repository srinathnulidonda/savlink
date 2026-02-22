// src/dashboard/pages/home/components/QuickActions.jsx

import { motion } from 'framer-motion';

export default function QuickActions() {
    const actions = [
        {
            id: 'add-link',
            title: 'Add Link',
            description: 'Save a new link to your collection',
            icon: '➕',
            color: 'from-blue-500 to-blue-600',
            shortcut: '⌘N'
        },
        {
            id: 'import',
            title: 'Import Bookmarks',
            description: 'Import from Chrome, Firefox, or Safari',
            icon: '📥',
            color: 'from-green-500 to-green-600',
            shortcut: '⌘I'
        },
        {
            id: 'create-collection',
            title: 'New Collection',
            description: 'Organize links into folders',
            icon: '📁',
            color: 'from-purple-500 to-purple-600',
            shortcut: '⌘⇧N'
        },
        {
            id: 'search',
            title: 'Search Links',
            description: 'Find links quickly',
            icon: '🔍',
            color: 'from-gray-500 to-gray-600',
            shortcut: '⌘K'
        }
    ];

    const handleAction = (actionId) => {
        switch (actionId) {
            case 'add-link':
                // Trigger add link modal
                break;
            case 'import':
                // Trigger import modal
                break;
            case 'create-collection':
                // Trigger collection creation
                break;
            case 'search':
                // Focus search or open command palette
                break;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {actions.map((action, index) => (
                    <motion.button
                        key={action.id}
                        onClick={() => handleAction(action.id)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left group"
                    >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform`}>
                            <span className="text-white text-lg">{action.icon}</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                    {action.title}
                                </h3>
                                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                    {action.shortcut}
                                </kbd>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {action.description}
                            </p>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}