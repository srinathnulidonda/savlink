// src/dashboard/modals/AddLink/AddLinkModal.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddLink } from './useAddLink';
import { useOverview } from '../../../hooks/useOverview';

export default function AddLinkModal({ isOpen, onClose, onSubmit }) {
  const { addLink, loading, error, clearError } = useAddLink();
  const { folders, tags } = useOverview();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [linkType, setLinkType] = useState('saved');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [folderId, setFolderId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [urlMeta, setUrlMeta] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const urlInputRef = useRef(null);
  const lastFetchedUrl = useRef('');
  const initRef = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isOpen && !initRef.current) {
      initRef.current = true;
      setUrl(''); setTitle(''); setNotes(''); setLinkType('saved');
      setSelectedTags([]); setTagInput(''); setFolderId(null);
      setShowAdvanced(false); setUrlMeta(null);
      lastFetchedUrl.current = '';
      clearError();
      if (!isMobile) setTimeout(() => urlInputRef.current?.focus(), 300);
    }
    if (!isOpen) initRef.current = false;
  }, [isOpen, isMobile, clearError]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && url.trim()) { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, url]);

  useEffect(() => {
    if (!isOpen || !url.trim()) { setUrlMeta(null); return; }
    const trimmed = url.trim();
    if (lastFetchedUrl.current === trimmed) return;
    const t = setTimeout(() => {
      try {
        const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
        const domain = u.hostname.replace('www.', '');
        lastFetchedUrl.current = trimmed;
        setUrlMeta({ domain, favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32` });
        if (!title.trim()) setTitle(domain);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [url, isOpen]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http') || text.includes('.'))) {
        setUrl(text.startsWith('http') ? text : `https://${text}`);
        clearError();
      }
    } catch {}
  }, [clearError]);

  const addTag = useCallback((tag) => {
    const t = tag.trim().toLowerCase();
    if (t && selectedTags.length < 5 && !selectedTags.includes(t)) {
      setSelectedTags(prev => [...prev, t]);
    }
    setTagInput('');
  }, [selectedTags]);

  const handleTagKeyDown = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) { e.preventDefault(); addTag(tagInput); }
    else if (e.key === 'Backspace' && !tagInput) setSelectedTags(prev => prev.slice(0, -1));
  }, [tagInput, addTag]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    const formatted = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

    const tagIds = (tags || [])
      .filter(t => selectedTags.includes(t.name?.toLowerCase()))
      .map(t => t.id);

    const result = await addLink({
      original_url: formatted,
      title: title.trim() || urlMeta?.domain || '',
      notes: notes.trim(),
      link_type: linkType,
      folder_id: folderId,
      tag_ids: tagIds,
    });

    if (result.success) { onSubmit?.(); onClose(); }
  }, [url, title, notes, linkType, folderId, selectedTags, tags, loading, addLink, onSubmit, onClose, urlMeta]);

  if (!isOpen) return null;

  const existingTagNames = (tags || []).map(t => t.name?.toLowerCase()).filter(Boolean);
  const tagSuggestions = tagInput
    ? existingTagNames.filter(t => !selectedTags.includes(t) && t.includes(tagInput.toLowerCase())).slice(0, 5)
    : [];

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
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            className={`bg-[#111] shadow-2xl overflow-hidden flex flex-col border-t border-gray-800/60
              ${isMobile ? 'w-screen rounded-t-2xl max-h-[92vh]' : 'w-full max-w-[520px] rounded-xl mx-4 max-h-[85vh]'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && <div className="flex justify-center pt-2 pb-0.5"><div className="w-8 h-1 rounded-full bg-gray-700" /></div>}

            <div className={`flex items-center justify-between border-b border-gray-800/40 ${isMobile ? 'px-4 py-3' : 'px-5 py-4'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">{linkType === 'shortened' ? 'Shorten Link' : 'Save Link'}</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">{linkType === 'shortened' ? 'Create a short URL' : 'Save to your collection'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/[0.05]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto overscroll-contain ${isMobile ? 'p-4' : 'p-5'}`}>
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex gap-1 p-1 bg-gray-900/50 rounded-xl mb-4">
                  {['saved', 'shortened'].map(type => (
                    <button key={type} type="button" onClick={() => setLinkType(type)}
                      className={`flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all ${linkType === type ? 'bg-white/[0.1] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                      {type === 'saved' ? '💾 Save' : '🔗 Shorten'}
                    </button>
                  ))}
                </div>

                <Fld label="URL">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {urlMeta?.favicon
                        ? <img src={urlMeta.favicon} alt="" className="w-4 h-4 rounded" onError={e => { e.target.style.display = 'none'; }} />
                        : <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="9" /><path d="M12 3c2.5 0 4.5 4 4.5 9s-2 9-4.5 9m0-18c-2.5 0-4.5 4-4.5 9s2 9 4.5 9M3.3 8.3h17.4M3.3 15.7h17.4" /></svg>
                      }
                    </div>
                    <input ref={urlInputRef} type="text" value={url}
                      onChange={e => { setUrl(e.target.value); clearError(); }}
                      placeholder="https://example.com"
                      className={`w-full h-11 pl-11 pr-16 text-[14px] text-white bg-gray-900/50 rounded-xl outline-none transition-all placeholder-gray-600
                        ${error ? 'border border-red-500/50 focus:border-red-500' : 'border border-gray-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20'}`}
                    />
                    <button type="button" onClick={handlePaste}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 text-[11px] text-gray-500 hover:text-gray-300 bg-gray-800/60 hover:bg-gray-800 rounded-lg">Paste</button>
                  </div>
                  {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
                  {urlMeta && !error && <p className="mt-1.5 text-[11px] text-emerald-500">✓ {urlMeta.domain}</p>}
                </Fld>

                <Fld label="Title" optional>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter a title"
                    className="w-full h-11 px-3 text-[14px] text-white bg-gray-900/50 border border-gray-800 rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder-gray-600" />
                </Fld>

                <Fld label="Folder" optional>
                  <select value={folderId || ''} onChange={e => setFolderId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-11 px-3 text-[14px] text-white bg-gray-900/50 border border-gray-800 rounded-xl outline-none focus:border-primary/50 appearance-none">
                    <option value="">No folder</option>
                    {(folders || []).map(f => <option key={f.id} value={f.id}>{f.emoji || '📁'} {f.name}</option>)}
                  </select>
                </Fld>

                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-300 mb-4">
                  <motion.svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    animate={{ rotate: showAdvanced ? 90 : 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></motion.svg>
                  More options
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pb-4">
                      <Fld label="Notes">
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..." rows={3}
                          className="w-full px-3 py-2.5 text-[14px] text-white bg-gray-900/50 border border-gray-800 rounded-xl outline-none focus:border-primary/50 resize-none placeholder-gray-600" />
                      </Fld>
                      <Fld label="Tags" hint="max 5">
                        <div className="flex flex-wrap items-center gap-1.5 p-3 min-h-[44px] bg-gray-900/50 border border-gray-800 rounded-xl focus-within:border-primary/50">
                          {selectedTags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] text-gray-300 bg-gray-800 border border-gray-700/50 rounded-md">
                              {tag}
                              <button type="button" onClick={() => setSelectedTags(p => p.filter(t => t !== tag))} className="text-gray-500 hover:text-gray-300 p-0.5">×</button>
                            </span>
                          ))}
                          {selectedTags.length < 5 && (
                            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                              onKeyDown={handleTagKeyDown} placeholder={selectedTags.length === 0 ? 'Add tags...' : ''}
                              className="flex-1 min-w-[80px] bg-transparent text-[13px] text-white placeholder-gray-600 outline-none" />
                          )}
                        </div>
                        {tagSuggestions.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {tagSuggestions.map(s => (
                              <button key={s} type="button" onClick={() => addTag(s)}
                                className="px-2 py-0.5 text-[11px] text-gray-400 bg-gray-800/60 hover:bg-gray-800 rounded-md">
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </Fld>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>

            <div className={`flex-shrink-0 border-t border-gray-800/40 ${isMobile ? 'px-4 pt-3 pb-1' : 'p-5'}`}
              style={isMobile ? { paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' } : undefined}>
              {!isMobile ? (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-600">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-700/50 rounded">⌘</kbd>{' + '}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-700/50 rounded">↵</kbd>
                    <span className="ml-1">to save</span>
                  </p>
                  <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-gray-400 hover:text-gray-200 rounded-lg">Cancel</button>
                    <button onClick={handleSubmit} disabled={!url.trim() || loading}
                      className="px-5 py-2 text-[13px] font-medium text-white bg-primary hover:bg-primary-light disabled:opacity-50 rounded-lg flex items-center gap-2">
                      {loading ? <><Spinner /> Saving...</> : linkType === 'shortened' ? 'Create Short Link' : 'Save Link'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={handleSubmit} disabled={!url.trim() || loading}
                    className="w-full py-3 text-[14px] font-semibold text-white bg-primary hover:bg-primary-light disabled:opacity-50 rounded-xl flex items-center justify-center gap-2">
                    {loading ? <><Spinner /> Saving...</> : linkType === 'shortened' ? 'Create Short Link' : 'Save Link'}
                  </button>
                  <button onClick={onClose} className="w-full py-2.5 text-[13px] font-medium text-gray-400 rounded-xl">Cancel</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Fld({ label, optional, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-medium text-gray-400 mb-2">
        {label} {optional && <span className="text-gray-600 font-normal">(optional)</span>}
        {hint && <span className="text-gray-600 font-normal ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function Spinner() {
  return <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}