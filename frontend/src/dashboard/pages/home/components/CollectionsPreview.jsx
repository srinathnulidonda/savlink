// src/dashboard/pages/home/components/CollectionsPreview.jsx

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pluralize } from '../utils';

function displayIcon(icon) {
  if (!icon) return '📁';
  if (icon.length <= 2) return icon;
  return '📁';
}

export default function CollectionsPreview({ collections = [] }) {
  const navigate = useNavigate();

  return (
    <section className="rounded-xl border border-gray-800/50 bg-gray-900/20 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800/30">
        <h2 className="text-[13px] font-medium text-gray-300">Collections</h2>
        {collections.length > 4 && (
          <button
            onClick={() => navigate('/dashboard/my-files')}
            className="text-[12px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1 group"
          >
            View all
            <svg
              className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {collections.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-gray-800/30 border border-gray-800/50 flex items-center justify-center mb-3">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
          </div>
          <p className="text-[13px] text-gray-400 mb-0.5">No collections</p>
          <p className="text-[11px] text-gray-600">Group related links together</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-800/20">
          {collections.slice(0, 6).map((col, i) => (
            <motion.button
              key={col.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/dashboard/collections/${col.id}`)}
              className="flex items-center gap-3 px-5 py-3.5 bg-gray-950/80 hover:bg-white/[0.02] transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-800/40 border border-gray-800/50 flex items-center justify-center flex-shrink-0 group-hover:border-gray-700/50 group-hover:bg-gray-800/60 transition-all">
                <span className="text-lg leading-none">
                  {displayIcon(col.icon)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-300 truncate group-hover:text-white transition-colors">
                  {col.name}
                </p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {col.count} {pluralize(col.count, 'link')}
                </p>
              </div>

              <svg
                className="w-3.5 h-3.5 text-gray-800 group-hover:text-gray-500 -translate-x-1 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}