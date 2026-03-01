// src/dashboard/pages/myfiles/MyFiles.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ContextMenuProvider } from '../../components/common/ContextMenu';
import { useMyFiles } from './useMyFiles';
import MyFilesHeader from './MyFilesHeader';
import MyFilesToolbar from './MyFilesToolbar';
import MyFilesEmpty from './MyFilesEmpty';
import MobileSelectionBar from '../../components/mobile/MobileSelectionBar';
import FolderTreePanel from './FolderTreePanel';
import FolderCard from '../../components/folders/FolderCard';
import FolderPropertiesModal from '../../modals/FolderProperties/FolderPropertiesModal';
import LinkCard from '../../components/links/LinkCard';
import LinkDetails from '../../components/links/LinkDetails';
import LinkSkeleton from '../../components/links/LinkSkeleton';
import MobileLinkSheet from '../../components/links/MobileLinkSheet';
import FoldersService from '../../../services/folders.service';
import LinksService from '../../../services/links.service';
import { BOTTOM_NAV_HEIGHT } from '../../components/common/MobileBottomNav';
import toast from 'react-hot-toast';

function haptic(ms = 50) {
  try { navigator?.vibrate?.(ms); } catch {}
}

export default function MyFiles({ onAddLink, onCreateFolder }) {
  const navigate = useNavigate();
  const {
    folders, links, meta, stats, loading, linksLoading,
    searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder,
    typeFilter, setTypeFilter, tagFilter, setTagFilter,
    loadMore, refresh, updateLink, deleteLink, pinLink, starLink, archiveLink,
    bulkDelete, bulkArchive, bulkMove,
  } = useMyFiles();

  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('savlink_myfiles_view') || 'list'; } catch { return 'list'; }
  });
  const [treeOpen, setTreeOpen] = useState(() => {
    try { return localStorage.getItem('savlink_tree_open') !== 'false'; } catch { return true; }
  });
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
    if (isMobile && mobileSelectMode && selectedIds.size === 0) setMobileSelectMode(false);
  }, [isMobile, mobileSelectMode, selectedIds.size]);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    try { localStorage.setItem('savlink_myfiles_view', mode); } catch {}
  }, []);

  const handleToggleTree = useCallback(() => {
    setTreeOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('savlink_tree_open', String(next)); } catch {}
      return next;
    });
  }, []);

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

  useEffect(() => () => clearTimeout(lpTimerRef.current), []);

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
    const allIds = [...folders.map(f => f.id), ...links.map(l => l.id)];
    setSelectedIds(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  }, [folders, links]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const exitSelectionMode = useCallback(() => {
    setMobileSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectedAnalysis = useMemo(() => {
    const linkIds = new Set(links.map(l => l.id));
    const folderIds = new Set(folders.map(f => f.id));
    let hasLinks = false, hasFolders = false;
    selectedIds.forEach(id => {
      if (linkIds.has(id)) hasLinks = true;
      if (folderIds.has(id)) hasFolders = true;
    });
    return { hasLinks, hasFolders };
  }, [selectedIds, links, folders]);

  const totalItems = folders.length + links.length;

  const handleFolderRename = useCallback(async (folder) => {
    const newName = window.prompt('Rename folder', folder.name);
    if (!newName || newName.trim() === folder.name) return;
    const result = await FoldersService.updateFolder(folder.id, { name: newName.trim() });
    if (result.success) { toast.success('Renamed'); refresh(); }
    else toast.error(result.error || 'Rename failed');
  }, [refresh]);

  const handleFolderTogglePin = useCallback(async (folder) => {
    const result = await FoldersService.togglePin(folder.id);
    if (result.success) { toast.success(folder.pinned ? 'Unpinned' : 'Pinned'); refresh(); }
  }, [refresh]);

  const handleFolderDelete = useCallback(async (folder) => {
    const result = await FoldersService.deleteFolder(folder.id);
    if (result.success) { toast.success('Folder deleted'); refresh(); }
    else toast.error(result.error || 'Delete failed');
  }, [refresh]);

  const handleMobileDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (!window.confirm(`Delete ${ids.length} item${ids.length > 1 ? 's' : ''}?`)) return;
    const linkIdSet = new Set(links.map(l => l.id));
    const folderIdSet = new Set(folders.map(f => f.id));
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
  }, [selectedIds, links, folders, refresh, exitSelectionMode]);

  const handleMobileArchive = useCallback(async () => {
    const linkIdSet = new Set(links.map(l => l.id));
    const linkIds = [...selectedIds].filter(id => linkIdSet.has(id));
    if (linkIds.length === 0) { toast('No links to archive', { icon: '📦' }); return; }
    const r = await LinksService.bulkArchive(linkIds);
    if (r?.success) { toast.success(`${linkIds.length} archived`); refresh(); }
    exitSelectionMode();
  }, [selectedIds, links, refresh, exitSelectionMode]);

  const handleMobileMove = useCallback(async (folderId) => {
    const linkIdSet = new Set(links.map(l => l.id));
    const linkIds = [...selectedIds].filter(id => linkIdSet.has(id));
    if (linkIds.length === 0) { toast('No links to move', { icon: '📂' }); exitSelectionMode(); return; }
    let moved = 0;
    for (const id of linkIds) {
      const r = await LinksService.moveToFolder(id, folderId);
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
    const folderIdSet = new Set(folders.map(f => f.id));
    for (const id of selectedIds) {
      if (linkIdSet.has(id)) await pinLink(id);
      else if (folderIdSet.has(id)) await FoldersService.togglePin(id);
    }
    toast.success('Updated'); refresh();
    exitSelectionMode();
  }, [selectedIds, links, folders, pinLink, refresh, exitSelectionMode]);

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

  const handleBulkDelete = useCallback(async () => {
    const ok = await bulkDelete([...selectedIds]);
    if (ok) clearSelection();
  }, [selectedIds, bulkDelete, clearSelection]);

  const handleBulkArchive = useCallback(async () => {
    const ok = await bulkArchive([...selectedIds]);
    if (ok) clearSelection();
  }, [selectedIds, bulkArchive, clearSelection]);

  const handleBulkMove = useCallback(async (folderId) => {
    const ok = await bulkMove([...selectedIds], folderId);
    if (ok) clearSelection();
  }, [selectedIds, bulkMove, clearSelection]);

  const openDetails = useCallback((link) => {
    if (mobileSelectMode) { toggleSelectById(link.id); return; }
    if (isSelectMode && !isMobile) { toggleSelectById(link.id); return; }
    setSelectedLink(prev => prev?.id === link.id ? null : link);
  }, [mobileSelectMode, isSelectMode, isMobile, toggleSelectById]);

  const closeDetails = useCallback(() => setSelectedLink(null), []);

  const handleFolderClick = useCallback((folder) => {
    if (wasLongPress()) return;
    if (mobileSelectMode) { toggleSelectById(folder.id); return; }
    navigate(`/dashboard/myfiles/${folder.slug}`);
  }, [mobileSelectMode, wasLongPress, toggleSelectById, navigate]);

  const handleLinkClick = useCallback((link) => {
    if (wasLongPress()) return;
    openDetails(link);
  }, [wasLongPress, openDetails]);

  const handleSortChange = useCallback((by, order) => {
    setSortBy(by); setSortOrder(order);
  }, [setSortBy, setSortOrder]);

  const clearFilters = useCallback(() => {
    setSearchQuery(''); setTypeFilter(''); setTagFilter([]);
  }, [setSearchQuery, setTypeFilter, setTagFilter]);

  const hasFilters = typeFilter || tagFilter.length > 0;
  const isEmpty = !loading && folders.length === 0 && links.length === 0;

  useEffect(() => {
    if (isMobile && selectedLink && !mobileSelectMode) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, selectedLink, mobileSelectMode]);

  useEffect(() => {
    if (isMobile) return;
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowDown': case 'j':
          e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, links.length - 1)); break;
        case 'ArrowUp': case 'k':
          e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); break;
        case 'Enter':
          if (focusedIndex >= 0 && links[focusedIndex]) openDetails(links[focusedIndex]); break;
        case 'x':
          if (focusedIndex >= 0 && links[focusedIndex]) toggleSelectById(links[focusedIndex].id); break;
        case 'Escape':
          if (selectedIds.size > 0) clearSelection();
          else if (selectedLink) closeDetails(); break;
        case 'a':
          if (e.metaKey || e.ctrlKey) { e.preventDefault(); selectAll(); } break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobile, focusedIndex, links, selectedIds, selectedLink,
    openDetails, toggleSelectById, clearSelection, selectAll, closeDetails]);

  if (loading && folders.length === 0 && links.length === 0) {
    return (
      <div className="flex h-full">
        <div className="flex-1 min-w-0">
          <div className={`flex items-center justify-between h-11 border-b border-white/[0.04]
            ${isMobile ? 'px-4' : 'px-6 pt-5 pb-4 h-auto border-b border-white/[0.05]'}`}>
            {isMobile ? (
              <>
                <div className="h-4 w-28 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-7 w-16 bg-white/[0.04] rounded-lg animate-pulse" />
              </>
            ) : (
              <div className="space-y-3 w-full">
                <div className="h-6 w-28 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-3 w-40 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-8 w-full max-w-sm bg-white/[0.04] rounded-lg animate-pulse" />
              </div>
            )}
          </div>
          <div className={isMobile ? 'p-3' : 'p-6'}>
            <LinkSkeleton viewMode={viewMode} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ContextMenuProvider>
      <div className="flex h-full overflow-hidden">
        <AnimatePresence>
          {!isMobile && <FolderTreePanel isOpen={treeOpen} onClose={handleToggleTree} />}
        </AnimatePresence>

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
                onSelectAll={selectAll}
                hasLinks={selectedAnalysis.hasLinks}
                hasFolders={selectedAnalysis.hasFolders}
                totalItems={totalItems}
              />
            )}
          </AnimatePresence>

          <MyFilesHeader
            stats={stats} searchQuery={searchQuery} onSearch={setSearchQuery}
            sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange}
            typeFilter={typeFilter} onTypeChange={setTypeFilter}
            tagFilter={tagFilter} onTagChange={setTagFilter}
            viewMode={viewMode} onViewModeChange={handleViewModeChange}
            onAddLink={onAddLink} onCreateFolder={() => onCreateFolder?.()}
            onToggleTree={handleToggleTree} treeOpen={treeOpen} isMobile={isMobile}
          />

          {!isMobile && (
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <MyFilesToolbar
                  selectedCount={selectedIds.size} totalCount={links.length}
                  onSelectAll={selectAll} onClearSelection={clearSelection}
                  onBulkDelete={handleBulkDelete} onBulkArchive={handleBulkArchive}
                  onBulkMove={handleBulkMove} isMobile={false}
                />
              )}
            </AnimatePresence>
          )}

          <div
            className="flex-1 overflow-y-auto overscroll-contain"
            style={isMobile
              ? { paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 8px)` }
              : undefined}
          >
            {isEmpty ? (
              <MyFilesEmpty
                searchQuery={searchQuery} hasFilters={hasFilters}
                onAddLink={onAddLink} onCreateFolder={() => onCreateFolder?.()}
                onClearFilters={clearFilters}
              />
            ) : (
              <>
                {folders.length > 0 && (
                  <div className={isMobile ? 'px-3 pt-3' : 'px-6 pt-5'}>
                    <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                      Folders <span className="text-gray-700 font-normal ml-1">{folders.length}</span>
                    </h3>
                    <div className={
                      viewMode === 'grid'
                        ? `grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`
                        : 'space-y-px'
                    }>
                      {folders.map((folder, i) => (
                        <div
                          key={folder.id}
                          onTouchStart={(e) => startLongPress(e, folder.id)}
                          onTouchMove={moveLongPress}
                          onTouchEnd={endLongPress}
                          onTouchCancel={endLongPress}
                          onContextMenu={(e) => { if (isMobile) e.preventDefault(); }}
                        >
                          <FolderCard
                            folder={folder}
                            index={i}
                            viewMode={viewMode}
                            isMobile={isMobile}
                            isSelected={selectedIds.has(folder.id)}
                            isSelectMode={mobileSelectMode || (!isMobile && selectedIds.size > 0)}
                            onClick={() => handleFolderClick(folder)}
                            onSelect={(e) => toggleSelect(folder.id, e)}
                            onSelectById={toggleSelectById}
                            onOpen={() => navigate(`/dashboard/myfiles/${folder.slug}`)}
                            onRename={() => handleFolderRename(folder)}
                            onTogglePin={() => handleFolderTogglePin(folder)}
                            onDelete={() => handleFolderDelete(folder)}
                            onProperties={() => { setPropsFolder(folder); setPropsOpen(true); }}
                            onCreateFolder={() => onCreateFolder?.(folder.id)}
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

                {links.length > 0 && (
                  <div className={
                    folders.length === 0
                      ? (isMobile ? 'px-3 pt-3' : 'px-6 pt-5')
                      : (isMobile ? 'px-3' : 'px-6')
                  }>
                    <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                      Links <span className="text-gray-700 font-normal ml-1">{meta.total ?? links.length}</span>
                    </h3>
                    <div
                      className={
                        viewMode === 'grid'
                          ? `grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`
                          : 'space-y-px'
                      }
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

                <div className={isMobile ? 'h-4' : 'h-8'} />
              </>
            )}

            {linksLoading && links.length === 0 && folders.length === 0 && (
              <div className={isMobile ? 'p-3' : 'p-6'}>
                <LinkSkeleton viewMode={viewMode} />
              </div>
            )}
          </div>

          {!isMobile && (
            <div className="flex-shrink-0 px-6 py-2 border-t border-white/[0.04] bg-[#09090b]/80">
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span>
                  {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
                  {' · '}{meta.total ?? links.length} links
                  {searchQuery && ` matching "${searchQuery}"`}
                </span>
                <span>
                  {selectedIds.size > 0 && `${selectedIds.size} selected · `}
                  {viewMode === 'list' ? 'List' : 'Grid'}
                </span>
              </div>
            </div>
          )}
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