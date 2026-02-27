// src/dashboard/components/links/LinkCard.jsx
import { memo, useCallback, useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useContextMenu } from '../common/ContextMenu';
import { useLinkContextMenu } from './useLinkContextMenu';
import { resolveDomain, resolveFavicon, formatUrl, timeAgo } from './LinkMeta';
import LinkActions from './LinkActions';

const LinkCard = memo(forwardRef(function LinkCard({
  link, index, viewMode, isSelected, isActive, isFocused,
  isSelectMode, onHover, onClick, onSelect, onSelectById,
  onPin, onStar, onArchive, onDelete,
}, ref) {
  const [faviconError, setFaviconError] = useState(false);

  const contextMenu = useContextMenu();
  const { getMenuItems } = useLinkContextMenu({ onPin, onStar, onArchive, onDelete, onSelect: () => onSelectById?.(link.id) });

  const domain = resolveDomain(link);
  const faviconUrl = resolveFavicon(link);
  const displayUrl = formatUrl(link.original_url);
  const time = link.relative_time || timeAgo(link.created_at);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!contextMenu?.open) return;
    contextMenu.open(e, getMenuItems(link), { linkId: link.id });
  }, [contextMenu, getMenuItems, link]);

  const handleCheckbox = useCallback((e) => { e.stopPropagation(); onSelect?.(e); }, [onSelect]);

  const [longPressTimer, setLongPressTimer] = useState(null);
  const handleTouchStart = useCallback(() => {
    const timer = setTimeout(() => onSelectById?.(link.id), 500);
    setLongPressTimer(timer);
  }, [link.id, onSelectById]);
  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
  }, [longPressTimer]);

  const FaviconImg = ({ className = '' }) => (
    <div className={`rounded-lg bg-white/[0.04] border border-white/[0.04]
      flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}>
      {faviconUrl && !faviconError ? (
        <img src={faviconUrl} alt="" className="w-4 h-4 sm:w-5 sm:h-5"
          onError={() => setFaviconError(true)} loading="lazy" draggable={false} />
      ) : (
        <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">
          {domain?.[0] || '?'}
        </span>
      )}
    </div>
  );

  if (viewMode === 'list') {
    return (
      <motion.div ref={ref} layout
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.12 }}
        onClick={onClick} onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
        onMouseEnter={() => onHover?.(link.id)} onMouseLeave={() => onHover?.(null)}
        role="option" aria-selected={isSelected || isActive}
        className={`group flex items-center cursor-pointer select-none transition-colors duration-75 touch-manipulation
          gap-2 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg
          ${isFocused ? 'ring-1 ring-primary/30' : ''}
          ${isActive ? 'bg-primary/[0.06]' : isSelected ? 'bg-blue-500/[0.05]' : 'hover:bg-white/[0.02] active:bg-white/[0.04]'}`}
        style={{ paddingLeft: 'max(env(safe-area-inset-left, 0px), 0.625rem)', paddingRight: 'max(env(safe-area-inset-right, 0px), 0.625rem)' }}
      >
        <div className={`flex-shrink-0 transition-all duration-150
          ${isSelectMode || isSelected ? 'w-4 opacity-100' : 'w-0 overflow-hidden opacity-0 sm:w-4 sm:group-hover:opacity-50'}`}>
          <Checkbox checked={isSelected} onClick={handleCheckbox} />
        </div>
        <FaviconImg className="w-7 h-7 sm:w-8 sm:h-8" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[12px] sm:text-[13px] font-medium text-gray-200 truncate group-hover:text-white transition-colors">
              {link.title || 'Untitled'}
            </span>
            {link.starred && <StarBadge />}
            {link.pinned && <PinBadge />}
            {link.link_type === 'shortened' && (
              <span className="text-[8px] sm:text-[9px] font-medium text-primary/80 bg-primary/10 px-1 py-px rounded flex-shrink-0">SHORT</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] sm:text-[11px] text-gray-600 truncate">{displayUrl}</span>
            <span className="text-[10px] text-gray-700 flex-shrink-0 sm:hidden">· {time}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 md:gap-4 flex-shrink-0">
          {link.tags?.length > 0 && (
            <div className="hidden md:flex gap-1">
              {link.tags.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}
              {link.tags.length > 2 && <span className="text-[10px] text-gray-600">+{link.tags.length - 2}</span>}
            </div>
          )}
          {link.click_count > 0 && (
            <span className="text-[11px] text-gray-500 tabular-nums min-w-[28px] text-right hidden lg:block">{link.click_count}</span>
          )}
          <span className="text-[11px] text-gray-600 tabular-nums min-w-[32px] text-right">{time}</span>
        </div>
        <div className="flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <LinkActions link={link} onPin={onPin} onStar={onStar} onArchive={onArchive} onDelete={onDelete} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div ref={ref} layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
      onClick={onClick} onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
      onMouseEnter={() => onHover?.(link.id)} onMouseLeave={() => onHover?.(null)}
      role="option" aria-selected={isSelected || isActive}
      className={`group relative rounded-xl cursor-pointer select-none transition-all duration-100 touch-manipulation
        ${isFocused ? 'ring-2 ring-primary/30' : ''}
        ${isActive ? 'ring-1 ring-primary/20 bg-white/[0.03]'
          : isSelected ? 'ring-1 ring-blue-500/20 bg-white/[0.02]'
          : 'border border-white/[0.05] hover:border-white/[0.08] hover:bg-white/[0.015] active:bg-white/[0.03]'}`}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5 sm:px-4 sm:pt-4 sm:pb-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <FaviconImg className="w-8 h-8 sm:w-9 sm:h-9" />
          <div className="min-w-0">
            <span className="text-[11px] sm:text-[12px] font-medium text-gray-400 truncate block">{domain}</span>
            <span className="text-[10px] sm:text-[11px] text-gray-600 tabular-nums">{time}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {link.starred && <StarBadge />}
          {link.pinned && <PinBadge />}
          <div className={`flex-shrink-0 transition-all duration-150
            ${isSelectMode || isSelected ? 'w-4 opacity-100' : 'w-0 overflow-hidden opacity-0 sm:w-4 sm:group-hover:opacity-50'}`}>
            <Checkbox checked={isSelected} onClick={handleCheckbox} />
          </div>
          <div className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <LinkActions link={link} onPin={onPin} onStar={onStar} onArchive={onArchive} onDelete={onDelete} />
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 mt-0.5 sm:mt-1">
        <h3 className="text-[13px] sm:text-[14px] font-medium text-gray-100 leading-snug line-clamp-2 group-hover:text-white transition-colors">
          {link.title || 'Untitled'}
        </h3>
      </div>

      <div className="px-3 sm:px-4 mt-1">
        <p className="text-[10px] sm:text-[11px] text-gray-600 truncate font-mono">{displayUrl}</p>
      </div>

      {link.description && !link.notes_preview && (
        <div className="px-3 sm:px-4 mt-1.5 sm:mt-2">
          <p className="text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{link.description}</p>
        </div>
      )}

      {link.notes_preview && (
        <div className="px-3 sm:px-4 mt-1.5 sm:mt-2">
          <p className="text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{link.notes_preview}</p>
        </div>
      )}

      <div className="px-3 sm:px-4 pt-2.5 pb-3 sm:pt-3 sm:pb-3.5 mt-2.5 sm:mt-3 border-t border-white/[0.04]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 overflow-hidden">
            {link.tags?.length > 0 ? (
              <>
                {link.tags.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}
                {link.tags.length > 2 && <span className="text-[9px] sm:text-[10px] text-gray-600 flex-shrink-0">+{link.tags.length - 2}</span>}
              </>
            ) : (
              <span className="text-[9px] sm:text-[10px] text-gray-700 italic">No tags</span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {link.click_count > 0 && (
              <span className="text-[10px] sm:text-[11px] text-gray-500 tabular-nums">
                {link.click_count.toLocaleString()}<span className="hidden sm:inline"> clicks</span>
              </span>
            )}
            {link.link_type === 'shortened' && (
              <span className="text-[8px] sm:text-[9px] font-semibold text-primary/70 bg-primary/[0.08] px-1 sm:px-1.5 py-0.5 rounded">SHORT</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}));

export default LinkCard;

function Checkbox({ checked, onClick }) {
  return (
    <div onClick={onClick}
      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all touch-manipulation
        ${checked ? 'bg-primary border-primary' : 'border-gray-700 hover:border-gray-500'}`}>
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

function StarBadge() {
  return (
    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function PinBadge() {
  return (
    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.146.146A.5.5 0 014.5 0h7a.5.5 0 01.5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 01-.5.5h-4v4.5a.5.5 0 01-1 0V10h-4A.5.5 0 013 9.5c0-.973.64-1.725 1.17-2.189A5.92 5.92 0 015 6.708V2.277a2.77 2.77 0 01-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 01.146-.354z" />
    </svg>
  );
}

function Tag({ children }) {
  return (
    <span className="text-[9px] sm:text-[10px] text-gray-400 bg-white/[0.04] border border-white/[0.06] px-1 sm:px-1.5 py-0.5 rounded-md truncate max-w-[60px] sm:max-w-[72px]">
      {children}
    </span>
  );
}