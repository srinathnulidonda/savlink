// src/components/dashboard/sidebar/QuickActions.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function QuickActions({ onOpenCommandPalette, onAddLink, onAddCollection }) {
    const [lastUsed, setLastUsed] = useState('search');

    const quickActions = [
        {
            id: 'add-link',
            label: 'Add Link',
            icon: '➕',
            action: onAddLink,
            bgColor: 'hover:bg-green-500/10',
            textColor: 'hover:text-green-400',
            borderColor: 'hover:border-green-500/20'
        },
        {
            id: 'add-folder',
            label: 'Add Folder',
            icon: '➕',
            action: onAddCollection,
            bgColor: 'hover:bg-blue-500/10',
            textColor: 'hover:text-blue-400',
            borderColor: 'hover:border-blue-500/20'
        }
    ];

    return (
        <div className="p-2.5 lg:p-3">
            {/* Search Command Palette */}
            <motion.button
                onClick={() => {
                    setLastUsed('search');
                    onOpenCommandPalette();
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-2.5 py-1.5 text-xs text-gray-400 hover:border-gray-700 hover:bg-gray-900 hover:text-white transition-all mb-2 ${lastUsed === 'search' ? 'ring-1 ring-primary/30' : ''
                    }`}
            >
                <span className="flex items-center gap-1.5 text-xs">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search...
                </span>
                <kbd className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                    ⌘K
                </kbd>
            </motion.button>

            {/* Quick Action Buttons */}
            <div className="space-y-0.5">
                {quickActions.map((action, index) => (
                    <motion.button
                        key={action.id}
                        onClick={action.action}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-400 ${action.bgColor} ${action.textColor} transition-all group border border-transparent ${action.borderColor}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <span className="text-xs transition-transform group-hover:scale-110">
                            {action.icon}
                        </span>
                        <span className="font-medium">
                            {action.label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}