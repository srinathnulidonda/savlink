// src/dashboard/components/links/LinkActions.jsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconDots, IconExternal, IconCopy, IconCode,
  IconStar, IconPin, IconArchive, IconCheckCircle, IconTrash,
} from '../common/Icons';
import {
  copyBestUrl, copyMarkdown, openInNewTab,
  starLabel, pinLabel, archiveLabel,
} from './linkHelpers';

export default function LinkActions({
  link, onPin, onStar, onArchive, onDelete, onSelect,
  align = 'right', className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const act = (fn) => (e) => { e.stopPropagation(); fn?.(); setOpen(false); };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`p-1.5 rounded-md transition-colors
          ${open ? 'bg-white/[0.06] text-gray-300' : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'}`}
        aria-label="More actions" aria-expanded={open}
      >
        <IconDots className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
              className={`absolute top-full mt-1 w-52 rounded-lg border border-gray-800/60
                bg-[#111] shadow-2xl shadow-black/60 z-40 overflow-hidden py-1
                ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
              <ActionItem
                icon={<IconExternal className="w-4 h-4" />}
                onClick={(e) => { e.stopPropagation(); openInNewTab(link); setOpen(false); }}
                shortcut="↵"
              >
                Open in new tab
              </ActionItem>
              <ActionItem
                icon={<IconCopy className="w-4 h-4" />}
                onClick={(e) => { e.stopPropagation(); copyBestUrl(link); setOpen(false); }}
                shortcut="⌘C"
              >
                Copy URL
              </ActionItem>
              <ActionItem
                icon={<IconCode className="w-4 h-4" />}
                onClick={(e) => { e.stopPropagation(); copyMarkdown(link); setOpen(false); }}
              >
                Copy as Markdown
              </ActionItem>

              <Divider />

              <ActionItem
                icon={<IconStar className="w-4 h-4" filled={link.starred} />}
                onClick={act(onStar)} shortcut="S" active={link.starred}
              >
                {starLabel(link)}
              </ActionItem>
              <ActionItem
                icon={<IconPin className="w-4 h-4" filled={link.pinned} />}
                onClick={act(onPin)} shortcut="P" active={link.pinned}
              >
                {pinLabel(link)}
              </ActionItem>
              <ActionItem
                icon={<IconArchive className="w-4 h-4" />}
                onClick={act(onArchive)} shortcut="E"
              >
                {archiveLabel(link)}
              </ActionItem>

              {onSelect && (
                <ActionItem
                  icon={<IconCheckCircle className="w-4 h-4" />}
                  onClick={act(onSelect)} shortcut="X"
                >
                  Select
                </ActionItem>
              )}

              <Divider />

              <ActionItem
                icon={<IconTrash className="w-4 h-4" />}
                onClick={act(onDelete)} shortcut="⌫" danger
              >
                Delete
              </ActionItem>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Divider() {
  return <div className="my-1 mx-2.5 border-t border-gray-800/40" />;
}

function ActionItem({ icon, onClick, shortcut, danger = false, active = false, children }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-[7px] text-[13px] transition-colors
        ${danger ? 'text-red-400 hover:bg-red-500/[0.08]'
          : active ? 'text-amber-400 hover:bg-white/[0.04]'
            : 'text-gray-300 hover:text-white hover:bg-white/[0.04]'}`}>
      <span className="flex items-center gap-2.5 min-w-0 truncate">
        {icon && (
          <span className={`flex-shrink-0 ${danger ? 'text-red-400' : active ? 'text-amber-400' : 'text-gray-500'}`}>
            {icon}
          </span>
        )}
        {children}
      </span>
      {shortcut && <kbd className="text-[10px] font-mono text-gray-600 ml-3 flex-shrink-0">{shortcut}</kbd>}
    </button>
  );
}