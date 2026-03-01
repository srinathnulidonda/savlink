// src/dashboard/pages/collections/CollectionEmpty.jsx
import { motion } from 'framer-motion';

export default function CollectionEmpty({ folderName, onAddLink, onImport,}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-2xl bg-gray-800/30 border border-gray-800/40 flex items-center justify-center mx-auto mb-5"
        >
          <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </motion.div>

        <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="text-[16px] font-medium text-white mb-2">
          {folderName} is empty
        </motion.h3>

        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-[13px] text-gray-500 mb-6 leading-relaxed">
          Save links here to keep them organized.<br />
          Drag links from other views or add new ones.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-2.5">
          <button onClick={onAddLink}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-primary hover:bg-primary-light rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add a link
          </button>
          {onImport && (
            <button onClick={onImport}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}