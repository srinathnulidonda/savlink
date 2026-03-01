// src/dashboard/pages/collections/CollectionView.jsx
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ContextMenuProvider } from '../../components/common/ContextMenu';
import { useCollection } from './useCollection';
import CollectionHeader from './CollectionHeader';
import CollectionEmpty from './CollectionEmpty';
import MobileFilesToolbar from '../../components/mobile/MobileFilesToolbar';
import MobileSelectionBar from '../../components/mobile/MobileSelectionBar';
import FolderCard from '../../components/folders/FolderCard';
import FolderPropertiesModal from '../../modals/FolderProperties/FolderPropertiesModal';
import LinkCard from '../../components/links/LinkCard';
import LinkDetails from '../../components/links/LinkDetails';
import LinksToolbar from '../../components/links/LinksToolbar';
import LinkSkeleton from '../../components/links/LinkSkeleton';
import MobileLinkSheet from '../../components/links/MobileLinkSheet';
import LinksService from '../../../services/links.service';
import FoldersService from '../../../services/folders.service';
import { BOTTOM_NAV_HEIGHT } from '../../components/common/MobileBottomNav';
import { IconWarning } from '../../components/common/Icons';
import toast from 'react-hot-toast';

function haptic(ms = 50) {
  try { navigator?.vibrate?.(ms); } catch {}
}

const COLLECTION_SORT_FIELDS = [
  { id: 'title', label: 'Name', defaultOrder: 'asc' },
  { id: 'updated_at', label: 'Date modified', defaultOrder: 'desc' },
  { id: 'created_at', label: 'Date added', defaultOrder: 'desc' },
  { id: 'click_count', label: 'Most clicked', defaultOrder: 'desc' },
];

