// src/dashboard/pages/collections/CollectionHeader.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import FoldersService from '../../../services/folders.service';
import toast from 'react-hot-toast';

function displayIcon(icon) {
  if (!icon) return '📁';
  if (icon.length <= 2) return icon;
  return '📁';
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

export default function CollectionHeader({
  folder, breadcrumb = [], stats, onRefresh,
  onAddLink, onCreateFolder, searchQuery, onSearch, isMobile,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef(null);
  const renameRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  const startRename = useCallback(() => {
    setRenameValue(folder.name || '');
    setRenaming(true);
    setMenuOpen(false);
  }, [folder]);

  const saveRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === folder.name) { setRenaming(false); return; }
    const result = await FoldersService.updateFolder(folder.id, { name: trimmed });
    if (result.success) { toast.success('Renamed'); onRefresh?.(); }
    else toast.error(result.error || 'Rename failed');
    setRenaming(false);
  }, [renameValue, folder, onRefresh]);

  const handleDelete = useCallback(async () => {
    setMenuOpen(false);
    if (!window.confirm(`Delete "${folder.name}"? Links will be unassigned.`)) return;
    const result = await FoldersService.deleteFolder(folder.id);
    if (result.success) {
      toast.success('Folder deleted');
      navigate('/dashboard/my-files');
      onRefresh?.();
    } else toast.error(result.error || 'Delete failed');
  }, [folder, navigate, onRefresh]);

  const handleTogglePin = useCallback(async () => {
    setMenuOpen(false);
    const result = await FoldersService.togglePin(folder.id);
    if (result.success) { toast.success(folder.pinned ? 'Unpinned' : 'Pinned'); onRefresh?.(); }
  }, [folder, onRefresh]);

  if (!folder) return null;

  const color = folder.color || '#6B7280';

  return (
    <div className="flex-shrink-0 border-b border-white/[0.05]">
      <div className={`${isMobile ? 'px-4 pt-4 pb-3' : 'px-6 pt-5 pb-4'}`}>
        <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mb-3">
          <button onClick={() => navigate('/dashboard/home')}
            className="hover:text-gray-400 transition-colors">Home</button>
          <ChevronRight />
          <button onClick={() => navigate('/dashboard/my-files')}
            className="hover:text-gray-400 transition-colors">Collections</button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <ChevronRight />
              {i < breadcrumb.length - 1 ? (
                <button onClick={() => navigate(`/dashboard/collections/${crumb.id}`)}
                  className="hover:text-gray-400 transition-colors">{crumb.name}</button>
              ) : (
                <span className="text-gray-400 font-medium">{crumb.name}</span>
              )}
            </span>
          ))}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
              {displayIcon(folder.icon)}
            </div>
            <div className="min-w-0">
              {renaming ? (
                <input ref={renameRef} type="text" value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
                  className="text-lg font-semibold text-white bg-transparent outline-none border-b-2 border-primary/40 pb-0.5 w-full max-w-[300px]" />
              ) : (
                <h1 className="text-lg font-semibold text-white truncate cursor-text hover:text-gray-200 transition-colors"
                  onDoubleClick={startRename}>
                  {folder.name}
                </h1>
              )}
              <div className="flex items-center gap-2 mt-0.5 text-[12px] text-gray-500">
                <span>{stats?.link_count ?? 0} links</span>
                {stats?.subfolder_count > 0 && (
                  <><span className="text-gray-700">·</span><span>{stats.subfolder_count} folders</span></>
                )}
                {stats?.total_clicks > 0 && (
                  <><span className="text-gray-700">·</span><span>{stats.total_clicks.toLocaleString()} clicks</span></>
                )}
                {folder.created_at && (
                  <><span className="text-gray-700">·</span><span>Created {formatDate(folder.created_at)}</span></>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <motion.button whileTap={{ scale: 0.95 }} onClick={onAddLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-primary hover:bg-primary-light rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Link</span>
            </motion.button>

            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 rounded-lg transition-colors ${menuOpen ? 'bg-white/[0.06] text-gray-300' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-gray-800/60 bg-[#111] shadow-2xl z-40 overflow-hidden py-1">
                      <MenuItem onClick={() => { setMenuOpen(false); onCreateFolder?.(folder.id); }}>New subfolder</MenuItem>
                      <MenuItem onClick={startRename}>Rename</MenuItem>
                      <MenuItem onClick={handleTogglePin}>{folder.pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}</MenuItem>
                      <div className="my-1 mx-2.5 border-t border-gray-800/40" />
                      <MenuItem onClick={async () => {
                        setMenuOpen(false);
                        const url = `${window.location.origin}/dashboard/collections/${folder.id}`;
                        try { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
                        catch { toast.error('Copy failed'); }
                      }}>Copy link</MenuItem>
                      <div className="my-1 mx-2.5 border-t border-gray-800/40" />
                      <MenuItem onClick={handleDelete} danger>Delete folder</MenuItem>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {!isMobile && (
          <div className="mt-4 relative max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={(e) => onSearch(e.target.value)}
              placeholder="Search in folder…"
              className="w-full h-9 pl-9 pr-3 text-[13px] text-white bg-gray-900/40 border border-gray-800/50 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder-gray-600" />
            {searchQuery && (
              <button onClick={() => onSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ onClick, danger = false, children }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-[7px] text-[13px] transition-colors
        ${danger ? 'text-red-400 hover:bg-red-500/[0.08]' : 'text-gray-300 hover:text-white hover:bg-white/[0.04]'}`}>
      {children}
    </button>
  );
}

function ChevronRight() {
  return (
    <svg className="w-3 h-3 text-gray-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}