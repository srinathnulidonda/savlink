// src/components/dashboard/LinkDetails.jsx
import { motion } from 'framer-motion';

export default function LinkDetails({ link, onClose, onUpdate, onDelete }) {
    return (
        <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-gray-900 bg-gray-950/50 overflow-hidden"
        >
            <div className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-white">Details</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto text-sm">
                    <div>
                        <label className="text-xs text-gray-500">Title</label>
                        <p className="mt-1 text-white">{link.title || 'Untitled'}</p>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500">URL</label>
                        <p className="mt-1 text-gray-400 font-mono text-xs break-all">
                            {link.original_url}
                        </p>
                    </div>

                    {link.short_url && (
                        <div>
                            <label className="text-xs text-gray-500">Short URL</label>
                            <p className="mt-1 text-primary font-mono text-xs">{link.short_url}</p>
                        </div>
                    )}

                    <div>
                        <label className="text-xs text-gray-500">Notes</label>
                        <p className="mt-1 text-gray-400 text-xs">
                            {link.notes || 'No notes added'}
                        </p>
                    </div>

                    {link.tags && link.tags.length > 0 && (
                        <div>
                            <label className="text-xs text-gray-500">Tags</label>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {link.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs text-gray-500">Created</label>
                        <p className="mt-1 text-gray-400 text-xs">{link.created_at}</p>
                    </div>

                    {link.click_count !== undefined && (
                        <div>
                            <label className="text-xs text-gray-500">Clicks</label>
                            <p className="mt-1 text-white">{link.click_count}</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 space-y-2 border-t border-gray-900 pt-4">
                    <button
                        onClick={() => window.open(link.original_url, '_blank')}
                        className="w-full btn-primary text-xs py-2"
                    >
                        Open Link
                    </button>
                    <button
                        onClick={() => onDelete(link.id)}
                        className="w-full btn-secondary text-xs py-2 text-red-400 hover:text-red-300"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </motion.div>
    );
}