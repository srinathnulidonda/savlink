// src/components/dashboard/CommandPalette.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function CommandPalette({ isOpen, onClose, onAddLink, onNavigate }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    const commands = [
        {
            id: 'add-link',
            icon: '➕',
            label: 'Add new link',
            shortcut: 'N',
            action: onAddLink,
            category: 'Quick Actions'
        },
        {
            id: 'create-collection',
            icon: '📁',
            label: 'Create collection',
            shortcut: 'C',
            action: () => console.log('Create collection'),
            category: 'Quick Actions'
        },
        {
            id: 'search',
            icon: '🔍',
            label: 'Search links',
            shortcut: 'S',
            action: () => console.log('Search'),
            category: 'Quick Actions'
        },
        {
            id: 'import',
            icon: '📥',
            label: 'Import bookmarks',
            shortcut: 'I',
            action: () => console.log('Import'),
            category: 'Quick Actions'
        },
        {
            id: 'export',
            icon: '📤',
            label: 'Export links',
            shortcut: 'E',
            action: () => console.log('Export'),
            category: 'Quick Actions'
        },
        {
            id: 'settings',
            icon: '⚙️',
            label: 'Settings',
            shortcut: ',',
            action: () => onNavigate('/dashboard/settings'),
            category: 'Navigation'
        },
        {
            id: 'profile',
            icon: '👤',
            label: 'Profile',
            shortcut: 'P',
            action: () => onNavigate('/dashboard/profile'),
            category: 'Navigation'
        },
        {
            id: 'help',
            icon: '❓',
            label: 'Help & Support',
            shortcut: '?',
            action: () => window.open('/help', '_blank'),
            category: 'Help'
        },
    ];

    // Filter commands based on query
    const filteredCommands = commands.filter(command =>
        command.label.toLowerCase().includes(query.toLowerCase()) ||
        command.category.toLowerCase().includes(query.toLowerCase())
    );

    // Group commands by category
    const groupedCommands = filteredCommands.reduce((acc, command) => {
        if (!acc[command.category]) {
            acc[command.category] = [];
        }
        acc[command.category].push(command);
        return acc;
    }, {});

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < filteredCommands.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredCommands.length - 1
                );
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredCommands, onClose]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-10 sm:pt-20"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-[calc(100%-2rem)] sm:w-full max-w-2xl rounded-xl border border-gray-800 bg-gray-950 shadow-2xl mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 border-b border-gray-900 p-3 sm:p-4">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a command or search..."
                        className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none"
                    />
                    <kbd className="text-[10px] sm:text-xs text-gray-500 font-mono">ESC</kbd>
                </div>

                {/* Commands List */}
                <div className="max-h-[400px] overflow-y-auto p-2">
                    {filteredCommands.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-gray-500">No commands found</p>
                        </div>
                    ) : (
                        Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                            <div key={category} className="mb-4">
                                <div className="text-[10px] sm:text-xs text-gray-500 px-3 py-2 uppercase tracking-wider">
                                    {category}
                                </div>
                                {categoryCommands.map((command, index) => {
                                    const globalIndex = filteredCommands.indexOf(command);
                                    return (
                                        <button
                                            key={command.id}
                                            onClick={() => {
                                                command.action();
                                                onClose();
                                            }}
                                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm text-gray-400 hover:bg-gray-900 hover:text-white text-left transition-all ${globalIndex === selectedIndex ? 'bg-gray-900 text-white' : ''
                                                }`}
                                        >
                                            <span className="flex items-center gap-2 sm:gap-3">
                                                <span className="text-sm sm:text-base">{command.icon}</span>
                                                {command.label}
                                            </span>
                                            <kbd className="text-[10px] sm:text-xs text-gray-600 font-mono">
                                                <span className="hidden sm:inline">⌘</span>{command.shortcut}
                                            </kbd>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}