// src/dashboard/modals/FolderProperties/FolderPropertiesModal.jsx

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FoldersService from '../../../services/folders.service';
import toast from 'react-hot-toast';

function displayIcon(icon) {
  if (!icon) return '📁';
  if (icon.length <= 2) return icon;
  return '📁';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
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
    if (day < 30) return `${day}d ago`;
    return formatDate(dateStr);
  } catch {
    return '';
  }
}

const COLORS = [
  { value: '#6B7280', label: 'Gray' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F97316', label: 'Orange' },
  { value: '#84CC16', label: 'Lime' },
];

const ICONS = ['📁', '⚡', '🎨', '📈', '📚', '🔬', '💻', '🎵', '🎮', '📷', '✈️', '💰', '🛒', '📰', '🔧', '🏠'];

export default function FolderPropertiesModal({ isOpen, onClose, folder, onUpdate }) {
  const [tab, setTab] = useState('info');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      setEditing(false);
      setTab('info');
    }
  }, [isOpen, folder]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSave = useCallback(async () => {
    if (!folder || saving) return;
    const trimmed = name.trim();
    if (!trimmed) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const result = await FoldersService.updateFolder(folder.id, {
        name: trimmed,
        color,
        icon,
      });
      if (result.success) {
        toast.success('Folder updated');
        onUpdate?.();
        setEditing(false);
      } else {
        toast.error(result.error || 'Update failed');
      }
    } finally {
      setSaving(false);
    }
  }, [folder, name, color, icon, saving, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!folder) return;
    if (!window.confirm(`Delete "${folder.name}"? Links inside will be unassigned.`)) return;
    const result = await FoldersService.deleteFolder(folder.id);
    if (result.success) {
      toast.success('Folder deleted');
      onUpdate?.();
      onClose();
    } else {
      toast.error(result.error || 'Delete failed');
    }
  }, [folder, onUpdate, onClose]);

  if (!isOpen || !folder) return null;

  const hasChanges = name.trim() !== (folder.name || '') || color !== (folder.color || '#6B7280') || icon !== (folder.emoji || folder.icon || '📁');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[200] flex justify-center bg-black/80 backdrop-blur-sm ${isMobile ? 'items-end' : 'items-center'}`}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={isMobile ? { type: 'spring', damping: 30, stiffness: 350 } : { duration: 0.2 }}
            className={`bg-[#111] shadow-2xl overflow-hidden flex flex-col border-t border-gray-800/60
              ${isMobile ? 'w-screen rounded-t-2xl max-h-[85vh]' : 'w-full max-w-[440px] rounded-xl mx-4 max-h-[80vh]'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div className="flex justify-center pt-2 pb-0.5 flex-shrink-0">
                <div className="w-8 h-1 rounded-full bg-gray-700" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/40 flex-shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                {displayIcon(icon)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-white truncate">{folder.name}</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {folder.link_count ?? 0} links · {relativeDate(folder.updated_at)}
                </p>
              </div>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/[0.05]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800/40 px-5 flex-shrink-0">
              {[
                { id: 'info', label: 'Info' },
                { id: 'edit', label: 'Edit' },
              ].map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'edit') setEditing(true); }}
                  className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors
                    ${tab === t.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {t.label}
                  {tab === t.id && (
                    <motion.div layoutId="propTab" className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }} />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {tab === 'info' && (
                <div className="p-5 space-y-4">
                  <InfoRow label="Name" value={folder.name} />
                  <InfoRow label="Icon" value={displayIcon(folder.emoji || folder.icon)} />
                  <InfoRow label="Color">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: folder.color || '#6B7280' }} />
                      <span className="text-[13px] text-gray-300">{folder.color || '#6B7280'}</span>
                    </div>
                  </InfoRow>
                  <InfoRow label="Links" value={`${folder.link_count ?? 0} links`} />
                  <InfoRow label="Pinned" value={folder.pinned ? 'Yes' : 'No'} />
                  {folder.parent_id && <InfoRow label="Parent ID" value={`#${folder.parent_id}`} />}

                  <div className="pt-2 border-t border-gray-800/40">
                    <InfoRow label="Created" value={formatDate(folder.created_at)} />
                    <InfoRow label="Modified" value={formatDate(folder.updated_at)} />
                    <InfoRow label="ID" value={`#${folder.id}`} mono />
                  </div>

                  {folder.children && folder.children.length > 0 && (
                    <div className="pt-2 border-t border-gray-800/40">
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Subfolders</p>
                      <div className="space-y-1">
                        {folder.children.map(child => (
                          <div key={child.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/30 border border-gray-800/30">
                            <span className="text-sm">{displayIcon(child.icon)}</span>
                            <span className="text-[13px] text-gray-300 flex-1 truncate">{child.name}</span>
                            <span className="text-[11px] text-gray-600 tabular-nums">{child.link_count ?? 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'edit' && (
                <div className="p-5 space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-[12px] font-medium text-gray-400 mb-2">Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full h-10 px-3 text-[14px] text-white bg-gray-900/50 border border-gray-800 rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder-gray-600" />
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="block text-[12px] font-medium text-gray-400 mb-2">Icon</label>
                    <div className="grid grid-cols-8 gap-1.5">
                      {ICONS.map(i => (
                        <button key={i} type="button" onClick={() => setIcon(i)}
                          className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                            ${icon === i ? 'bg-primary/20 ring-2 ring-primary/50 scale-110' : 'bg-gray-900/50 border border-gray-800/50 hover:bg-gray-800/50 hover:scale-105'}`}>
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-[12px] font-medium text-gray-400 mb-2">Color</label>
                    <div className="grid grid-cols-5 gap-2">
                      {COLORS.map(c => (
                        <button key={c.value} type="button" onClick={() => setColor(c.value)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-left
                            ${color === c.value ? 'bg-white/[0.06] ring-1 ring-white/20' : 'hover:bg-white/[0.03]'}`}>
                          <div className="w-4 h-4 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: c.value }} />
                          <span className="text-[11px] text-gray-400 truncate">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-[12px] font-medium text-gray-400 mb-2">Preview</label>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900/30 border border-gray-800/40">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                        {displayIcon(icon)}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-white">{name.trim() || 'Untitled'}</p>
                        <p className="text-[11px] text-gray-500">{folder.link_count ?? 0} links</p>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-3 border-t border-gray-800/40">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Danger zone</p>
                    <button onClick={handleDelete}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-red-400 bg-red-500/[0.06] hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete folder
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer — only on edit tab with changes */}
            {tab === 'edit' && hasChanges && (
              <div className="flex-shrink-0 border-t border-gray-800/40 px-5 py-3 flex items-center justify-end gap-2">
                <button onClick={() => { setName(folder.name || ''); setColor(folder.color || '#6B7280'); setIcon(folder.emoji || folder.icon || '📁'); }}
                  className="px-4 py-2 text-[13px] font-medium text-gray-400 hover:text-gray-200 rounded-lg">
                  Reset
                </button>
                <button onClick={handleSave} disabled={saving || !name.trim()}
                  className="px-5 py-2 text-[13px] font-medium text-white bg-primary hover:bg-primary-light disabled:opacity-50 rounded-lg flex items-center gap-2">
                  {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, value, mono, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-[12px] text-gray-500 flex-shrink-0 min-w-[80px]">{label}</span>
      {children || (
        <span className={`text-[13px] text-gray-300 text-right truncate ${mono ? 'font-mono text-gray-500' : ''}`}>
          {value || '—'}
        </span>
      )}
    </div>
  );
}