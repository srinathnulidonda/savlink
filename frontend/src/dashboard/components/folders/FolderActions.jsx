// src/dashboard/components/folders/FolderActions.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconDotsVertical, IconFolderOpen, IconExternal, IconCopy,
  IconPin, IconPencil, IconInfo, IconCheckCircle, IconTrash,
} from '../common/Icons';
import toast from 'react-hot-toast';

function displayIcon(icon) {
  if (!icon) return '📁';
  return icon.length <= 2 ? icon : '📁';
}

export default function FolderActions({
  folder, onOpen, onRename, onTogglePin, onDelete, onProperties, onSelect,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const mw = 208;
    const mh = 380;
    let t = rect.bottom + 4;
    let l = rect.right - mw;
    if (t + mh > window.innerHeight - 12) t = Math.max(12, rect.top - mh - 4);
    if (l < 12) l = rect.left;
    if (l + mw > window.innerWidth - 12) l = window.innerWidth - mw - 12;
    setPos({ top: t, left: l });
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler, true);
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', handler, true);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    const handler = () => setOpen(false);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, isMobile]);

  const close = useCallback(() => setOpen(false), []);

  const run = useCallback((fn) => {
    setOpen(false);
    if (isMobile) setTimeout(() => fn?.(), 220);
    else setTimeout(() => fn?.(), 10);
  }, [isMobile]);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(prev => !prev);
  }, []);

  const handleCopyUrl = useCallback(() => {
    run(async () => {
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}/dashboard/myfiles/${folder.slug}`
        );
        toast.success('URL copied');
      } catch { toast.error('Copy failed'); }
    });
  }, [folder.slug, run]);

  const handleDelete = useCallback(() => {
    run(() => {
      if (window.confirm(`Delete "${folder.name}"? Links inside will be unassigned.`)) {
        onDelete?.();
      }
    });
  }, [folder.name, onDelete, run]);

  const ic = isMobile ? 'w-[22px] h-[22px]' : 'w-4 h-4';

  const items = [
    { id: 'open', icon: <IconFolderOpen className={ic} />, label: 'Open', sc: '↵', handler: () => run(onOpen) },
    { id: 'open-tab', icon: <IconExternal className={ic} />, label: 'Open in new tab', handler: () => run(() => window.open(`/dashboard/myfiles/${folder.slug}`, '_blank')) },
    { type: 'divider' },
    { id: 'pin', icon: <IconPin className={ic} filled={folder.pinned} />, label: folder.pinned ? 'Unpin' : 'Pin', sc: 'P', active: folder.pinned, handler: () => run(onTogglePin) },
    { type: 'divider' },
    { id: 'rename', icon: <IconPencil className={ic} />, label: 'Rename', sc: 'F2', handler: () => run(onRename) },
    { id: 'props', icon: <IconInfo className={ic} />, label: 'Properties', sc: '⌘I', handler: () => run(onProperties) },
    { type: 'divider' },
    { id: 'copy', icon: <IconCopy className={ic} />, label: 'Copy URL', sc: '⌘C', handler: handleCopyUrl },
    ...(onSelect ? [
      { type: 'divider' },
      { id: 'select', icon: <IconCheckCircle className={ic} />, label: 'Select', sc: 'X', handler: () => run(onSelect) },
    ] : []),
    { type: 'divider' },
    { id: 'delete', icon: <IconTrash className={ic} />, label: 'Delete', sc: '⌫', danger: true, handler: handleDelete },
  ];

  const renderItems = () =>
    items.map((item, i) => {
      if (item.type === 'divider') return <Divider key={`d${i}`} mobile={isMobile} />;
      return (
        <ActionItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          shortcut={!isMobile ? item.sc : null}
          danger={item.danger}
          active={item.active}
          onClick={item.handler}
          mobile={isMobile}
        />
      );
    });

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={`p-1.5 rounded-md transition-colors touch-manipulation
          ${open ? 'bg-white/[0.08] text-gray-300' : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'}`}
        aria-label="Folder actions"
        aria-expanded={open}
      >
        <IconDotsVertical className="w-4 h-4" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            isMobile ? (
              <MobileSheet
                key="mobile-sheet"
                folder={folder}
                onClose={close}
                renderItems={renderItems}
              />
            ) : (
              <DesktopMenu
                key="desktop-menu"
                pos={pos}
                menuRef={menuRef}
                renderItems={renderItems}
              />
            )
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function MobileSheet({ folder, onClose, renderItems }) {
  const color = folder.color || '#6B7280';
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200] bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 300) onClose();
        }}
        className="fixed bottom-0 left-0 right-0 z-[201] bg-[#1c1c1e]
                   border-t border-white/[0.08] rounded-t-2xl overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', maxHeight: '80vh' }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-[3px] rounded-full bg-white/[0.2]" />
        </div>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
          >
            {displayIcon(folder.emoji || folder.icon)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-white truncate">{folder.name}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">{folder.link_count ?? 0} items</p>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain py-1" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {renderItems()}
        </div>
      </motion.div>
    </>
  );
}

function DesktopMenu({ pos, menuRef, renderItems }) {
  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.12 }}
      className="fixed w-52 rounded-lg border border-gray-800/60
                 bg-[#111] shadow-2xl shadow-black/60 z-[200] overflow-hidden py-1"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {renderItems()}
    </motion.div>
  );
}

function Divider({ mobile }) {
  return <div className={`border-t border-white/[0.06] ${mobile ? 'my-1 mx-5' : 'my-1 mx-2.5'}`} />;
}

function ActionItem({ icon, label, shortcut, danger = false, active = false, onClick, mobile = false }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={`
        w-full flex items-center justify-between transition-colors touch-manipulation
        ${mobile ? 'px-5 py-3 text-[15px]' : 'px-3 py-[7px] text-[13px]'}
        ${danger
          ? 'text-red-400 hover:bg-red-500/[0.08] active:bg-red-500/[0.08]'
          : active
            ? 'text-primary hover:bg-white/[0.04] active:bg-white/[0.04]'
            : 'text-gray-300 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.06]'}
      `}
    >
      <span className={`flex items-center min-w-0 ${mobile ? 'gap-3.5' : 'gap-2.5'}`}>
        {icon && (
          <span className={`flex-shrink-0
            ${danger ? 'text-red-400' : active ? 'text-primary' : 'text-gray-500'}`}>
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </span>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-gray-600 ml-3 flex-shrink-0">{shortcut}</kbd>
      )}
    </button>
  );
}