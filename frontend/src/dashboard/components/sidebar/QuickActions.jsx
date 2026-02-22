// src/dashboard/components/sidebar/QuickActions.jsx - Minimal Google Drive style
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function QuickActions({ onOpenCommandPalette, onAddLink, onAddCollection }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [lastUsed, setLastUsed] = useState('');
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const actions = [
        {
            id: 'add-link',
            label: 'Add Link',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            ),
            action: () => {
                setLastUsed('add-link');
                onAddLink();
                setIsDropdownOpen(false);
            },
            description: 'Save a new link'
        },
        {
            id: 'new-collection',
            label: 'New Collection',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            action: () => {
                setLastUsed('new-collection');
                onAddCollection();
                setIsDropdownOpen(false);
            },
            description: 'Create a new collection'
        },
        {
            id: 'import-links',
            label: 'Import Links',
            icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
            ),
            action: () => {
                setLastUsed('import-links');
                navigate('/dashboard/settings/import');
                setIsDropdownOpen(false);
            },
            description: 'Import from browser or other services'
        }
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="p-3 border-b border-gray-900" ref={dropdownRef}>
            {/* Search Command Palette */}
            <motion.button
                onClick={() => {
                    setLastUsed('search');
                    onOpenCommandPalette();
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2.5 text-sm text-gray-400 hover:border-gray-700 hover:bg-gray-900 hover:text-white transition-all mb-2 ${lastUsed === 'search' ? 'ring-1 ring-primary/30' : ''
                    }`}
            >
                <span className="flex items-center gap-1.5 text-sm">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search...
                </span>
                <kbd className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                    ⌘K
                </kbd>
            </motion.button>

            <div className="relative">
                {/* Main New Button */}
                <motion.button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 rounded-lg border transition-all ${
                        isDropdownOpen
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-800 bg-gray-900/50 text-gray-300 hover:bg-gray-900 hover:border-gray-700 hover:text-white'
                    } px-3 py-2.5 text-sm font-medium`}
                >
                    <div className={`rounded-full p-1 transition-colors ${
                        isDropdownOpen ? 'bg-primary/10' : 'bg-gray-800'
                    }`}>
                        <motion.svg 
                            className="h-3.5 w-3.5" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth={2.5}
                            animate={{ rotate: isDropdownOpen ? 45 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </motion.svg>
                    </div>
                    <span>New</span>
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {isDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-800 bg-gray-950 shadow-2xl z-50 overflow-hidden"
                        >
                            {actions.map((action, index) => (
                                <motion.button
                                    key={action.id}
                                    onClick={action.action}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-900 hover:text-white transition-colors group border-b border-gray-800 last:border-b-0"
                                >
                                    <div className="text-gray-500 group-hover:text-white transition-colors">
                                        {action.icon}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium">{action.label}</div>
                                        <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                                            {action.description}
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}