// src/dashboard/modals/CreateFolder/CreateFolderModal.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FoldersService from '../../../services/folders.service';
import toast from 'react-hot-toast';

const COLORS = [
  '#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16',
];

const ICONS = [
  '📁', '⚡', '🎨', '📈', '📚', '🔬', '💻', '🎵',
  '🎮', '📷', '✈️', '💰', '🛒', '📰', '🔧', '🏠',
];

export default function CreateFolderModal({ isOpen, onClose, onCreated, parentId = null }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('📁');
  const [showCustomize, setShowCustomize] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setColor('#3B82F6');
      setIcon('📁');
      setShowCustomize(false);
      setSaving(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      const result = await FoldersService.createFolder({
        name: trimmed,
        color,
        icon,
        parent_id: parentId,
      });
      if (result.success) {
        toast.success(`Folder "${trimmed}" created`);
        onCreated?.(result.data);
        onClose();
      } else {
        toast.error(result.error || 'Failed to create folder');
      }
    } finally {
      setSaving(false);
    }
  }, [name, color, icon, parentId, saving, onCreated, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[200] flex justify-center bg-black/80 backdrop-blur-sm
            ${isMobile ? 'items-end' : 'items-center'}`}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={isMobile
              ? { type: 'spring', damping: 30, stiffness: 350 }
              : { duration: 0.2 }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            className={`bg-[#111] shadow-2xl overflow-hidden flex flex-col border-t border-gray-800/60
              ${isMobile
                ? 'w-screen rounded-t-2xl max-h-[80vh]'
                : 'w-full max-w-[400px] rounded-xl mx-4'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div className="flex justify-center pt-2 pb-0.5">
                <div className="w-8 h-1 rounded-full bg-gray-700" />
              </div>
            )}

            <div className={`flex items-center justify-between border-b border-gray-800/40
              ${isMobile ? 'px-4 py-3' : 'px-5 py-4'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  {icon}
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">New Folder</h2>
                  {parentId && (
                    <p className="text-[11px] text-gray-500 mt-0.5">Creating subfolder</p>
                  )}
                </div>
              </div>
              <button onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/[0.05]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className={isMobile ? 'p-4' : 'p-5'}>
              <label className="block text-[12px] font-medium text-gray-400 mb-2">
                Folder name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Untitled folder"
                maxLength={255}
                className="w-full h-11 px-3 text-[14px] text-white bg-gray-900/50
                  border border-gray-800 rounded-xl outline-none
                  focus:border-primary/50 focus:ring-2 focus:ring-primary/20
                  placeholder-gray-600"
                autoFocus={!isMobile}
              />

              <button
                type="button"
                onClick={() => setShowCustomize(!showCustomize)}
                className="flex items-center gap-1.5 text-[12px] text-gray-500
                  hover:text-gray-300 mt-3 mb-1"
              >
                <motion.svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}
                  animate={{ rotate: showCustomize ? 90 : 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </motion.svg>
                Customize
              </button>

              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-4">
                      <div>
                        <label className="block text-[12px] font-medium text-gray-400 mb-2">Icon</label>
                        <div className="grid grid-cols-8 gap-1.5">
                          {ICONS.map((i) => (
                            <button key={i} type="button" onClick={() => setIcon(i)}
                              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                                ${icon === i
                                  ? 'bg-primary/20 ring-2 ring-primary/50 scale-110'
                                  : 'bg-gray-900/50 border border-gray-800/50 hover:bg-gray-800/50 hover:scale-105'}`}>
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-gray-400 mb-2">Color</label>
                        <div className="flex gap-2">
                          {COLORS.map((c) => (
                            <button key={c} type="button" onClick={() => setColor(c)}
                              className={`w-7 h-7 rounded-full border-2 transition-all
                                ${color === c
                                  ? 'border-white scale-110'
                                  : 'border-transparent hover:border-white/30 hover:scale-105'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900/30 border border-gray-800/40">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                          {icon}
                        </div>
                        <span className="text-[13px] font-medium text-white">
                          {name.trim() || 'Untitled folder'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <div className={`flex-shrink-0 border-t border-gray-800/40
              ${isMobile ? 'px-4 pt-3 pb-1' : 'px-5 py-4'}`}
              style={isMobile ? { paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' } : undefined}>
              {isMobile ? (
                <div className="space-y-2">
                  <button onClick={handleSubmit} disabled={!name.trim() || saving}
                    className="w-full py-3 text-[14px] font-semibold text-white bg-primary
                      hover:bg-primary-light disabled:opacity-50 rounded-xl flex items-center justify-center gap-2">
                    {saving
                      ? <><Spinner /> Creating...</>
                      : 'Create Folder'}
                  </button>
                  <button onClick={onClose}
                    className="w-full py-2.5 text-[13px] font-medium text-gray-400 rounded-xl">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={onClose}
                    className="px-4 py-2 text-[13px] font-medium text-gray-400
                      hover:text-gray-200 rounded-lg">
                    Cancel
                  </button>
                  <button onClick={handleSubmit} disabled={!name.trim() || saving}
                    className="px-5 py-2 text-[13px] font-medium text-white bg-primary
                      hover:bg-primary-light disabled:opacity-50 rounded-lg flex items-center gap-2">
                    {saving ? <><Spinner /> Creating...</> : 'Create'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Spinner() {
  return <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}