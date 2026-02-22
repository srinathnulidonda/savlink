// src/dashboard/pages/home/components/SearchShortcut.jsx

import { motion } from 'framer-motion';

export default function SearchShortcut({ onOpenSearch }) {
    return (
        <motion.button
            onClick={onOpenSearch}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
        >
            <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                Search links...
            </span>
            <kbd className="px-2 py-0.5 text-xs font-mono bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-500 dark:text-gray-400">
                ⌘K
            </kbd>
        </motion.button>
    );
}