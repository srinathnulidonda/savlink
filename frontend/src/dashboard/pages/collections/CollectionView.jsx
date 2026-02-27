// src/dashboard/pages/collections/CollectionView.jsx
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ContextMenuProvider } from '../../components/common/ContextMenu';
import { useCollection } from './useCollection';
import CollectionHeader from './CollectionHeader';
import CollectionEmpty from './CollectionEmpty';
import LinkCard from '../../components/links/LinkCard';
import LinkDetails from '../../components/links/LinkDetails';
import LinksToolbar from '../../components/links/LinksToolbar';
import LinkSkeleton from '../../components/links/LinkSkeleton';
import { resolveDomain, resolveFavicon, formatUrl, timeAgo } from '../../components/links/LinkMeta';
import toast from 'react-hot-toast';

function displayIcon(icon) {
  if (!icon) return '📁';
  if (icon.length <= 2) return icon;
  return '📁';
}

export default function CollectionView({ viewMode = 'grid', onAddLink, onCreateFolder }) {
  const navigate = useNavigate();
  const {
    folderId, folder, children, breadcrumb, stats,
    links, meta, loading, linksLoading, error,
    searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder,
    loadMore, refresh, updateLink, deleteLink, pinLink, starLink, archiveLink,
  } = useCollection();

  const [selectedLink, setSelectedLink] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [hoveredId, setHoveredId] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { setSelectedLink(null); setSelectedIds(new Set()); setFocusedIndex(-1); }, [folderId]);

  const isSelectMode = selectedIds.size > 0;

  const toggleSelect = useCallback((id, e) => {
    e?.stopPropagation?.();
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const toggleSelectById = useCallback((id) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === links.length ? new Set() : new Set(links.map(l => l.id)));
  }, [links]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const bulkDelete = useCallback(async () => {
    if (!window.confirm(`Delete ${selectedIds.size} links?`)) return;
    for (const id of selectedIds) await deleteLink(id);
    clearSelection();
  }, [selectedIds, deleteLink, clearSelection]);

  const bulkArchive = useCallback(async () => {
    for (const id of selectedIds) await archiveLink(id);
    clearSelection();
  }, [selectedIds, archiveLink, clearSelection]);

  const openDetails = useCallback((link) => {
    if (isSelectMode) return;
    setSelectedLink(prev => prev?.id === link.id ? null : link);
  }, [isSelectMode]);

  const closeDetails = useCallback(() => setSelectedLink(null), []);

  useEffect(() => {
    if (isMobile) return;
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowDown': case 'j': e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, links.length - 1)); break;
        case 'ArrowUp': case 'k': e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); break;
        case 'Enter': if (focusedIndex >= 0) openDetails(links[focusedIndex]); break;
        case 'x': if (focusedIndex >= 0) toggleSelectById(links[focusedIndex].id); break;
        case 'Escape': if (selectedIds.size > 0) clearSelection(); else if (selectedLink) closeDetails(); break;
        case 'a': if (e.metaKey || e.ctrlKey) { e.preventDefault(); selectAll(); } break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobile, focusedIndex, links, selectedIds, selectedLink, openDetails, toggleSelectById, clearSelection, selectAll, closeDetails]);

  useEffect(() => {
    if (isMobile && selectedLink) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, selectedLink]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-[15px] font-medium text-white mb-1">Folder not found</h3>
        <p className="text-[13px] text-gray-500 mb-4">{error}</p>
        <button onClick={() => navigate('/dashboard/my-files')}
          className="text-[13px] text-primary hover:text-primary-light font-medium">
          ← Back to My Files
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-1.5"><div className="h-3 w-16 bg-white/[0.04] rounded animate-pulse" /><div className="h-3 w-3 bg-white/[0.04] rounded animate-pulse" /><div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" /></div>
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-white/[0.04] animate-pulse" /><div className="space-y-2"><div className="h-5 w-40 bg-white/[0.04] rounded animate-pulse" /><div className="h-3 w-28 bg-white/[0.04] rounded animate-pulse" /></div></div>
        </div>
        <LinkSkeleton viewMode={viewMode} />
      </div>
    );
  }

  return (
    <ContextMenuProvider>
      <div className="flex h-full">
        <div className="flex-1 min-w-0 flex flex-col">
          <CollectionHeader
            folder={folder}
            breadcrumb={breadcrumb}
            stats={stats}
            onRefresh={refresh}
            onAddLink={onAddLink}
            onCreateFolder={onCreateFolder}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            isMobile={isMobile}
          />

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children.length > 0 && (
              <div className={`${isMobile ? 'px-4 pt-4' : 'px-6 pt-5'}`}>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                  Folders
                </h3>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mb-4">
                  {children.map(child => (
                    <button key={child.id}
                      onClick={() => navigate(`/dashboard/collections/${child.id}`)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all group text-left">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: `${child.color || '#6B7280'}15`, border: `1px solid ${child.color || '#6B7280'}30` }}>
                        {displayIcon(child.icon)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-gray-300 truncate group-hover:text-white transition-colors">{child.name}</p>
                        <p className="text-[11px] text-gray-600">{child.link_count ?? 0} links</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/[0.04] mb-1" />
              </div>
            )}

            {links.length === 0 && !linksLoading ? (
              <CollectionEmpty
                folderName={folder?.name || 'This folder'}
                onAddLink={onAddLink}
                searchQuery={searchQuery}
              />
            ) : (
              <>
                <LinksToolbar
                  totalCount={meta.total ?? links.length}
                  selectedCount={selectedIds.size}
                  isSelectMode={isSelectMode}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
                  onSelectAll={selectAll}
                  onClearSelection={clearSelection}
                  onBulkDelete={bulkDelete}
                  onBulkArchive={bulkArchive}
                  searchQuery={searchQuery}
                />
                <div className={`${isMobile ? 'p-2.5 pt-2' : 'p-4 pt-3 lg:p-6 lg:pt-3'}`}>
                  <div className={viewMode === 'grid'
                    ? 'grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'space-y-0.5'}
                    role="listbox" aria-label="Links">
                    <AnimatePresence mode="popLayout">
                      {links.map((link, index) => (
                        <LinkCard
                          key={link.id}
                          link={link}
                          index={index}
                          viewMode={viewMode}
                          isSelected={selectedIds.has(link.id)}
                          isActive={selectedLink?.id === link.id}
                          isFocused={focusedIndex === index}
                          isSelectMode={isSelectMode}
                          onHover={setHoveredId}
                          onClick={() => openDetails(link)}
                          onSelect={(e) => toggleSelect(link.id, e)}
                          onSelectById={toggleSelectById}
                          onPin={() => pinLink(link.id)}
                          onStar={() => starLink(link.id)}
                          onArchive={() => archiveLink(link.id)}
                          onDelete={() => deleteLink(link.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {meta.has_more && (
                    <div className="flex justify-center py-6">
                      <button onClick={loadMore} disabled={linksLoading}
                        className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50">
                        {linksLoading ? (
                          <><div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" /> Loading…</>
                        ) : 'Load more'}
                      </button>
                    </div>
                  )}

                  <div className="h-6" />
                </div>
              </>
            )}

            {linksLoading && links.length === 0 && (
              <div className={`${isMobile ? 'p-2.5' : 'p-6'}`}>
                <LinkSkeleton viewMode={viewMode} />
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {selectedLink && !isMobile && (
            <LinkDetails
              link={selectedLink}
              onClose={closeDetails}
              onUpdate={updateLink}
              onDelete={(id) => { deleteLink(id); closeDetails(); }}
              onPin={() => pinLink(selectedLink.id)}
              onStar={() => starLink(selectedLink.id)}
              onArchive={() => archiveLink(selectedLink.id)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedLink && isMobile && (
            <MobileSheet
              link={selectedLink}
              onClose={closeDetails}
              onPin={() => pinLink(selectedLink.id)}
              onStar={() => starLink(selectedLink.id)}
              onArchive={() => { archiveLink(selectedLink.id); closeDetails(); }}
              onDelete={() => { deleteLink(selectedLink.id); closeDetails(); }}
            />
          )}
        </AnimatePresence>
      </div>
    </ContextMenuProvider>
  );
}

function MobileSheet({ link, onClose, onPin, onStar, onArchive, onDelete }) {
  const domain = resolveDomain(link);
  const favicon = resolveFavicon(link, 64);
  const [faviconErr, setFaviconErr] = useState(false);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 380 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 300) onClose(); }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-white/[0.08] rounded-t-2xl overflow-hidden max-h-[75vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full bg-white/[0.15]" /></div>
        <div className="px-5 pt-2 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {favicon && !faviconErr
                ? <img src={favicon} alt="" className="w-6 h-6" onError={() => setFaviconErr(true)} />
                : <span className="text-sm font-bold text-gray-500 uppercase">{domain?.[0] || '?'}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-white leading-snug line-clamp-2">{link.title || 'Untitled'}</h2>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{formatUrl(link.original_url)}</p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <SheetBtn onClick={() => window.open(link.original_url, '_blank', 'noopener')} primary>Open link</SheetBtn>
            <SheetBtn onClick={async () => { try { await navigator.clipboard.writeText(link.original_url); toast.success('Copied'); } catch {} }}>Copy URL</SheetBtn>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <SheetBtn onClick={onStar} active={link.starred}>{link.starred ? '★ Unstar' : '☆ Star'}</SheetBtn>
            <SheetBtn onClick={onPin} active={link.pinned}>{link.pinned ? 'Unpin' : 'Pin'}</SheetBtn>
          </div>
          <SheetBtn onClick={onArchive}>{link.archived ? 'Restore' : 'Archive'}</SheetBtn>
          <button onClick={() => { if (window.confirm('Delete this link?')) onDelete?.(); }}
            className="w-full py-2.5 text-[12px] font-medium text-gray-600 hover:text-red-400 rounded-xl transition-colors">
            Delete
          </button>
        </div>
      </motion.div>
    </>
  );
}

function SheetBtn({ onClick, primary, active, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-colors touch-manipulation active:scale-[0.97]
        ${primary ? 'bg-primary text-white' : active ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/[0.03] text-gray-300 border border-white/[0.06]'}`}>
      {children}
    </button>
  );
}