// src/dashboard/modals/FolderProperties/FolderPropertiesModal.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FoldersService from '../../../services/folders.service';
import {
  IconClose, IconPencil, IconCheck, IconTrash,
  IconFolder, IconCopy, IconChevronRight,
} from '../../components/common/Icons';
import toast from 'react-hot-toast';

function displayIcon(icon) {
  if (!icon) return '📁';
  return icon.length <= 2 ? icon : '📁';
}

function formatFullDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
}

function relativeDate(dateStr) {
  if (!dateStr) return '';
  try {
    const ms = Date.now() - new Date(dateStr).getTime();
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (sec < 60) return 'Just now';
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (day < 7) return `${day}d ago`;
    return formatShortDate(dateStr);
  } catch { return ''; }
}

const COLORS = [
  { value: '#6B7280', label: 'Gray' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F97316', label: 'Orange' },
  { value: '#84CC16', label: 'Lime' },
];

const ICONS = [
  '📁', '⚡', '🎨', '📈', '📚', '🔬', '💻', '🎵',
  '🎮', '📷', '✈️', '💰', '🛒', '📰', '🔧', '🏠',
  '🎯', '💡', '🔒', '🌟', '📱', '🎬', '🏆', '💼',
];

export default function FolderPropertiesModal({ isOpen, onClose, folder, onUpdate }) {
  const [tab, setTab] = useState('details');
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const nameRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isOpen && folder) {
      setName(folder.name || '');
      setColor(folder.color || '#6B7280');
      setIcon(folder.emoji || folder.icon || '📁');
      setEditing(null);
      setTab('details');
    }
  }, [isOpen, folder]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (editing === 'name' && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [tab]);

  const saveField = useCallback(async (field, value) => {
    if (!folder || saving) return;
    setSaving(true);
    try {
      const payload = {};
      if (field === 'name') payload.name = value;
      if (field === 'color') payload.color = value;
      if (field === 'icon') payload.icon = value;
      const result = await FoldersService.updateFolder(folder.id, payload);
      if (result.success) {
        toast.success('Updated');
        onUpdate?.();
        setEditing(null);
      } else {
        toast.error(result.error || 'Update failed');
      }
    } finally { setSaving(false); }
  }, [folder, saving, onUpdate]);

  const handleSaveName = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error('Name is required'); return; }
    if (trimmed === folder?.name) { setEditing(null); return; }
    saveField('name', trimmed);
  }, [name, folder, saveField]);

  const handleColorChange = useCallback((c) => {
    setColor(c);
    saveField('color', c);
  }, [saveField]);

  const handleIconChange = useCallback((i) => {
    setIcon(i);
    saveField('icon', i);
  }, [saveField]);

  const handleDelete = useCallback(async () => {
    if (!folder) return;
    if (!window.confirm(`Delete "${folder.name}"?\n\nLinks inside will be moved to root.`)) return;
    const result = await FoldersService.deleteFolder(folder.id);
    if (result.success) {
      toast.success('Folder deleted');
      onUpdate?.();
      onClose();
    } else {
      toast.error(result.error || 'Delete failed');
    }
  }, [folder, onUpdate, onClose]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/dashboard/myfiles/${folder.slug}`
      );
      toast.success('URL copied');
    } catch { toast.error('Copy failed'); }
  }, [folder]);

  if (!isOpen || !folder) return null;

  const currentColor = COLORS.find(c => c.value === color);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[300] flex justify-center bg-black/70 backdrop-blur-sm
            ${isMobile ? 'items-end' : 'items-center'}`}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 12 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 12 }}
            transition={isMobile
              ? { type: 'spring', damping: 28, stiffness: 340 }
              : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            className={`bg-[#111113] shadow-2xl flex flex-col overflow-hidden
              ${isMobile
                ? 'w-full rounded-t-2xl border-t border-white/[0.08]'
                : 'w-full max-w-[460px] rounded-2xl mx-4 border border-white/[0.06]'}`}
            style={{ maxHeight: isMobile ? '90vh' : '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div className="flex justify-center pt-2 pb-0.5 flex-shrink-0">
                <div className="w-9 h-1 rounded-full bg-white/[0.15]" />
              </div>
            )}

            <Header
              folder={folder}
              icon={displayIcon(icon)}
              color={color}
              onClose={onClose}
              isMobile={isMobile}
            />

            <Tabs tab={tab} setTab={setTab} isMobile={isMobile} />

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain min-h-0"
            >
              <AnimatePresence mode="wait">
                {tab === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <DetailsTab
                      folder={folder}
                      name={name}
                      color={color}
                      editing={editing}
                      setEditing={setEditing}
                      setName={setName}
                      onSaveName={handleSaveName}
                      currentColor={currentColor}
                      nameRef={nameRef}
                      onCopyUrl={handleCopyUrl}
                      isMobile={isMobile}
                    />
                  </motion.div>
                )}

                {tab === 'customize' && (
                  <motion.div
                    key="customize"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CustomizeTab
                      icon={icon}
                      color={color}
                      name={name}
                      folder={folder}
                      onIconChange={handleIconChange}
                      onColorChange={handleColorChange}
                      isMobile={isMobile}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Footer onDelete={handleDelete} isMobile={isMobile} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Header({ folder, icon, color, onClose, isMobile }) {
  return (
    <div className="flex-shrink-0">
      <div className={`flex items-center gap-3.5 ${isMobile ? 'px-5 pt-3 pb-3' : 'px-6 pt-5 pb-4'}`}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${color}18`, border: `1px solid ${color}25` }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`font-semibold text-white truncate
            ${isMobile ? 'text-[17px]' : 'text-[16px]'}`}>
            {folder.name}
          </h2>
          <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1.5">
            <IconFolder className="w-3 h-3 flex-shrink-0" />
            <span>{folder.link_count ?? 0} items</span>
            <span className="text-gray-700">·</span>
            <span>{relativeDate(folder.updated_at)}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 rounded-full transition-colors
            ${isMobile
              ? 'w-8 h-8 flex items-center justify-center bg-white/[0.06] active:bg-white/[0.1]'
              : 'p-2 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'}`}
        >
          <IconClose className={isMobile ? 'w-4 h-4 text-gray-400' : 'w-4 h-4'} />
        </button>
      </div>
    </div>
  );
}

function Tabs({ tab, setTab, isMobile }) {
  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'customize', label: 'Customize' },
  ];

  return (
    <div className={`flex-shrink-0 border-b border-white/[0.06] ${isMobile ? 'px-5' : 'px-6'}`}>
      <div className="flex gap-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              relative transition-colors touch-manipulation
              ${isMobile ? 'px-4 py-3 text-[14px]' : 'px-4 py-2.5 text-[13px]'}
              ${tab === t.id
                ? 'text-white font-semibold'
                : 'text-gray-500 hover:text-gray-300 active:text-gray-300 font-medium'}
            `}
          >
            {t.label}
            {tab === t.id && (
              <motion.div
                layoutId="propsTabIndicator"
                className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailsTab({
  folder, name, editing, setEditing, setName, onSaveName,
  currentColor, nameRef, onCopyUrl, isMobile,
}) {
  return (
    <div className={isMobile ? 'px-5 py-4' : 'px-6 py-5'}>
      <SectionLabel>General</SectionLabel>

      <PropertyRow label="Name" isMobile={isMobile} onEdit={() => setEditing('name')} editable>
        {editing === 'name' ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={onSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveName();
                if (e.key === 'Escape') setEditing(null);
              }}
              className={`flex-1 min-w-0 bg-transparent text-white outline-none
                border-b-2 border-primary/50 pb-0.5 caret-primary
                ${isMobile ? 'text-[15px]' : 'text-[13px]'}`}
            />
            <button
              onClick={onSaveName}
              className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 hover:bg-primary/30"
            >
              <IconCheck className="w-3 h-3 text-primary" strokeWidth={3} />
            </button>
          </div>
        ) : (
          <span className={`text-gray-200 truncate ${isMobile ? 'text-[15px]' : 'text-[13px]'}`}>
            {folder.name}
          </span>
        )}
      </PropertyRow>

      <PropertyRow label="Type" isMobile={isMobile}>
        <div className="flex items-center gap-1.5">
          <IconFolder className="w-3.5 h-3.5 text-gray-500" />
          <span className={`text-gray-300 ${isMobile ? 'text-[15px]' : 'text-[13px]'}`}>Folder</span>
        </div>
      </PropertyRow>

      <PropertyRow label="Location" isMobile={isMobile}>
        <span className={`text-gray-300 ${isMobile ? 'text-[15px]' : 'text-[13px]'}`}>
          {folder.parent_id ? 'Subfolder' : 'My Files'}
        </span>
      </PropertyRow>

      <PropertyRow label="Color" isMobile={isMobile}>
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/[0.15]"
            style={{ backgroundColor: currentColor?.value || '#6B7280' }}
          />
          <span className={`text-gray-300 ${isMobile ? 'text-[15px]' : 'text-[13px]'}`}>
            {currentColor?.label || 'Gray'}
          </span>
        </div>
      </PropertyRow>

      <div className="h-5" />
      <SectionLabel>Stats</SectionLabel>

      <PropertyRow label="Items" isMobile={isMobile}>
        <span className={`text-gray-200 font-medium tabular-nums ${isMobile ? 'text-[15px]' : 'text-[13px]'}`}>
          {folder.link_count ?? 0}
          <span className="text-gray-600 font-normal ml-1.5">links</span>
        </span>
      </PropertyRow>

      <PropertyRow label="Pinned" isMobile={isMobile}>
        <StatusPill active={folder.pinned} label={folder.pinned ? 'Yes' : 'No'} />
      </PropertyRow>

      {folder.starred !== undefined && (
        <PropertyRow label="Starred" isMobile={isMobile}>
          <StatusPill active={folder.starred} label={folder.starred ? 'Yes' : 'No'} color="amber" />
        </PropertyRow>
      )}

      <div className="h-5" />
      <SectionLabel>Activity</SectionLabel>

      <PropertyRow label="Created" isMobile={isMobile}>
        <span
          className={`text-gray-400 tabular-nums ${isMobile ? 'text-[14px]' : 'text-[12px]'}`}
          title={formatFullDate(folder.created_at)}
        >
          {formatShortDate(folder.created_at)}
        </span>
      </PropertyRow>

      <PropertyRow label="Modified" isMobile={isMobile}>
        <span
          className={`text-gray-400 tabular-nums ${isMobile ? 'text-[14px]' : 'text-[12px]'}`}
          title={formatFullDate(folder.updated_at)}
        >
          {formatShortDate(folder.updated_at)}
        </span>
      </PropertyRow>

      <PropertyRow label="ID" isMobile={isMobile}>
        <span className={`text-gray-600 font-mono ${isMobile ? 'text-[13px]' : 'text-[11px]'}`}>
          #{folder.id}
        </span>
      </PropertyRow>

      {folder.children && folder.children.length > 0 && (
        <>
          <div className="h-5" />
          <SectionLabel>Subfolders ({folder.children.length})</SectionLabel>
          <div className="mt-2 space-y-1.5">
            {folder.children.map(child => (
              <SubfolderRow key={child.id} folder={child} isMobile={isMobile} />
            ))}
          </div>
        </>
      )}

      <div className="mt-5">
        <button
          onClick={onCopyUrl}
          className={`
            w-full flex items-center justify-center gap-2 rounded-xl
            border border-white/[0.06] bg-white/[0.02] transition-colors font-medium
            touch-manipulation text-gray-400
            ${isMobile ? 'py-3 text-[14px] active:bg-white/[0.06]' : 'py-2.5 text-[13px] hover:bg-white/[0.05]'}
          `}
        >
          <IconCopy className="w-4 h-4" />
          Copy folder URL
        </button>
      </div>

      <div className="h-4" />
    </div>
  );
}

function CustomizeTab({ icon, color, name, folder, onIconChange, onColorChange, isMobile }) {
  return (
    <div className={isMobile ? 'px-4 py-4' : 'px-6 py-5'}>
      <div className="flex flex-col items-center py-3">
        <motion.div
          layout
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{ backgroundColor: `${color}18`, border: `1px solid ${color}25` }}
        >
          {displayIcon(icon)}
        </motion.div>
        <p className={`text-center font-medium text-white mt-2.5 ${isMobile ? 'text-[16px]' : 'text-[14px]'}`}>
          {name || 'Untitled'}
        </p>
        <p className={`text-center text-gray-500 mt-0.5 ${isMobile ? 'text-[13px]' : 'text-[12px]'}`}>
          {folder.link_count ?? 0} items
        </p>
      </div>

      <div className="h-4" />
      <SectionLabel>Icon</SectionLabel>
      <div className="mt-2 mb-5">
        <div
          className="grid gap-[6px]"
          style={{
            gridTemplateColumns: isMobile
              ? 'repeat(auto-fill, minmax(40px, 1fr))'
              : 'repeat(8, 1fr)',
          }}
        >
          {ICONS.map(i => {
            const active = icon === i;
            return (
              <motion.button
                key={i}
                onClick={() => onIconChange(i)}
                whileTap={{ scale: 0.88 }}
                className={`
                  relative flex items-center justify-center rounded-xl
                  touch-manipulation overflow-hidden isolate
                  ${isMobile ? 'h-11 text-[18px]' : 'h-10 text-base'}
                  ${active
                    ? 'bg-primary/20 ring-2 ring-primary/60'
                    : 'bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.08]'}
                `}
              >
                <span className="relative z-10">{i}</span>
                {active && (
                  <motion.div
                    layoutId="activeIcon"
                    className="absolute inset-0 bg-primary/15 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <SectionLabel>Color</SectionLabel>
      <div className="mt-2">
        <div
          className="grid gap-[6px]"
          style={{
            gridTemplateColumns: isMobile
              ? 'repeat(auto-fill, minmax(90px, 1fr))'
              : 'repeat(5, 1fr)',
          }}
        >
          {COLORS.map(c => {
            const active = color === c.value;
            return (
              <motion.button
                key={c.value}
                onClick={() => onColorChange(c.value)}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex items-center gap-2 rounded-xl touch-manipulation
                  overflow-hidden
                  ${isMobile ? 'px-3 py-3' : 'px-2.5 py-2'}
                  ${active
                    ? 'bg-white/[0.07] ring-1 ring-white/[0.15]'
                    : 'bg-white/[0.02] active:bg-white/[0.06]'}
                `}
              >
                <div className="relative w-5 h-5 flex-shrink-0">
                  <div
                    className="w-5 h-5 rounded-full border border-white/[0.12]"
                    style={{ backgroundColor: c.value }}
                  />
                  {active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <IconCheck className="w-3 h-3 text-white drop-shadow-md" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>
                <span
                  className={`truncate leading-none
                    ${isMobile ? 'text-[13px]' : 'text-[11px]'}
                    ${active ? 'text-white font-medium' : 'text-gray-500'}`}
                >
                  {c.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className={isMobile ? 'h-6' : 'h-4'} />
    </div>
  );
}