export default function CollectionView({ onAddLink, onCreateFolder }) {
  const navigate = useNavigate();
  const {
    folderId, folder, children, breadcrumb, stats,
    links, meta, loading, linksLoading, error,
    searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder,
    loadMore, refresh, updateLink, deleteLink, pinLink, starLink, archiveLink,
  } = useCollection();

  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('savlink_collection_view') || 'list'; } catch { return 'list'; }
  });
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    try { localStorage.setItem('savlink_collection_view', mode); } catch {}
  }, []);

  const [selectedLink, setSelectedLink] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSelectMode, setMobileSelectMode] = useState(false);
  const [propsFolder, setPropsFolder] = useState(null);
  const [propsOpen, setPropsOpen] = useState(false);

  const lpTimerRef = useRef(null);
  const lpPosRef = useRef(null);
  const lpFiredRef = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setSelectedLink(null);
    setSelectedIds(new Set());
    setFocusedIndex(-1);
    setMobileSelectMode(false);
  }, [folderId]);

  useEffect(() => {
    if (isMobile && mobileSelectMode && selectedIds.size === 0) setMobileSelectMode(false);
  }, [isMobile, mobileSelectMode, selectedIds.size]);

  useEffect(() => {
    if (isMobile && selectedLink && !mobileSelectMode) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, selectedLink, mobileSelectMode]);

  useEffect(() => () => clearTimeout(lpTimerRef.current), []);

  const startLongPress = useCallback((e, id) => {
    if (!isMobile) return;
    lpFiredRef.current = false;
    const touch = e.touches?.[0];
    lpPosRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    lpTimerRef.current = setTimeout(() => {
      lpFiredRef.current = true;
      haptic(50);
      setMobileSelectMode(true);
      setSelectedIds(new Set([id]));
      setSelectedLink(null);
    }, 500);
  }, [isMobile]);

  const moveLongPress = useCallback((e) => {
    if (!lpPosRef.current) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    if (Math.abs(touch.clientX - lpPosRef.current.x) > 10 ||
      Math.abs(touch.clientY - lpPosRef.current.y) > 10) {
      clearTimeout(lpTimerRef.current);
      lpPosRef.current = null;
    }
  }, []);

  const endLongPress = useCallback(() => {
    clearTimeout(lpTimerRef.current);
    lpPosRef.current = null;
  }, []);

  const wasLongPress = useCallback(() => {
    if (lpFiredRef.current) { lpFiredRef.current = false; return true; }
    return false;
  }, []);

  const isSelectMode = mobileSelectMode || selectedIds.size > 0;

  const toggleSelectById = useCallback((id) => {
    haptic(4);
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelect = useCallback((id, e) => {
    e?.stopPropagation?.();
    toggleSelectById(id);
  }, [toggleSelectById]);

  const selectAll = useCallback(() => {
    const allIds = [...children.map(c => c.id), ...links.map(l => l.id)];
    setSelectedIds(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  }, [children, links]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const exitSelectionMode = useCallback(() => {
    setMobileSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectedAnalysis = useMemo(() => {
    const linkIds = new Set(links.map(l => l.id));
    const folderIds = new Set(children.map(c => c.id));
    let hasLinks = false, hasFolders = false;
    selectedIds.forEach(id => {
      if (linkIds.has(id)) hasLinks = true;
      if (folderIds.has(id)) hasFolders = true;
    });
    return { hasLinks, hasFolders };
  }, [selectedIds, links, children]);

  const totalItems = children.length + links.length;

  const handleChildRename = useCallback(async (child) => {
    const newName = window.prompt('Rename folder', child.name);
    if (!newName || newName.trim() === child.name) return;
    const result = await FoldersService.updateFolder(child.id, { name: newName.trim() });
    if (result.success) { toast.success('Renamed'); refresh(); }
    else toast.error(result.error || 'Rename failed');
  }, [refresh]);

  const handleChildTogglePin = useCallback(async (child) => {
    const result = await FoldersService.togglePin(child.id);
    if (result.success) { toast.success(child.pinned ? 'Unpinned' : 'Pinned'); refresh(); }
  }, [refresh]);

  const handleChildDelete = useCallback(async (child) => {
    const result = await FoldersService.deleteFolder(child.id);
    if (result.success) { toast.success('Deleted'); refresh(); }
    else toast.error(result.error || 'Delete failed');
  }, [refresh]);

  const handleMobileDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (!window.confirm(`Delete ${ids.length} item${ids.length > 1 ? 's' : ''}?`)) return;
    const linkIdSet = new Set(links.map(l => l.id));
    const folderIdSet = new Set(children.map(c => c.id));
    let deleted = 0;
    const linkIds = ids.filter(id => linkIdSet.has(id));
    const folderIds = ids.filter(id => folderIdSet.has(id));
    if (linkIds.length > 0) {
      const r = await LinksService.bulkDelete(linkIds);
      if (r?.success) deleted += linkIds.length;
    }
    for (const fid of folderIds) {
      const r = await FoldersService.deleteFolder(fid);
      if (r?.success) deleted++;
    }
    if (deleted > 0) { toast.success(`${deleted} item${deleted > 1 ? 's' : ''} deleted`); refresh(); }
    exitSelectionMode();
  }, [selectedIds, links, children, refresh, exitSelectionMode]);

  const handleMobileArchive = useCallback(async () => {
    const linkIdSet = new Set(links.map(l => l.id));
    const linkIds = [...selectedIds].filter(id => linkIdSet.has(id));
    if (linkIds.length === 0) { toast('No links to archive', { icon: '📦' }); return; }
    const r = await LinksService.bulkArchive(linkIds);
    if (r?.success) { toast.success(`${linkIds.length} archived`); refresh(); }
    exitSelectionMode();
  }, [selectedIds, links, refresh, exitSelectionMode]);

  const handleMobileMove = useCallback(async (targetFolderId) => {
    const linkIdSet = new Set(links.map(l => l.id));
    const linkIds = [...selectedIds].filter(id => linkIdSet.has(id));
    if (linkIds.length === 0) { toast('No links to move', { icon: '📂' }); exitSelectionMode(); return; }
    let moved = 0;
    for (const id of linkIds) {
      const r = await LinksService.moveToFolder(id, targetFolderId);
      if (r?.success) moved++;
    }
    if (moved > 0) { toast.success(`${moved} link${moved > 1 ? 's' : ''} moved`); refresh(); }
    exitSelectionMode();
  }, [selectedIds, links, refresh, exitSelectionMode]);

  const handleMobileStar = useCallback(async () => {
    const linkIdSet = new Set(links.map(l => l.id));
    for (const id of selectedIds) { if (linkIdSet.has(id)) await starLink(id); }
    exitSelectionMode();
  }, [selectedIds, links, starLink, exitSelectionMode]);

  const handleMobilePin = useCallback(async () => {
    const linkIdSet = new Set(links.map(l => l.id));
    const folderIdSet = new Set(children.map(c => c.id));
    for (const id of selectedIds) {
      if (linkIdSet.has(id)) await pinLink(id);
      else if (folderIdSet.has(id)) await FoldersService.togglePin(id);
    }
    toast.success('Updated'); refresh();
    exitSelectionMode();
  }, [selectedIds, links, children, pinLink, refresh, exitSelectionMode]);

  const handleMobileCopyLinks = useCallback(async () => {
    const linkIdSet = new Set(links.map(l => l.id));
    const urls = [...selectedIds]
      .filter(id => linkIdSet.has(id))
      .map(id => links.find(l => l.id === id))
      .filter(Boolean)
      .map(l => l.original_url)
      .join('\n');
    if (!urls) { toast('No link URLs to copy', { icon: '🔗' }); exitSelectionMode(); return; }
    try { await navigator.clipboard.writeText(urls); toast.success('URLs copied'); }
    catch { toast.error('Copy failed'); }
    exitSelectionMode();
  }, [selectedIds, links, exitSelectionMode]);

  const handleMobileOpenLinks = useCallback(() => {
    const linkIdSet = new Set(links.map(l => l.id));
    [...selectedIds]
      .filter(id => linkIdSet.has(id))
      .map(id => links.find(l => l.id === id))
      .filter(Boolean)
      .forEach(l => window.open(l.original_url, '_blank', 'noopener,noreferrer'));
    exitSelectionMode();
  }, [selectedIds, links, exitSelectionMode]);

  const handleMobileCopyMarkdown = useCallback(async () => {
    const linkIdSet = new Set(links.map(l => l.id));
    const md = [...selectedIds]
      .filter(id => linkIdSet.has(id))
      .map(id => links.find(l => l.id === id))
      .filter(Boolean)
      .map(l => `[${l.title || l.original_url}](${l.original_url})`)
      .join('\n');
    if (!md) { toast('No links to copy', { icon: '📋' }); exitSelectionMode(); return; }
    try { await navigator.clipboard.writeText(md); toast.success('Markdown copied'); }
    catch { toast.error('Copy failed'); }
    exitSelectionMode();
  }, [selectedIds, links, exitSelectionMode]);

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
    if (mobileSelectMode) { toggleSelectById(link.id); return; }
    if (isSelectMode && !isMobile) { toggleSelectById(link.id); return; }
    setSelectedLink(prev => prev?.id === link.id ? null : link);
  }, [mobileSelectMode, isSelectMode, isMobile, toggleSelectById]);

  const closeDetails = useCallback(() => setSelectedLink(null), []);

  const handleSubfolderClick = useCallback((child) => {
    if (wasLongPress()) return;
    if (mobileSelectMode) { toggleSelectById(child.id); return; }
    navigate(`/dashboard/myfiles/${child.slug}`);
  }, [mobileSelectMode, wasLongPress, toggleSelectById, navigate]);

  const handleLinkClick = useCallback((link) => {
    if (wasLongPress()) return;
    openDetails(link);
  }, [wasLongPress, openDetails]);

  const handleSortChange = useCallback((by, order) => {
    setSortBy(by); setSortOrder(order);
  }, [setSortBy, setSortOrder]);

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <IconWarning className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-[15px] font-medium text-white mb-1">Folder not found</h3>
        <p className="text-[13px] text-gray-500 mb-4">{error}</p>
        <button onClick={() => navigate('/dashboard/myfiles')}
          className="text-[13px] text-primary hover:text-primary-light font-medium">← Back to My Files</button>
      </div>
    );
  }

  if (loading && !folder) {
    return (
      <div className={isMobile ? 'p-3' : 'p-6'}>
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 bg-white/[0.04] rounded animate-pulse" />
              <div className="h-3 w-28 bg-white/[0.04] rounded animate-pulse" />
            </div>
          </div>
          {isMobile && <div className="h-11 bg-white/[0.04] rounded-lg animate-pulse" />}
        </div>
        <LinkSkeleton viewMode={viewMode} />
      </div>
    );
  }

  return (
    <ContextMenuProvider>
      <div className="flex h-full">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          <AnimatePresence>
            {isMobile && mobileSelectMode && (
              <MobileSelectionBar
                selectedCount={selectedIds.size}
                onClose={exitSelectionMode}
                onMove={handleMobileMove}
                onArchive={handleMobileArchive}
                onDelete={handleMobileDelete}
                onStar={handleMobileStar}
                onPin={handleMobilePin}
                onCopyLinks={handleMobileCopyLinks}
                onCopyMarkdown={handleMobileCopyMarkdown}
                onOpenLinks={handleMobileOpenLinks}
                onSelectAll={selectAll}
                hasLinks={selectedAnalysis.hasLinks}
                hasFolders={selectedAnalysis.hasFolders}
                totalItems={totalItems}
              />
            )}
          </AnimatePresence>

          <CollectionHeader
            folder={folder} breadcrumb={breadcrumb} stats={stats}
            onRefresh={refresh} onCreateFolder={onCreateFolder}
            searchQuery={searchQuery} onSearch={setSearchQuery}
            isMobile={isMobile}
          />

          {isMobile && (
            <MobileFilesToolbar
              sortBy={sortBy} sortOrder={sortOrder}
              onSortChange={handleSortChange}
              viewMode={viewMode} onViewModeChange={handleViewModeChange}
              sortFields={COLLECTION_SORT_FIELDS}
            />
          )}

          {!isMobile && links.length > 0 && (
            <LinksToolbar
              totalCount={meta.total ?? links.length}
              selectedCount={selectedIds.size}
              isSelectMode={!isMobile && selectedIds.size > 0}
              sortBy={sortBy} sortOrder={sortOrder}
              onSortChange={handleSortChange}
              onSelectAll={selectAll} onClearSelection={clearSelection}
              onBulkDelete={bulkDelete} onBulkArchive={bulkArchive}
              searchQuery={searchQuery}
            />
          )}

          <div
            className="flex-1 overflow-y-auto overscroll-contain"
            style={isMobile
              ? { paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 8px)` }
              : undefined}
          >
            {children.length > 0 && (
              <div className={isMobile ? 'px-3 pt-3' : 'px-6 pt-5'}>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Folders <span className="text-gray-700 font-normal ml-1">{children.length}</span>
                </h3>
                <div className={
                  viewMode === 'grid'
                    ? `grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`
                    : 'space-y-px'
                }>
                  {children.map((child, i) => (
                    <div
                      key={child.id}
                      onTouchStart={(e) => startLongPress(e, child.id)}
                      onTouchMove={moveLongPress}
                      onTouchEnd={endLongPress}
                      onTouchCancel={endLongPress}
                      onContextMenu={(e) => { if (isMobile) e.preventDefault(); }}
                    >
                      <FolderCard
                        folder={child}
                        index={i}
                        viewMode={viewMode}
                        isMobile={isMobile}
                        isSelected={selectedIds.has(child.id)}
                        isSelectMode={mobileSelectMode || (!isMobile && selectedIds.size > 0)}
                        onClick={() => handleSubfolderClick(child)}
                        onSelect={(e) => toggleSelect(child.id, e)}
                        onSelectById={toggleSelectById}
                        onOpen={() => navigate(`/dashboard/myfiles/${child.slug}`)}
                        onRename={() => handleChildRename(child)}
                        onTogglePin={() => handleChildTogglePin(child)}
                        onDelete={() => handleChildDelete(child)}
                        onProperties={() => { setPropsFolder(child); setPropsOpen(true); }}
                        onCreateFolder={() => onCreateFolder?.(child.id)}
                        onAddLink={onAddLink}
                      />
                    </div>
                  ))}
                </div>
                {links.length > 0 && (
                  <div className={`border-t border-white/[0.04] ${isMobile ? 'mt-3 mb-1' : 'mt-4 mb-3'}`} />
                )}
              </div>
            )}

            {links.length === 0 && !linksLoading ? (
              <CollectionEmpty folderName={folder?.name || 'This folder'} onAddLink={onAddLink} searchQuery={searchQuery} />
            ) : links.length > 0 && (
              <div className={children.length === 0 ? (isMobile ? 'px-3 pt-3' : 'px-6 pt-5') : (isMobile ? 'px-3' : 'px-6')}>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Links <span className="text-gray-700 font-normal ml-1">{meta.total ?? links.length}</span>
                </h3>
                <div
                  className={viewMode === 'grid'
                    ? `grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`
                    : 'space-y-px'}
                  role="listbox"
                >
                  <AnimatePresence mode="popLayout">
                    {links.map((link, index) => (
                      <div
                        key={link.id}
                        onTouchStart={(e) => startLongPress(e, link.id)}
                        onTouchMove={moveLongPress}
                        onTouchEnd={endLongPress}
                        onTouchCancel={endLongPress}
                        onContextMenu={(e) => { if (isMobile) e.preventDefault(); }}
                      >
                        <LinkCard
                          link={link} index={index} viewMode={viewMode}
                          isSelected={selectedIds.has(link.id)}
                          isActive={selectedLink?.id === link.id}
                          isFocused={focusedIndex === index}
                          isSelectMode={mobileSelectMode || (!isMobile && selectedIds.size > 0)}
                          onClick={() => handleLinkClick(link)}
                          onSelect={(e) => toggleSelect(link.id, e)}
                          onSelectById={toggleSelectById}
                          onPin={() => pinLink(link.id)}
                          onStar={() => starLink(link.id)}
                          onArchive={() => archiveLink(link.id)}
                          onDelete={() => deleteLink(link.id)}
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>

                {meta.has_more && (
                  <div className="flex justify-center py-5">
                    <button onClick={loadMore} disabled={linksLoading}
                      className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium
                                 text-gray-400 bg-white/[0.03] border border-white/[0.06]
                                 hover:bg-white/[0.06] rounded-lg transition-colors
                                 disabled:opacity-50 touch-manipulation">
                      {linksLoading
                        ? <><div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" /> Loading…</>
                        : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {linksLoading && links.length === 0 && (
              <div className={isMobile ? 'p-3' : 'p-6'}><LinkSkeleton viewMode={viewMode} /></div>
            )}

            <div className={isMobile ? 'h-4' : 'h-8'} />
          </div>
        </div>

        <AnimatePresence>
          {selectedLink && !isMobile && (
            <LinkDetails
              link={selectedLink} onClose={closeDetails} onUpdate={updateLink}
              onDelete={(id) => { deleteLink(id); closeDetails(); }}
              onPin={() => pinLink(selectedLink.id)}
              onStar={() => starLink(selectedLink.id)}
              onArchive={() => archiveLink(selectedLink.id)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedLink && isMobile && !mobileSelectMode && (
            <MobileLinkSheet
              link={selectedLink} onClose={closeDetails}
              onPin={() => pinLink(selectedLink.id)}
              onStar={() => starLink(selectedLink.id)}
              onArchive={() => { archiveLink(selectedLink.id); closeDetails(); }}
              onDelete={() => { deleteLink(selectedLink.id); closeDetails(); }}
            />
          )}
        </AnimatePresence>
      </div>

      <FolderPropertiesModal
        isOpen={propsOpen}
        onClose={() => { setPropsOpen(false); setPropsFolder(null); }}
        folder={propsFolder}
        onUpdate={refresh}
      />
    </ContextMenuProvider>
  );
}