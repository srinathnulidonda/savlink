// src/dashboard/pages/collections/CollectionHeader.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import FoldersService from '../../../services/folders.service';
import {
  IconChevronLeft, IconChevronRight, IconSearch, IconClose,
  IconDotsVertical, IconFolderPlus, IconPencil, IconPin,
  IconLink, IconInfo, IconTrash,
} from '../../components/common/Icons';
import toast from 'react-hot-toast';

function displayIcon(icon) {
  if (!icon) return '📁';
  if (icon.length <= 2) return icon;
  return '📁';
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

export default function CollectionHeader({
  folder, breadcrumb = [], stats, onRefresh,
  onCreateFolder, searchQuery, onSearch, isMobile,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef(null);
  const renameRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming && renameRef.current) { renameRef.current.focus(); renameRef.current.select(); }
  }, [renaming]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [searchOpen]);

  const startRename = useCallback(() => {
    setRenameValue(folder.name || '');
    setRenaming(true);
    setMenuOpen(false);
  }, [folder]);

  const saveRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === folder.name) { setRenaming(false); return; }
    const result = await FoldersService.updateFolder(folder.id, { name: trimmed });
    if (result.success) {
      toast.success('Renamed');
      if (result.data?.slug) navigate(`/dashboard/myfiles/${result.data.slug}`, { replace: true });
      onRefresh?.();
    } else toast.error(result.error || 'Rename failed');
    setRenaming(false);
  }, [renameValue, folder, onRefresh, navigate]);

  const handleDelete = useCallback(async () => {
    setMenuOpen(false);
    if (!window.confirm(`Delete "${folder.name}"? Links will be unassigned.`)) return;
    const result = await FoldersService.deleteFolder(folder.id);
    if (result.success) { toast.success('Folder deleted'); navigate('/dashboard/myfiles'); onRefresh?.(); }
    else toast.error(result.error || 'Delete failed');
  }, [folder, navigate, onRefresh]);

  const handleTogglePin = useCallback(async () => {
    setMenuOpen(false);
    const result = await FoldersService.togglePin(folder.id);
    if (result.success) { toast.success(folder.pinned ? 'Unpinned' : 'Pinned'); onRefresh?.(); }
  }, [folder, onRefresh]);

  const handleCopyUrl = useCallback(async () => {
    setMenuOpen(false);
    const url = `${window.location.origin}/dashboard/myfiles/${folder.slug}`;
    try { await navigator.clipboard.writeText(url); toast.success('URL copied'); }
    catch { toast.error('Copy failed'); }
  }, [folder]);

  if (!folder) return null;

  const color = folder.color || '#6B7280';
  const parentPath = breadcrumb.length > 1
    ? `/dashboard/myfiles/${breadcrumb[breadcrumb.length - 2].slug}`
    : '/dashboard/myfiles';

  if (isMobile) {
    return (
      <>
        <div className="flex-shrink-0 bg-[#0a0a0a] border-b border-white/[0.04]"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center h-14 px-1">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(parentPath)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 active:bg-white/[0.06] transition-colors touch-manipulation flex-shrink-0"
              aria-label="Go back">
              <IconChevronLeft className="w-5 h-5" />
            </motion.button>

            <div className="flex-1 min-w-0 px-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  {displayIcon(folder.icon)}
                </div>
                <h1 className="text-[16px] font-semibold text-white truncate">{folder.name}</h1>
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSearchOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 active:bg-white/[0.06] transition-colors touch-manipulation flex-shrink-0"
              aria-label="Search">
              <IconSearch className="w-5 h-5" />
            </motion.button>

            <div ref={menuRef} className="relative flex-shrink-0">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMenuOpen(!menuOpen)}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors touch-manipulation
                  ${menuOpen ? 'bg-white/[0.06] text-gray-300' : 'text-gray-400 active:bg-white/[0.06]'}`}
                aria-label="More options">
                <IconDotsVertical className="w-5 h-5" />
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-800/60 bg-[#1c1c1e]
                                 shadow-[0_8px_40px_rgba(0,0,0,0.5)] z-40 overflow-hidden py-1"
                    >
                      <div className="px-4 py-3 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                            {displayIcon(folder.icon)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-white truncate">{folder.name}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {stats?.link_count ?? 0} links
                              {stats?.subfolder_count > 0 && ` · ${stats.subfolder_count} folders`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <MobileMenuItem icon={<IconFolderPlus className="w-5 h-5" />}
                          onClick={() => { setMenuOpen(false); onCreateFolder?.(folder.id); }}>
                          New subfolder
                        </MobileMenuItem>
                        <MobileMenuItem icon={<IconPencil className="w-5 h-5" />} onClick={startRename}>
                          Rename
                        </MobileMenuItem>
                        <MobileMenuItem icon={<IconPin className="w-5 h-5" filled={folder.pinned} />} onClick={handleTogglePin}>
                          {folder.pinned ? 'Unpin' : 'Pin'}
                        </MobileMenuItem>
                      </div>

                      <div className="mx-3 border-t border-white/[0.06]" />

                      <div className="py-1">
                        <MobileMenuItem icon={<IconLink className="w-5 h-5" />} onClick={handleCopyUrl}>
                          Copy URL
                        </MobileMenuItem>
                        <MobileMenuItem icon={<IconInfo className="w-5 h-5" />}
                          onClick={() => { setMenuOpen(false); toast(`Created ${formatDate(folder.created_at)}`, { icon: '📁' }); }}>
                          Properties
                        </MobileMenuItem>
                      </div>

                      <div className="mx-3 border-t border-white/[0.06]" />

                      <div className="py-1">
                        <MobileMenuItem icon={<IconTrash className="w-5 h-5" />} onClick={handleDelete} danger>
                          Delete folder
                        </MobileMenuItem>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {searchQuery && !searchOpen && (
            <div className="px-4 pb-2">
              <button onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-primary bg-primary/[0.08] border border-primary/20 rounded-full">
                <IconSearch className="w-3 h-3" />
                <span className="truncate max-w-[150px]">"{searchQuery}"</span>
                <span onClick={(e) => { e.stopPropagation(); onSearch?.(''); }}>
                  <IconClose className="w-3 h-3 ml-0.5" />
                </span>
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {searchOpen && (
            <MobileSearchOverlay value={searchQuery} onChange={onSearch}
              onClose={() => setSearchOpen(false)} inputRef={searchInputRef} folderName={folder.name} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {renaming && (
            <MobileRenameOverlay value={renameValue} onChange={setRenameValue}
              onSave={saveRename} onClose={() => setRenaming(false)} inputRef={renameRef} />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="flex-shrink-0 border-b border-white/[0.05]">
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mb-3">
          <button onClick={() => navigate('/dashboard/myfiles')} className="hover:text-gray-400 transition-colors">My Files</button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <IconChevronRight className="w-3 h-3 text-gray-700 flex-shrink-0" />
              {i < breadcrumb.length - 1 ? (
                <button onClick={() => navigate(`/dashboard/myfiles/${crumb.slug}`)} className="hover:text-gray-400 transition-colors">{crumb.name}</button>
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
              <h1 className="text-lg font-semibold text-white truncate">{folder.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 text-[12px] text-gray-500">
                <span>{stats?.link_count ?? 0} links</span>
                {stats?.subfolder_count > 0 && (<><span className="text-gray-700">·</span><span>{stats.subfolder_count} folders</span></>)}
                {stats?.total_clicks > 0 && (<><span className="text-gray-700">·</span><span>{stats.total_clicks.toLocaleString()} clicks</span></>)}
              </div>
            </div>
          </div>

          <div ref={menuRef} className="relative flex-shrink-0">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className={`p-2 rounded-lg transition-colors
                ${menuOpen ? 'bg-white/[0.06] text-gray-300' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}>
              <IconDotsVertical className="w-4 h-4" strokeWidth={2} />
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
                    className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-gray-800/60 bg-[#111] shadow-2xl z-40 overflow-hidden py-1"
                  >
                    <MenuItem onClick={() => { setMenuOpen(false); onCreateFolder?.(folder.id); }}>New subfolder</MenuItem>
                    <MenuItem onClick={startRename}>Rename</MenuItem>
                    <MenuItem onClick={handleTogglePin}>{folder.pinned ? 'Unpin' : 'Pin'}</MenuItem>
                    <div className="my-1 mx-2.5 border-t border-gray-800/40" />
                    <MenuItem onClick={handleCopyUrl}>Copy URL</MenuItem>
                    <div className="my-1 mx-2.5 border-t border-gray-800/40" />
                    <MenuItem onClick={handleDelete} danger>Delete folder</MenuItem>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSearchOverlay({ value, onChange, onClose, inputRef, folderName }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-2 px-2 h-14 border-b border-white/[0.06]">
        <button onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 active:bg-white/[0.06] touch-manipulation">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input ref={inputRef} type="text" value={value} onChange={(e) => onChange?.(e.target.value)}
            placeholder={`Search in ${folderName}...`} autoFocus
            className="w-full h-10 pl-10 pr-10 text-[15px] text-white bg-gray-900/50
                       border border-gray-800 rounded-xl outline-none
                       focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder-gray-600" />
          {value && (
            <button onClick={() => onChange?.('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 active:text-gray-300 touch-manipulation">
              <IconClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {value && (
        <div className="px-4 py-6 text-center">
          <p className="text-[13px] text-gray-500">Searching for "{value}" in {folderName}</p>
        </div>
      )}
    </motion.div>
  );
}

function MobileRenameOverlay({ value, onChange, onSave, onClose, inputRef }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#1c1c1e] rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-[17px] font-semibold text-white mb-4">Rename folder</h3>
          <input ref={inputRef} type="text" value={value} onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onClose(); }}
            autoFocus
            className="w-full h-11 px-4 text-[15px] text-white bg-black/40 border border-gray-700 rounded-xl outline-none
                       focus:border-primary/50 focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex border-t border-white/[0.06]">
          <button onClick={onClose}
            className="flex-1 py-3.5 text-[15px] font-medium text-gray-400 active:bg-white/[0.04] transition-colors touch-manipulation">
            Cancel
          </button>
          <div className="w-px bg-white/[0.06]" />
          <button onClick={onSave}
            className="flex-1 py-3.5 text-[15px] font-semibold text-primary active:bg-white/[0.04] transition-colors touch-manipulation">
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
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

function MobileMenuItem({ icon, onClick, danger = false, children }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-[15px] transition-colors touch-manipulation
        ${danger ? 'text-red-400 active:bg-red-500/[0.08]' : 'text-gray-300 active:bg-white/[0.04]'}`}>
      <span className={danger ? 'text-red-400' : 'text-gray-500'}>{icon}</span>
      <span>{children}</span>
    </button>
  );
}