// src/dashboard/components/links/MobileLinkSheet.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { resolveDomain, resolveFavicon, formatUrl, timeAgo } from './LinkMeta';
import {
  copyLinkUrl, copyMarkdown, openInNewTab,
  starLabel, pinLabel, archiveLabel, confirmDelete,
} from './linkHelpers';
import { IconExternal, IconCopy, IconStar, IconPin, IconArchive, IconCode, IconTrash } from '../common/Icons';

export default function MobileLinkSheet({ link, onClose, onPin, onStar, onArchive, onDelete }) {
  const [faviconErr, setFaviconErr] = useState(false);

  const domain = resolveDomain(link);
  const favicon = resolveFavicon(link, 64);
  const time = link.relative_time || timeAgo(link.created_at);
  const displayUrl = formatUrl(link.original_url);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 380 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 300) onClose();
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-white/[0.08]
                   rounded-t-2xl overflow-hidden max-h-[85vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/[0.15]" />
        </div>

        <div className="overflow-y-auto overscroll-contain max-h-[calc(85vh-120px)]">
          <div className="px-5 pt-2 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06]
                             flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                {favicon && !faviconErr ? (
                  <img src={favicon} alt="" className="w-6 h-6" onError={() => setFaviconErr(true)} />
                ) : (
                  <span className="text-sm font-bold text-gray-500 uppercase">
                    {domain?.[0] || '?'}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-white leading-snug line-clamp-2">
                  {link.title || 'Untitled'}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-gray-500 truncate">{displayUrl}</span>
                  <span className="text-[11px] text-gray-700">·</span>
                  <span className="text-[11px] text-gray-600 flex-shrink-0 tabular-nums">{time}</span>
                </div>

                {(link.starred || link.pinned || link.archived || link.link_type === 'shortened') && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {link.starred && <Badge color="amber">★ Starred</Badge>}
                    {link.pinned && <Badge color="blue">📌 Pinned</Badge>}
                    {link.archived && <Badge color="gray">Archived</Badge>}
                    {link.link_type === 'shortened' && <Badge color="blue">Short link</Badge>}
                  </div>
                )}
              </div>
            </div>

            {link.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 ml-[52px]">
                {link.tags.map((tag) => (
                  <span key={tag} className="text-[11px] text-gray-300 bg-white/[0.04]
                    border border-white/[0.06] px-2 py-0.5 rounded-md">{tag}</span>
                ))}
              </div>
            )}

            {link.notes && (
              <div className="mt-3 ml-[52px]">
                <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-3">{link.notes}</p>
              </div>
            )}

            {link.click_count > 0 && (
              <div className="mt-3 ml-[52px]">
                <span className="text-[11px] text-gray-500 tabular-nums">
                  {link.click_count.toLocaleString()} clicks
                </span>
              </div>
            )}
          </div>

          <div className="mx-5 border-t border-white/[0.05]" />

          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-2.5">
              <SheetAction icon={<IconExternal />} label="Open link"
                onClick={() => openInNewTab(link)} primary />
              <SheetAction icon={<IconCopy />} label="Copy URL"
                onClick={() => copyLinkUrl(link)} />
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              <SheetAction
                icon={<IconStar filled={link.starred} />}
                label={starLabel(link)} onClick={onStar}
                active={link.starred} activeColor="amber" />
              <SheetAction
                icon={<IconPin filled={link.pinned} />}
                label={pinLabel(link)} onClick={onPin}
                active={link.pinned} activeColor="blue" />
            </div>

            <div className="grid grid-cols-1 gap-2.5 mt-2.5">
              <SheetAction icon={<IconArchive />}
                label={archiveLabel(link)} onClick={onArchive} />
            </div>

            <button onClick={() => copyMarkdown(link)}
              className="w-full mt-2.5 py-2.5 flex items-center justify-center gap-2
                        text-[12px] text-gray-500 bg-white/[0.02] border border-white/[0.05]
                        hover:bg-white/[0.04] active:bg-white/[0.06]
                        rounded-xl transition-colors touch-manipulation">
              <IconCode className="w-3.5 h-3.5" />
              Copy as Markdown
            </button>

            <button
              onClick={() => { if (confirmDelete(link)) onDelete?.(); }}
              className="w-full mt-4 py-2.5 flex items-center justify-center gap-1.5
                        text-[12px] font-medium text-gray-600
                        hover:text-red-400 active:text-red-300
                        hover:bg-red-500/[0.06] active:bg-red-500/[0.1]
                        rounded-xl transition-colors touch-manipulation">
              <IconTrash className="w-3.5 h-3.5" />
              Delete link
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function SheetAction({ icon, label, onClick, primary = false, active = false, activeColor = 'amber' }) {
  const activeStyles = {
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 active:bg-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 active:bg-blue-500/20',
  };

  return (
    <button onClick={onClick}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl
                 text-[13px] font-medium transition-colors touch-manipulation
                 active:scale-[0.97] transform
                 ${primary
          ? 'bg-primary text-white active:bg-primary-light'
          : active
            ? activeStyles[activeColor]
            : 'bg-white/[0.03] text-gray-300 border border-white/[0.06] active:bg-white/[0.06]'
        }`}>
      {icon}
      {label}
    </button>
  );
}

function Badge({ color, children }) {
  const colors = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/15',
    gray: 'bg-white/[0.04] text-gray-400 border-white/[0.06]',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/15',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15',
  };

  return (
    <span className={`inline-flex items-center text-[10px] font-semibold
                     px-1.5 py-px rounded border ${colors[color]}`}>
      {children}
    </span>
  );
}