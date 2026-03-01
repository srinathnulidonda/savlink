// src/dashboard/pages/home/components/GettingStarted.jsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
    {
        id: 'save',
        title: 'Save your first link',
        description: 'Press ⌘N or click the button to save any URL',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
        ),
        action: 'addLink',
        actionLabel: 'Add link',
    },
    {
        id: 'organize',
        title: 'Create a collection',
        description: 'Group related links into organized folders',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
        ),
        action: 'navigate',
        path: '/dashboard/myfiles',
        actionLabel: 'Create collection',
    },
    {
        id: 'search',
        title: 'Try searching',
        description: 'Press ⌘K to search across all your saved links',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
        action: 'search',
        actionLabel: 'Open search',
    },
];

export default function GettingStarted({ onAddLink, onOpenSearch, onNavigate }) {
    const [dismissed, setDismissed] = useState(false);

    const handleAction = (step) => {
        switch (step.action) {
            case 'addLink': onAddLink?.(); break;
            case 'search': onOpenSearch?.(); break;
            case 'navigate': onNavigate?.(step.path); break;
        }
    };

    if (dismissed) return null;

    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="rounded-xl border border-gray-800/60 bg-gradient-to-b from-gray-900/40 to-transparent overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-[13px] font-medium text-gray-200">
                            Get started
                        </h2>
                        <p className="text-[11px] text-gray-500">
                            Set up your workspace in 3 steps
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1 text-gray-600 hover:text-gray-400 rounded-md hover:bg-gray-800/50 transition-colors"
                    aria-label="Dismiss getting started"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Steps */}
            <div className="divide-y divide-gray-800/30">
                {STEPS.map((step, i) => (
                    <motion.button
                        key={step.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => handleAction(step)}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left 
                                   hover:bg-white/[0.015] transition-colors group"
                    >
                        {/* Step number */}
                        <div className="w-8 h-8 rounded-full border border-gray-700/60 bg-gray-800/30
                                        flex items-center justify-center flex-shrink-0
                                        group-hover:border-primary/40 group-hover:bg-primary/5 transition-colors">
                            <span className="text-[11px] font-medium text-gray-500 group-hover:text-primary transition-colors">
                                {i + 1}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors">
                                {step.title}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {step.description}
                            </p>
                        </div>

                        {/* Arrow */}
                        <svg
                            className="w-4 h-4 text-gray-700 opacity-0 -translate-x-1 
                                       group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </motion.button>
                ))}
            </div>
        </motion.section>
    );
}