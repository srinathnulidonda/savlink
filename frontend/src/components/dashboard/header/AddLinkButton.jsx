// src/components/dashboard/header/AddLinkButton.jsx
import { motion } from 'framer-motion';

export default function AddLinkButton({ onAddLink }) {
    return (
        <motion.button
            onClick={onAddLink}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center gap-2 text-xs lg:text-sm px-3 lg:px-5 py-1.5 lg:py-2.5 rounded-lg bg-primary hover:bg-primary-light text-white font-medium transition-all"
            title="Add new link (⌘N)"
        >
            <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add</span>
        </motion.button>
    );
}