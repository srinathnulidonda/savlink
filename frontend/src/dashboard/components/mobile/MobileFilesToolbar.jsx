// src/dashboard/components/mobile/MobileFilesToolbar.jsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_SORT_FIELDS = [
  { id: 'title',       label: 'Name',          defaultOrder: 'asc' },
  { id: 'updated_at',  label: 'Date modified', defaultOrder: 'desc' },
  { id: 'created_at',  label: 'Date created',  defaultOrder: 'desc' },
  { id: 'click_count', label: 'Most clicked',  defaultOrder: 'desc' },
];

const DEFAULT_DIRECTIONS = {
  title:       { asc: 'A → Z',         desc: 'Z → A' },
  name:        { asc: 'A → Z',         desc: 'Z → A' },
  updated_at:  { asc: 'Oldest first',  desc: 'Newest first' },
  created_at:  { asc: 'Oldest first',  desc: 'Newest first' },
  opened_at:   { asc: 'Oldest first',  desc: 'Newest first' },
  click_count: { asc: 'Fewest clicks', desc: 'Most clicks' },
  expiry:      { asc: 'Soonest first', desc: 'Latest first' },
};

function haptic(ms = 4) {
  try { navigator?.vibrate?.(ms); } catch {}
}

function getDirections(field) {
  if (field.directions) return field.directions;
  return DEFAULT_DIRECTIONS[field.id] || { asc: 'Ascending', desc: 'Descending' };
}

export default function MobileFilesToolbar({
  sortBy = 'title',
  sortOrder = 'asc',
  onSortChange,
  viewMode,
  onViewModeChange,
  sortFields = DEFAULT_SORT_FIELDS,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const popupRef = useRef(null);
  const triggerRef = useRef(null);

  const currentField = sortFields.find(f => f.id === sortBy) || sortFields[0];
  const directions = getDirections(currentField);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setSortOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sortOpen]);

  const handleFieldSelect = useCallback((fieldId) => {
    haptic();
    const field = sortFields.find(f => f.id === fieldId);
    const defaultOrder = field?.defaultOrder || 'asc';
    if (fieldId === sortBy) {
      onSortChange(sortBy, sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      onSortChange(fieldId, defaultOrder);
    }
    setSortOpen(false);
  }, [sortBy, sortOrder, sortFields, onSortChange]);

  const handleDirectionSelect = useCallback((order) => {
    haptic();
    onSortChange(sortBy, order);
    setSortOpen(false);
  }, [sortBy, onSortChange]);

  return (
    <div className="relative flex-shrink-0">
      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center justify-between h-12 px-3
                      border-b border-white/[0.04]">

        {/* Sort trigger */}
        <button
          ref={triggerRef}
          onClick={() => { haptic(); setSortOpen(prev => !prev); }}
          className={`
            flex items-center gap-1 px-1.5 py-1
            rounded-md transition-colors touch-manipulation
            ${sortOpen
              ? 'bg-white/[0.06] text-gray-200'
              : 'text-gray-400 active:bg-white/[0.06]'}
          `}
        >
          <span className="text-[13px] font-medium">
            {currentField.label}
          </span>
          <motion.svg
            className="w-3 h-3 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            animate={{ rotate: sortOrder === 'asc' ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>

        {/* View toggle — minimal */}
        <div className="flex items-center gap-px">
          <ViewBtn
            active={viewMode === 'list'}
            onClick={() => { haptic(); onViewModeChange('list'); }}
            label="List"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </ViewBtn>
          <ViewBtn
            active={viewMode === 'grid'}
            onClick={() => { haptic(); onViewModeChange('grid'); }}
            label="Grid"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24"
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
          </ViewBtn>
        </div>
      </div>

      {/* ═══ Sort Popup ═══ */}
      <AnimatePresence>
        {sortOpen && (
          <>
            <div className="fixed inset-0 z-[99]" onClick={() => setSortOpen(false)} />
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-3 top-full mt-1 z-[100]
                         w-[200px] rounded-xl overflow-hidden
                         border border-white/[0.08] bg-[#1c1c1e]
                         shadow-[0_8px_40px_rgba(0,0,0,0.55),0_2px_12px_rgba(0,0,0,0.3)]"
            >
              {/* Header */}
              <div className="px-3 pt-2.5 pb-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Sort by
                </span>
              </div>

              {/* Fields */}
              <div className="px-1 pb-0.5">
                {sortFields.map((field) => {
                  const isActive = sortBy === field.id;
                  return (
                    <button
                      key={field.id}
                      onClick={() => handleFieldSelect(field.id)}
                      className={`
                        w-full flex items-center gap-2 h-[38px] px-2.5
                        rounded-lg transition-colors touch-manipulation
                        ${isActive ? 'bg-white/[0.06]' : 'active:bg-white/[0.04]'}
                      `}
                    >
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {isActive && (
                          <motion.svg
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </motion.svg>
                        )}
                      </div>
                      <span className={`text-[13px] flex-1 text-left
                        ${isActive ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {field.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="mx-3 border-t border-white/[0.06]" />

              {/* Direction */}
              <div className="px-1 py-1">
                {(['asc', 'desc']).map((order) => {
                  const isActive = sortOrder === order;
                  return (
                    <button
                      key={order}
                      onClick={() => handleDirectionSelect(order)}
                      className={`
                        w-full flex items-center gap-2 h-[38px] px-2.5
                        rounded-lg transition-colors touch-manipulation
                        ${isActive ? 'bg-white/[0.06]' : 'active:bg-white/[0.04]'}
                      `}
                    >
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {isActive && (
                          <motion.svg
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </motion.svg>
                        )}
                      </div>
                      <span className={`text-[13px] flex-1 text-left
                        ${isActive ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {directions[order]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ViewBtn({ active, onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-8 h-8 flex items-center justify-center
        rounded-md transition-colors touch-manipulation
        ${active
          ? 'text-white'
          : 'text-gray-600 active:text-gray-400'}
      `}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}