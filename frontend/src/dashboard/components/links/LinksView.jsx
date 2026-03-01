// src/dashboard/components/links/LinksView.jsx
import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContextMenuProvider } from '../common/ContextMenu';
import LinkCard from './LinkCard';
import LinkDetails from './LinkDetails';
import LinkSkeleton from './LinkSkeleton';
import LinksToolbar from './LinksToolbar';
import MobileLinkSheet from './MobileLinkSheet';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import { IconSearch, IconLink } from '../common/Icons';

const SAFE_CONTENT_STYLE = {
  paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)',
  paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};

export default function LinksView({
  links = [], view, searchQuery, viewMode = 'grid',
  onUpdateLink, onDeleteLink, onPinLink, onStarLink, onArchiveLink,
  onRefresh, loading = false, error = null,
}) {
  const [selectedLink, setSelectedLink] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [hoveredId, setHoveredId] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const processedLinks = useMemo(() => {
    let result = [...links];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.original_url?.toLowerCase().includes(q) ||
          l.notes?.toLowerCase().includes(q) ||
          l.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'title') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [links, searchQuery, sortBy, sortOrder]);

  const isSelectMode = selectedIds.size > 0;

  const toggleSelect = useCallback((id, e) => {
    e?.stopPropagation?.();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectById = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === processedLinks.length
        ? new Set()
        : new Set(processedLinks.map((l) => l.id)),
    );
  }, [processedLinks]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const bulkDelete = useCallback(async () => {
    if (!window.confirm(`Delete ${selectedIds.size} links?`)) return;
    for (const id of selectedIds) await onDeleteLink(id);
    clearSelection();
  }, [selectedIds, onDeleteLink, clearSelection]);

  const bulkArchive = useCallback(async () => {
    for (const id of selectedIds) await onArchiveLink(id);
    clearSelection();
  }, [selectedIds, onArchiveLink, clearSelection]);

  const openDetails = useCallback(
    (link) => {
      if (isSelectMode) return;
      setSelectedLink((prev) => (prev?.id === link.id ? null : link));
    },
    [isSelectMode],
  );

  const closeDetails = useCallback(() => setSelectedLink(null), []);

  useEffect(() => {
    if (isMobile) return;
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowDown': case 'j':
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, processedLinks.length - 1));
          break;
        case 'ArrowUp': case 'k':
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          if (focusedIndex >= 0) openDetails(processedLinks[focusedIndex]);
          break;
        case 'x':
          if (focusedIndex >= 0) toggleSelectById(processedLinks[focusedIndex].id);
          break;
        case 'Escape':
          if (selectedIds.size > 0) clearSelection();
          else if (selectedLink) closeDetails();
          break;
        case 'a':
          if (e.metaKey || e.ctrlKey) { e.preventDefault(); selectAll(); }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobile, focusedIndex, processedLinks, selectedIds, selectedLink, openDetails, toggleSelectById, clearSelection, selectAll, closeDetails]);

  useEffect(() => { setFocusedIndex(-1); }, [view, searchQuery]);

  useEffect(() => {
    if (isMobile && selectedLink) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, selectedLink]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4 sm:p-6">
        <ErrorState title="Failed to load links" message={error.message || 'Something went wrong.'} onRetry={onRefresh} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-2.5 sm:p-4 lg:p-6" style={SAFE_CONTENT_STYLE}>
        <LinkSkeleton viewMode={viewMode} />
      </div>
    );
  }

  if (processedLinks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4 sm:p-6">
        <EmptyState {...getEmptyProps(view, searchQuery, onRefresh)} />
      </div>
    );
  }

  return (
    <ContextMenuProvider>
      <div className="flex h-full">
        <div className="flex-1 min-w-0 flex flex-col">
          <LinksToolbar
            totalCount={processedLinks.length}
            selectedCount={selectedIds.size}
            isSelectMode={isSelectMode}
            sortBy={sortBy} sortOrder={sortOrder}
            onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
            onSelectAll={selectAll} onClearSelection={clearSelection}
            onBulkDelete={bulkDelete} onBulkArchive={bulkArchive}
            searchQuery={searchQuery}
          />

          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-2.5 pt-2 sm:p-4 sm:pt-3 lg:p-6 lg:pt-3" style={SAFE_CONTENT_STYLE}>
              <div
                className={viewMode === 'grid'
                  ? 'grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'space-y-0.5'}
                role="listbox" aria-label="Links"
              >
                <AnimatePresence mode="popLayout">
                  {processedLinks.map((link, index) => (
                    <LinkCard
                      key={link.id} link={link} index={index} viewMode={viewMode}
                      isSelected={selectedIds.has(link.id)}
                      isActive={selectedLink?.id === link.id}
                      isFocused={focusedIndex === index}
                      isSelectMode={isSelectMode}
                      onHover={setHoveredId}
                      onClick={() => openDetails(link)}
                      onSelect={(e) => toggleSelect(link.id, e)}
                      onSelectById={toggleSelectById}
                      onPin={() => onPinLink(link.id)}
                      onStar={() => onStarLink(link.id)}
                      onArchive={() => onArchiveLink(link.id)}
                      onDelete={() => onDeleteLink(link.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
              <div className="h-4 sm:h-6" />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selectedLink && !isMobile && (
            <LinkDetails
              link={selectedLink} onClose={closeDetails} onUpdate={onUpdateLink}
              onDelete={(id) => { onDeleteLink(id); closeDetails(); }}
              onPin={() => onPinLink(selectedLink.id)}
              onStar={() => onStarLink(selectedLink.id)}
              onArchive={() => onArchiveLink(selectedLink.id)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedLink && isMobile && (
            <MobileLinkSheet
              link={selectedLink} onClose={closeDetails}
              onPin={() => onPinLink(selectedLink.id)}
              onStar={() => onStarLink(selectedLink.id)}
              onArchive={() => { onArchiveLink(selectedLink.id); closeDetails(); }}
              onDelete={() => { onDeleteLink(selectedLink.id); closeDetails(); }}
            />
          )}
        </AnimatePresence>
      </div>
    </ContextMenuProvider>
  );
}

function getEmptyProps(view, searchQuery, onRefresh) {
  const linkIcon = <IconLink className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600" strokeWidth={1} />;

  if (searchQuery) {
    return {
      icon: <IconSearch className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600" strokeWidth={1} />,
      title: 'No results',
      description: `Nothing matches "${searchQuery}"`,
    };
  }

  const config = {
    all: { title: 'No links yet', description: 'Save your first link to get started.', action: onRefresh, actionLabel: 'Add a link' },
    recent: { title: 'No recent links', description: 'Links you save will appear here.' },
    starred: { title: 'No starred links', description: 'Star links for quick access.' },
    archive: { title: 'Archive is empty', description: 'Archived links will appear here.' },
  };

  return { icon: linkIcon, ...(config[view] || config.all) };
}