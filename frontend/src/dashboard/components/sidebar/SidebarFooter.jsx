// src/dashboard/components/sidebar/SidebarFooter.jsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function SidebarFooter({ onAddLink, onCreateFolder }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="flex-shrink-0 border-t border-gray-800/40 p-3 space-y-3">
      <div ref={ref} className="relative">
        <motion.button
          onClick={() => setMenuOpen(!menuOpen)}
          whileTap={{ scale: 0.97 }}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2
            text-[13px] font-medium rounded-lg transition-colors
            ${menuOpen
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-white bg-primary hover:bg-primary-light'}`}
        >
          <motion.svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}
            animate={{ rotate: menuOpen ? 45 : 0 }}
            transition={{ duration: 0.15 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </motion.svg>
          New
        </motion.button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full left-0 right-0 mb-2 rounded-lg
                border border-gray-800/60 bg-[#111] shadow-2xl shadow-black/60
                overflow-hidden py-1 z-50"
            >
              <NewMenuItem
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>}
                label="New Link" shortcut="⌘N"
                onClick={() => { setMenuOpen(false); onAddLink?.(); }}
              />
              <NewMenuItem
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>}
                label="New Folder" shortcut="⇧⌘N"
                onClick={() => { setMenuOpen(false); onCreateFolder?.(); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Link to="/terms" className="text-[10px] text-gray-700 hover:text-gray-500 transition-colors">Terms</Link>
        <span className="text-gray-800 text-[10px]">·</span>
        <Link to="/privacy" className="text-[10px] text-gray-700 hover:text-gray-500 transition-colors">Privacy</Link>
        <span className="text-gray-800 text-[10px]">·</span>
        <span className="text-[10px] text-gray-700">© {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}

function NewMenuItem({ icon, label, shortcut, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-gray-300
        hover:text-white hover:bg-white/[0.04] transition-colors">
      <span className="text-gray-500">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-[10px] font-mono text-gray-600">{shortcut}</span>
      )}
    </button>
  );
}