// src/dashboard/components/mobile/MobileSelectionBar.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOverview } from '../../../hooks/useOverview';
import {
  IconClose, IconFolderOpen, IconArchive, IconTrash,
  IconDotsVertical, IconExternal, IconLink, IconCode,
  IconStar, IconPin, IconShare, IconCheckCircle,
} from '../common/Icons';

function haptic(ms = 4) {
  try { navigator?.vibrate?.(ms); } catch {}
}

export default function MobileSelectionBar({
  selectedCount,
  onClose,
  onMove,
  onArchive,
  onDelete,
  onStar,
  onPin,
  onCopyLinks,
  onCopyMarkdown,
  onOpenLinks,
  onSelectAll,
  hasLinks,
  hasFolders,
  totalItems,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const { folders } = useOverview();

  useEffect(() => {
    document.body.style.overflow = (moreOpen || moveOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen, moveOpen]);

  return (
    <>
      <motion.div
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -64, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="fixed top-0 left-0 right-0 z-[60]"
        style={{ background: '#1a1d23', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
      >
        <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center h-14 px-1">
            <motion.button
              onClick={() => { haptic(); onClose(); }}
              whileTap={{ scale: 0.85 }}
              className="w-12 h-12 flex items-center justify-center rounded-full
                         active:bg-white/[0.08] transition-colors touch-manipulation"
              aria-label="Exit selection"
            >
              <IconClose className="w-5 h-5 text-white" />
            </motion.button>

            <div className="flex items-center gap-1 ml-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.span
                  key={selectedCount}
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="text-[18px] font-semibold text-white tabular-nums"
                >
                  {selectedCount}
                </motion.span>
              </AnimatePresence>
              <span className="text-[15px] text-gray-400 font-normal">selected</span>
            </div>

            <div className="flex-1" />

            <BarAction label="Move" onClick={() => { haptic(); setMoveOpen(true); }} disabled={!hasLinks}>
              <IconFolderOpen className="w-[22px] h-[22px]" />
            </BarAction>
            <BarAction label="Archive" onClick={() => { haptic(); onArchive?.(); }} disabled={!hasLinks}>
              <IconArchive className="w-[22px] h-[22px]" />
            </BarAction>
            <BarAction label="Delete" onClick={() => { haptic(); onDelete?.(); }}>
              <IconTrash className="w-[22px] h-[22px]" />
            </BarAction>
            <BarAction label="More" onClick={() => { haptic(); setMoreOpen(true); }}>
              <IconDotsVertical className="w-[22px] h-[22px]" strokeWidth={2} />
            </BarAction>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {moreOpen && (
          <MoreSheet
            hasLinks={hasLinks} hasFolders={hasFolders}
            selectedCount={selectedCount} totalItems={totalItems}
            onOpenLinks={() => { setMoreOpen(false); onOpenLinks?.(); }}
            onStar={() => { setMoreOpen(false); onStar?.(); }}
            onPin={() => { setMoreOpen(false); onPin?.(); }}
            onCopyLinks={() => { setMoreOpen(false); onCopyLinks?.(); }}
            onCopyMarkdown={() => { setMoreOpen(false); onCopyMarkdown?.(); }}
            onSelectAll={() => { setMoreOpen(false); onSelectAll?.(); }}
            onClose={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moveOpen && (
          <MoveSheet
            folders={folders || []}
            onMove={(folderId) => { setMoveOpen(false); onMove?.(folderId); }}
            onClose={() => setMoveOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function BarAction({ label, onClick, disabled = false, children }) {
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? {} : { scale: 0.85 }}
      className={`w-11 h-11 flex items-center justify-center rounded-full
        transition-colors touch-manipulation
        ${disabled ? 'text-gray-700 cursor-default' : 'text-gray-300 active:bg-white/[0.1]'}`}
      aria-label={label} aria-disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

function MoreSheet({
  hasLinks, selectedCount, totalItems,
  onOpenLinks, onStar, onPin, onCopyLinks, onCopyMarkdown, onSelectAll, onClose,
}) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[100] bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 400 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 300) onClose(); }}
        className="fixed bottom-0 left-0 right-0 z-[105] bg-[#1a1a1a] border-t border-white/[0.06]
                   rounded-t-2xl overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-[3px] rounded-full bg-white/[0.2]" />
        </div>
        <div className="px-3 pb-2">
          {hasLinks && (
            <SheetAction icon={<IconExternal className="w-[22px] h-[22px]" />}
              label="Open in new tab" onClick={() => { haptic(); onOpenLinks(); }} />
          )}

          {hasLinks && (
            <SheetAction icon={<IconLink className="w-[22px] h-[22px]" />}
              label="Copy URL" onClick={() => { haptic(); onCopyLinks(); }} />
          )}

          {hasLinks && (
            <SheetAction icon={<IconCode className="w-[22px] h-[22px]" />}
              label="Copy as Markdown" onClick={() => { haptic(); onCopyMarkdown(); }} />
          )}

          <div className="mx-4 my-1 border-t border-white/[0.06]" />

          {hasLinks && (
            <SheetAction icon={<IconStar className="w-[22px] h-[22px]" />}
              label="Star" onClick={() => { haptic(); onStar(); }} />
          )}

          <SheetAction icon={<IconPin className="w-[22px] h-[22px]" />}
            label="Pin" onClick={() => { haptic(); onPin(); }} />

          {hasLinks && (
            <SheetAction icon={<IconShare className="w-[22px] h-[22px]" />}
              label="Share" onClick={() => { haptic(); onCopyLinks(); }} />
          )}

          <div className="mx-4 my-1 border-t border-white/[0.06]" />

          <SheetAction icon={<IconCheckCircle className="w-[22px] h-[22px]" />}
            label={selectedCount === totalItems ? 'Deselect all' : 'Select all'}
            onClick={() => { haptic(); onSelectAll(); }} />
        </div>
      </motion.div>
    </>
  );
}

function MoveSheet({ folders, onMove, onClose }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[100] bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 400 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 300) onClose(); }}
        className="fixed bottom-0 left-0 right-0 z-[105] bg-[#1a1a1a] border-t border-white/[0.06]
                   rounded-t-2xl overflow-hidden max-h-[65vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-[3px] rounded-full bg-white/[0.2]" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <h3 className="text-[17px] font-semibold text-white">Move to</h3>
          <button onClick={onClose} className="text-[14px] text-gray-500 font-medium touch-manipulation">Cancel</button>
        </div>
        <div className="overflow-y-auto max-h-[45vh] overscroll-contain">
          <button onClick={() => { haptic(); onMove(null); }}
            className="w-full flex items-center gap-3.5 px-5 py-4 text-[15px] text-gray-300
                       active:bg-white/[0.04] transition-colors touch-manipulation border-b border-white/[0.03]">
            <div className="w-9 h-9 rounded-lg bg-gray-800/60 flex items-center justify-center flex-shrink-0">
              <IconFolderOpen className="w-5 h-5 text-gray-500" />
            </div>
            <span>My Files (root)</span>
          </button>
          {folders.map(f => (
            <button key={f.id} onClick={() => { haptic(); onMove(f.id); }}
              className="w-full flex items-center gap-3.5 px-5 py-4 text-[15px] text-gray-300
                         active:bg-white/[0.04] transition-colors touch-manipulation border-b border-white/[0.03]">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: `${f.color || '#6B7280'}15`, border: `1px solid ${f.color || '#6B7280'}30` }}>
                {f.emoji || f.icon || '📁'}
              </div>
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-[12px] text-gray-600 flex-shrink-0 tabular-nums">{f.link_count ?? 0}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

function SheetAction({ icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] text-gray-300
                 active:bg-white/[0.04] transition-colors touch-manipulation">
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </button>
  );
}