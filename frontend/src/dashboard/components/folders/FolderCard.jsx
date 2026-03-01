// src/dashboard/components/folders/FolderCard.jsx
import { memo, useCallback, forwardRef, useRef } from 'react';
import { motion } from 'framer-motion';
import { useContextMenu } from '../common/ContextMenu';
import { useFolderContextMenu } from './useFolderContextMenu';
import FolderActions from './FolderActions';
import { IconChevronRight, IconPin } from '../common/Icons';
import FoldersService from '../../../services/folders.service';

function displayIcon(icon) {
  if (!icon) return '📁';
  return icon.length <= 2 ? icon : '📁';
}

const FolderCard = memo(forwardRef(function FolderCard({
  folder, index = 0, viewMode = 'grid', isMobile = false,
  isSelected = false, isFocused = false, isSelectMode = false,
  onClick, onSelect, onSelectById,
  onOpen, onRename, onTogglePin, onDelete, onProperties,
  onCreateFolder, onAddLink,
}, ref) {
  const color = folder.color || '#6B7280';
  const icon = displayIcon(folder.emoji || folder.icon);
  const prefetchTimer = useRef(null);

  const contextMenu = useContextMenu();
  const { getMenuItems } = useFolderContextMenu({
    onOpen, onRename, onTogglePin, onDelete, onProperties,
    onCreateFolder, onAddLink,
    onSelect: () => onSelectById?.(folder.id),
  });

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.innerWidth < 768) return;
    if (!contextMenu?.open) return;
    contextMenu.open(e, getMenuItems(folder), { folderId: folder.id });
  }, [contextMenu, getMenuItems, folder]);

  const handleCheckbox = useCallback((e) => {
    e.stopPropagation();
    onSelect?.(e);
  }, [onSelect]);

  const handleMouseEnter = useCallback(() => {
    if (isMobile || isSelectMode) return;
    prefetchTimer.current = setTimeout(() => {
      FoldersService.prefetchFolder(folder.slug);
    }, 150);
  }, [folder.slug, isMobile, isSelectMode]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(prefetchTimer.current);
  }, []);

  if (viewMode === 'list') {
    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.12, delay: index * 0.015 }}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="option"
        aria-selected={isSelected}
        className={`
          group flex items-center cursor-pointer select-none
          transition-colors duration-75 touch-manipulation
          gap-2.5 sm:gap-3 rounded-lg
          ${isMobile ? 'px-3 py-3 min-h-[56px]' : 'px-3 py-2.5'}
          ${isFocused ? 'ring-1 ring-primary/30' : ''}
          ${isSelected
            ? 'bg-primary/[0.06]'
            : 'hover:bg-white/[0.02] active:bg-white/[0.04]'}
        `}
      >
        <div className={`
          flex-shrink-0 flex items-center justify-center transition-all duration-150
          ${isSelectMode || isSelected
            ? 'w-5 opacity-100'
            : 'w-0 overflow-hidden opacity-0 sm:w-5 sm:group-hover:opacity-50'}
        `}>
          <Checkbox checked={isSelected} onClick={handleCheckbox} />
        </div>

        <div
          className={`rounded-xl flex items-center justify-center flex-shrink-0
            ${isMobile ? 'w-10 h-10 text-base' : 'w-9 h-9 text-sm'}`}
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-medium text-gray-200 truncate group-hover:text-white transition-colors
              ${isMobile ? 'text-[15px]' : 'text-[13px]'}`}>
              {folder.name}
            </span>
            {folder.pinned && <PinBadge />}
          </div>
          <span className={`text-gray-600 block mt-0.5
            ${isMobile ? 'text-[12px]' : 'text-[11px]'}`}>
            {folder.link_count ?? 0} items
          </span>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <FolderActions
            folder={folder}
            onOpen={onOpen}
            onRename={onRename}
            onTogglePin={onTogglePin}
            onDelete={onDelete}
            onProperties={onProperties}
            onSelect={() => onSelectById?.(folder.id)}
          />
          {!isSelectMode && !isMobile && (
            <IconChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.97 }}
      role="option"
      aria-selected={isSelected}
      className={`
        group relative rounded-xl cursor-pointer select-none
        transition-all duration-150 touch-manipulation overflow-hidden
        ${isFocused ? 'ring-2 ring-primary/30' : ''}
        ${isSelected
          ? 'ring-1 ring-primary/30 bg-primary/[0.04] border border-primary/20'
          : 'border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.02] active:bg-white/[0.04]'}
      `}
    >
      <div className="absolute top-1.5 right-1.5 z-10">
        <FolderActions
          folder={folder}
          onOpen={onOpen}
          onRename={onRename}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
          onProperties={onProperties}
          onSelect={() => onSelectById?.(folder.id)}
        />
      </div>

      {isSelectMode && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="absolute top-2 left-2.5 z-10"
        >
          <Checkbox checked={isSelected} onClick={handleCheckbox} />
        </motion.div>
      )}

      {folder.pinned && !isSelectMode && (
        <div className="absolute top-2 left-2.5 z-10">
          <PinBadge />
        </div>
      )}

      <div className={`flex flex-col items-center ${isMobile ? 'pt-8 pb-3 px-3' : 'pt-10 pb-3.5 px-3.5'}`}>
        <div
          className={`rounded-xl flex items-center justify-center transition-transform group-hover:scale-105
            ${isMobile ? 'w-11 h-11 text-xl' : 'w-14 h-14 text-2xl'}`}
          style={{ backgroundColor: `${color}12`, border: `1px solid ${color}20` }}
        >
          {icon}
        </div>

        <p className={`font-medium text-gray-200 truncate max-w-full text-center mt-2 group-hover:text-white transition-colors
          ${isMobile ? 'text-[13px]' : 'text-[13px]'}`}>
          {folder.name}
        </p>
        <p className={`text-gray-600 mt-0.5
          ${isMobile ? 'text-[11px]' : 'text-[11px]'}`}>
          {folder.link_count ?? 0} items
        </p>
      </div>
    </motion.div>
  );
}));

export default FolderCard;

function Checkbox({ checked, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        w-4 h-4 rounded border flex items-center justify-center
        flex-shrink-0 cursor-pointer transition-all touch-manipulation
        ${checked ? 'bg-primary border-primary' : 'border-gray-700 hover:border-gray-500'}
      `}
    >
      {checked && (
        <svg
          className="w-2.5 h-2.5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

function PinBadge() {
  return <IconPin className="w-3 h-3 text-primary/70 flex-shrink-0" filled />;
}