function Footer({ onDelete, isMobile }) {
  return (
    <div
      className={`flex-shrink-0 border-t border-white/[0.06]
        ${isMobile ? 'px-5 py-3' : 'px-6 py-3'}`}
      style={isMobile ? { paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' } : undefined}
    >
      <button
        onClick={onDelete}
        className={`
          w-full flex items-center justify-center gap-2 rounded-xl
          transition-colors touch-manipulation font-medium
          ${isMobile
            ? 'py-3 text-[14px] text-red-400/80 active:bg-red-500/[0.08]'
            : 'py-2.5 text-[13px] text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06]'}
        `}
      >
        <IconTrash className={isMobile ? 'w-[18px] h-[18px]' : 'w-4 h-4'} />
        Delete folder
      </button>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 select-none">
      {children}
    </p>
  );
}

function PropertyRow({ label, children, editable, onEdit, isMobile }) {
  return (
    <div
      onClick={editable ? onEdit : undefined}
      className={`
        flex items-center justify-between gap-4 rounded-lg transition-colors group
        ${isMobile ? 'py-3 -mx-2 px-2 min-h-[48px]' : 'py-2.5 -mx-1.5 px-1.5'}
        ${editable
          ? `cursor-pointer ${isMobile ? 'active:bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`
          : ''}
      `}
    >
      <span className={`text-gray-500 flex-shrink-0
        ${isMobile ? 'text-[14px] min-w-[90px]' : 'text-[12px] min-w-[80px]'}`}>
        {label}
      </span>
      <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
        {children}
        {editable && (
          <IconPencil className={`
            flex-shrink-0 text-gray-700
            ${isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity'}
          `} />
        )}
      </div>
    </div>
  );
}

function StatusPill({ active, label, color = 'blue' }) {
  const styles = active
    ? color === 'amber'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : 'bg-primary/10 text-primary border-primary/20'
    : 'bg-white/[0.03] text-gray-600 border-white/[0.06]';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${styles}`}>
      {label}
    </span>
  );
}

function SubfolderRow({ folder, isMobile }) {
  const color = folder.color || '#6B7280';
  return (
    <div className={`
      flex items-center gap-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]
      ${isMobile ? 'px-3 py-2.5' : 'px-3 py-2'}
    `}>
      <div
        className={`rounded-lg flex items-center justify-center flex-shrink-0
          ${isMobile ? 'w-8 h-8 text-sm' : 'w-7 h-7 text-xs'}`}
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
      >
        {displayIcon(folder.icon)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-gray-300 truncate ${isMobile ? 'text-[14px]' : 'text-[13px]'}`}>
          {folder.name}
        </p>
      </div>
      <span className={`text-gray-600 tabular-nums flex-shrink-0
        ${isMobile ? 'text-[12px]' : 'text-[11px]'}`}>
        {folder.link_count ?? 0}
      </span>
      <IconChevronRight className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
    </div>
  );
}