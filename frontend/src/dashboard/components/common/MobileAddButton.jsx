// src/dashboard/components/common/MobileAddButton.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BOTTOM_NAV_HEIGHT } from './MobileBottomNav';

const ACTIONS = [
  {
    id: 'add-link',
    label: 'Save Link',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    actionKey: 'onAddLink',
  },
  {
    id: 'create-folder',
    label: 'New Folder',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
    actionKey: 'onCreateFolder',
  },
  {
    id: 'import',
    label: 'Import',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    actionKey: 'onImportLinks',
  },
];

export default function MobileAddButton({
  onAddLink, onCreateFolder, onImportLinks,
  bottomOffset = BOTTOM_NAV_HEIGHT,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleAction = useCallback((action) => {
    const handlers = { onAddLink, onCreateFolder, onImportLinks };
    handlers[action.actionKey]?.();
    setIsOpen(false);
  }, [onAddLink, onCreateFolder, onImportLinks]);

  if (!isMobile) return null;

  const fabBottom = `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px) + 14px)`;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] bg-black/50"
            onClick={() => setIsOpen(false)} />
        )}
      </AnimatePresence>

      <div className="fixed right-4 z-[90] flex flex-col items-end" style={{ bottom: fabBottom }}>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mb-3 flex flex-col gap-2 items-end">
              {ACTIONS.map((action, idx) => (
                <motion.button key={action.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: (ACTIONS.length - 1 - idx) * 0.04, duration: 0.18 } }}
                  exit={{ opacity: 0, y: 6, transition: { duration: 0.1, delay: idx * 0.02 } }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-2.5 h-10 pl-4 pr-3 bg-[#1c1c1e] border border-white/[0.08]
                    rounded-full shadow-lg shadow-black/30 active:bg-[#2c2c2e] transition-colors">
                  <span className="text-[13px] font-medium text-white whitespace-nowrap">{action.label}</span>
                  <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-white">
                    {action.icon}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button onClick={() => setIsOpen((p) => !p)} whileTap={{ scale: 0.9 }}
          className="h-11 w-11 rounded-full flex items-center justify-center bg-[#0A2A8F]
            shadow-lg shadow-black/25 outline-none touch-manipulation active:bg-[#081f6b] transition-colors"
          aria-label={isOpen ? 'Close' : 'Create new'}>
          <motion.svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </motion.svg>
        </motion.button>
      </div>
    </>
  );
}