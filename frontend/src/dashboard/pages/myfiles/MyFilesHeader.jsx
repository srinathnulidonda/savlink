// src/dashboard/pages/myfiles/MyFilesHeader.jsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileFilesToolbar from '../../components/mobile/MobileFilesToolbar';
import { useTags } from '../../../hooks/useTags';

const SORT_FIELDS = [
  { id: 'title',       label: 'Name',          defaultOrder: 'asc' },
  { id: 'updated_at',  label: 'Date modified', defaultOrder: 'desc' },
  { id: 'created_at',  label: 'Date created',  defaultOrder: 'desc' },
  { id: 'click_count', label: 'Most clicked',  defaultOrder: 'desc' },
];

const TYPE_OPTIONS = [
  { id: '', label: 'All types' },
  { id: 'saved', label: 'Saved' },
  { id: 'shortened', label: 'Shortened' },
];

export default function MyFilesHeader({
  stats, searchQuery, onSearch,
  sortBy, sortOrder, onSortChange,
  typeFilter, onTypeChange,
  tagFilter, onTagChange,
  viewMode, onViewModeChange,
  onAddLink, onCreateFolder, onToggleTree, treeOpen,
  isMobile,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sortRef = useRef(null);
  const filterRef = useRef(null);
  const { data: tags } = useTags();

  useEffect(() => {
    if (isMobile) return;
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobile]);

  const sortLabel = SORT_FIELDS.find(s => s.id === sortBy)?.label || 'Date modified';

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (typeFilter) c++;
    if (tagFilter.length > 0) c++;
    return c;
  }, [typeFilter, tagFilter]);

  // ═══════════════════════════════════════════════════════════
  //  MOBILE
  // ═══════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <MobileFilesToolbar
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        sortFields={SORT_FIELDS}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  DESKTOP
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="flex-shrink-0 border-b border-white/[0.05]">
      <div className="px-6 pt-5 pb-4">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={onToggleTree} title="Toggle folder tree"
              className="hidden lg:flex p-1.5 text-gray-600 hover:text-gray-400
                         rounded-md hover:bg-white/[0.04] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d={treeOpen
                    ? "M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
                    : "M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5"} />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-white">My Files</h1>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                {stats?.total_links ?? 0} links · {stats?.total_folders ?? 0} folders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onCreateFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium
                         text-gray-300 bg-white/[0.03] border border-white/[0.06]
                         hover:bg-white/[0.06] rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0
                     00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0
                     002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0
                     00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              New folder
            </button>
            <button onClick={onAddLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium
                         text-white bg-primary hover:bg-primary-light rounded-lg
                         transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add link
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[140px] max-w-sm">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={(e) => onSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full h-8 pl-8 pr-8 text-[12px] text-white bg-white/[0.03]
                         border border-white/[0.06] rounded-lg outline-none
                         focus:border-primary/40 focus:ring-1 focus:ring-primary/20
                         placeholder-gray-600 transition-colors" />
            {searchQuery && (
              <button onClick={() => onSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="relative" ref={filterRef}>
            <button onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-1.5 h-8 px-2.5 text-[12px]
                         border rounded-lg transition-colors
                ${activeFilterCount > 0
                  ? 'text-primary border-primary/30 bg-primary/[0.06]'
                  : 'text-gray-400 border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917
                     1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25
                     2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244
                     2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659
                     7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32
                     48.32 0 0112 3z" />
              </svg>
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-white
                                 text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {filterOpen && (
                <DesktopFilterDropdown tags={tags} typeFilter={typeFilter} onTypeChange={onTypeChange}
                  tagFilter={tagFilter} onTagChange={onTagChange} activeFilterCount={activeFilterCount}
                  onClear={() => { onTypeChange(''); onTagChange([]); }} />
              )}
            </AnimatePresence>
          </div>

          {/* Sort */}
          <div className="relative" ref={sortRef}>
            <button onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 h-8 px-2.5 text-[12px]
                         text-gray-400 border border-white/[0.06] bg-white/[0.03]
                         hover:bg-white/[0.06] rounded-lg transition-colors whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5
                     21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
              <span className="hidden sm:inline">{sortLabel}</span>
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
                  className="absolute top-full mt-1 right-0 w-44 bg-[#111]
                             border border-gray-800/60 rounded-lg shadow-2xl z-20 py-1">
                  {SORT_FIELDS.map(opt => (
                    <button key={opt.id} onClick={() => {
                      if (sortBy === opt.id) onSortChange(opt.id, sortOrder === 'desc' ? 'asc' : 'desc');
                      else onSortChange(opt.id, opt.defaultOrder);
                      setSortOpen(false);
                    }}
                      className={`w-full flex items-center justify-between px-3 py-2.5
                                  text-[13px] transition-colors
                        ${sortBy === opt.id
                          ? 'text-white bg-white/[0.04]'
                          : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'}`}>
                      {opt.label}
                      {sortBy === opt.id && (
                        <svg className={`w-3 h-3 transition-transform
                          ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-white/[0.06]
                          rounded-lg overflow-hidden flex-shrink-0">
            {['list', 'grid'].map(mode => (
              <button key={mode} onClick={() => onViewModeChange(mode)}
                className={`p-1.5 transition-colors
                  ${viewMode === mode ? 'bg-white/[0.08] text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                {mode === 'list' ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5
                         6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0
                         01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016
                         13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0
                         01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5
                         6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25
                         6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0
                         01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25
                         2.25 0 012.25 2.25V18A2.25 2.25 0 0118
                         20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Desktop Filter Dropdown ──────────────────────────────────

function DesktopFilterDropdown({ tags, typeFilter, onTypeChange, tagFilter, onTagChange, activeFilterCount, onClear }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
      className="absolute left-0 top-full mt-1 w-56 bg-[#111]
                 border border-gray-800/60 rounded-xl shadow-2xl z-20 p-3 space-y-3">
      <div>
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Type</span>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {TYPE_OPTIONS.map(t => (
            <button key={t.id} onClick={() => onTypeChange(t.id)}
              className={`px-2 py-1 text-[11px] rounded-md border transition-colors
                ${typeFilter === t.id
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'text-gray-400 border-white/[0.06] hover:bg-white/[0.04]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tags?.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tags</span>
          <div className="flex flex-wrap gap-1 mt-1.5 max-h-32 overflow-y-auto">
            {tags.map(tag => {
              const sel = tagFilter.includes(tag.id);
              return (
                <button key={tag.id}
                  onClick={() => onTagChange(sel ? tagFilter.filter(t => t !== tag.id) : [...tagFilter, tag.id])}
                  className={`px-2 py-1 text-[11px] rounded-md border transition-colors
                    ${sel ? 'bg-primary/10 text-primary border-primary/20'
                      : 'text-gray-400 border-white/[0.06] hover:bg-white/[0.04]'}`}>
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {activeFilterCount > 0 && (
        <button onClick={onClear}
          className="w-full text-[11px] text-gray-500 hover:text-gray-300 py-1 transition-colors">
          Clear all filters
        </button>
      )}
    </motion.div>
  );
}