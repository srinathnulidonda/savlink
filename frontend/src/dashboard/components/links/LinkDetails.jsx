// src/dashboard/components/links/LinkDetails.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { resolveDomain, resolveFavicon, formatUrl, timeAgo } from './LinkMeta';
import { copyBestUrl, openInNewTab, starLabel, pinLabel, archiveLabel } from './linkHelpers';
import {
  IconExternal, IconCopy, IconCheck, IconClose,
  IconArchive, IconTrash, IconStar, IconPin, IconPencil,
} from '../common/Icons';

export default function LinkDetails({ link, onClose, onUpdate, onDelete, onPin, onStar, onArchive }) {
  const [copiedField, setCopiedField] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [faviconErr, setFaviconErr] = useState(false);
  const inputRef = useRef(null);

  const domain = resolveDomain(link);
  const favicon = resolveFavicon(link, 64);
  const time = link.relative_time || timeAgo(link.created_at);

  const fullDate = link.created_at
    ? new Date(link.created_at).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : null;

  const copy = useCallback(async (text, field) => {
    const ok = await copyToClipboard(text);
    if (ok) { setCopiedField(field); setTimeout(() => setCopiedField(null), 2000); }
  }, []);

  const startEdit = useCallback((field, value) => { setEditingField(field); setEditValue(value || ''); }, []);

  const saveEdit = useCallback(() => {
    if (!editingField) return;
    const val = editValue.trim();
    if (editingField === 'title' && val !== link.title) onUpdate?.(link.id, { title: val });
    if (editingField === 'notes' && val !== (link.notes || '')) onUpdate?.(link.id, { notes: val });
    setEditingField(null);
  }, [editingField, editValue, link, onUpdate]);

  const cancelEdit = useCallback(() => { setEditingField(null); setEditValue(''); }, []);

  useEffect(() => {
    if (editingField && inputRef.current) { inputRef.current.focus(); inputRef.current.select?.(); }
  }, [editingField]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') editingField ? cancelEdit() : onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingField, cancelEdit, onClose]);

  const handleDelete = useCallback(() => { if (confirmDelete(link)) onDelete?.(link.id); }, [link, onDelete]);

  const FaviconThumb = ({ size = 'w-4 h-4' }) => (
    favicon && !faviconErr
      ? <img src={favicon} alt="" className={size} onError={() => setFaviconErr(true)} />
      : <span className="text-[9px] font-bold text-gray-600 uppercase">{domain?.[0]}</span>
  );

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }} animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex-shrink-0 border-l border-white/[0.06] bg-[#09090b] overflow-hidden"
    >
      <div className="h-full flex flex-col w-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
              <FaviconThumb />
            </div>
            <span className="text-[13px] text-gray-400 truncate">{domain}</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <HBtn onClick={() => openInNewTab(link)} title="Open"><IconExternal /></HBtn>
            <HBtn onClick={() => copy(link.original_url, 'url')} title="Copy URL">
              {copiedField === 'url' ? <IconCheck className="w-3.5 h-3.5 text-emerald-400" /> : <IconCopy className="w-3.5 h-3.5" />}
            </HBtn>
            <div className="w-px h-4 bg-white/[0.06] mx-1" />
            <HBtn onClick={onClose} title="Close"><IconClose /></HBtn>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-4">
            {(link.starred || link.pinned || link.archived || link.link_type === 'shortened') && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {link.starred && <Badge icon="★" label="Starred" color="amber" />}
                {link.pinned && <Badge icon="📌" label="Pinned" color="blue" />}
                {link.archived && <Badge label="Archived" color="gray" />}
                {link.link_type === 'shortened' && <Badge label="Short link" color="blue" />}
              </div>
            )}

            {editingField === 'title' ? (
              <div>
                <input ref={inputRef} type="text" value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  className="w-full text-lg font-semibold text-white bg-transparent outline-none border-b-2 border-primary/40 pb-0.5 placeholder-gray-700 caret-primary"
                  placeholder="Untitled" />
                <p className="text-[10px] text-gray-600 mt-1.5">Enter to save · Esc to cancel</p>
              </div>
            ) : (
              <h2 onClick={() => startEdit('title', link.title)}
                className="text-lg font-semibold text-white leading-snug cursor-text rounded-md -mx-1 px-1 py-0.5 transition-colors hover:bg-white/[0.02] group">
                {link.title || <span className="text-gray-600 italic font-normal">Untitled</span>}
                <IconPencil className="inline w-3 h-3 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 align-middle" />
              </h2>
            )}

            {link.description && (
              <p className="text-[12px] text-gray-500 mt-1.5 line-clamp-2">{link.description}</p>
            )}
            <p className="text-[11px] text-gray-600 font-mono mt-1 truncate">{formatUrl(link.original_url)}</p>
          </div>

          <Div />

          {/* Copy pills */}
          <div className="px-5 py-3 flex flex-wrap gap-1.5">
            <CopyPill label="Copy URL" copied={copiedField === 'url'} onClick={() => copy(link.original_url, 'url')} />
            {link.short_url && <CopyPill label="Short URL" copied={copiedField === 'short'} onClick={() => copy(link.short_url, 'short')} highlight />}
            <CopyPill label="Markdown" copied={copiedField === 'md'} onClick={() => copy(`[${link.title || link.original_url}](${link.original_url})`, 'md')} />
          </div>

          <Div />

          {/* Properties */}
          <div className="px-5 py-3">
            <Sec>Properties</Sec>
            <div className="mt-1">
              <Row label="Domain">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-3.5 h-3.5 rounded bg-white/[0.04] flex items-center justify-center overflow-hidden">
                    <FaviconThumb size="w-2.5 h-2.5" />
                  </span>
                  {domain}
                </span>
              </Row>
              <Row label="Type"><TypeB type={link.link_type} /></Row>
              {link.folder_name && <Row label="Folder"><span className="text-gray-400">📁 {link.folder_name}</span></Row>}
              {link.author && <Row label="Author"><span className="text-gray-400">{link.author}</span></Row>}
              <Row label="Created"><span className="text-gray-400 tabular-nums" title={fullDate || ''}>{fullDate || time || '—'}</span></Row>
              <Row label="Clicks"><span className="text-white font-medium tabular-nums">{(link.click_count || 0).toLocaleString()}</span></Row>
              <Row label="Starred">
                <button onClick={onStar} className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
                  <IconStar className="w-3.5 h-3.5" filled={link.starred} />
                  <span className={link.starred ? 'text-amber-400' : 'text-gray-500'}>{link.starred ? 'Yes' : 'No'}</span>
                </button>
              </Row>
              <Row label="Pinned">
                <button onClick={onPin} className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
                  <IconPin className="w-3.5 h-3.5" filled={link.pinned} />
                  <span className={link.pinned ? 'text-blue-400' : 'text-gray-500'}>{link.pinned ? 'Yes' : 'No'}</span>
                </button>
              </Row>
            </div>
          </div>

          <Div />

          {/* Tags */}
          <div className="px-5 py-3">
            <Sec>Tags</Sec>
            {link.tags?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {link.tags.map((tag) => (
                  <span key={tag} className="text-[11px] text-gray-300 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">{tag}</span>
                ))}
              </div>
            ) : <p className="text-[11px] text-gray-700 mt-2">No tags</p>}
          </div>

          <Div />

          {/* Notes */}
          <div className="px-5 py-3">
            <Sec>Notes</Sec>
            {editingField === 'notes' ? (
              <div className="mt-2">
                <textarea ref={inputRef} value={editValue}
                  onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit}
                  onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(); }}
                  rows={5} placeholder="Write something…"
                  className="w-full text-[13px] text-gray-300 bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2.5 outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15 resize-none placeholder-gray-700 leading-relaxed" />
                <p className="text-[10px] text-gray-600 mt-1">⌘Enter to save · Esc to cancel</p>
              </div>
            ) : (
              <div onClick={() => startEdit('notes', link.notes)}
                className="mt-2 rounded-md -mx-1 px-1 py-1 min-h-[48px] cursor-text transition-colors hover:bg-white/[0.015] group">
                {link.notes
                  ? <p className="text-[13px] text-gray-400 whitespace-pre-wrap leading-relaxed">{link.notes}</p>
                  : <p className="text-[12px] text-gray-700 flex items-center gap-1.5">
                    <IconPlus className="w-3.5 h-3.5" />
                    Add a note…
                  </p>}
                <IconPencil className="inline w-3 h-3 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 align-middle mt-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t border-white/[0.05] p-3 space-y-2">
          <button onClick={() => openInNewTab(link)}
            className="w-full h-9 flex items-center justify-center gap-2 text-[13px] font-medium text-white bg-primary hover:bg-primary-light rounded-lg transition-colors">
            <IconExternal /> Open link
          </button>
          <div className="grid grid-cols-2 gap-2">
            <ABtn onClick={onStar}><IconStar className="w-3.5 h-3.5" filled={link.starred} /> {starLabel(link)}</ABtn>
            <ABtn onClick={onPin}><IconPin className="w-3.5 h-3.5" filled={link.pinned} /> {pinLabel(link)}</ABtn>
          </div>
          <ABtn onClick={onArchive} full><IconArchive className="w-3.5 h-3.5" /> {archiveLabel(link)}</ABtn>
          <button onClick={handleDelete}
            className="w-full h-8 flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-colors">
            <IconTrash className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

function Div() { return <div className="mx-5 border-t border-white/[0.04]" />; }
function Sec({ children }) { return <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider select-none">{children}</h3>; }

function Row({ label, children }) {
  return (
    <div className="flex items-center py-[7px] -mx-1.5 px-1.5 rounded-md hover:bg-white/[0.015] transition-colors">
      <span className="text-[12px] text-gray-600 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 min-w-0 text-[12px] flex items-center truncate">{children}</div>
    </div>
  );
}

function HBtn({ onClick, title, children }) {
  return <button onClick={onClick} title={title} className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-white/[0.04] rounded-md transition-colors">{children}</button>;
}

function CopyPill({ label, copied, onClick, highlight = false }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-all
        ${copied ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : highlight ? 'bg-primary/[0.06] text-primary/70 border-primary/15 hover:bg-primary/[0.1]'
            : 'bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-gray-300 hover:bg-white/[0.04]'}`}>
      {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-400" /> : <IconCopy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function ABtn({ onClick, children, full = false }) {
  return (
    <button onClick={onClick} className={`h-9 flex items-center justify-center gap-1.5 text-[12px] font-medium text-gray-400 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:text-gray-200 rounded-lg transition-colors ${full ? 'w-full' : ''}`}>
      {children}
    </button>
  );
}

function Badge({ icon, label, color }) {
  const c = { amber: 'bg-amber-500/10 text-amber-400 border-amber-500/15', blue: 'bg-blue-500/10 text-blue-400 border-blue-500/15', gray: 'bg-white/[0.04] text-gray-400 border-white/[0.06]' };
  return <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-px rounded border ${c[color]}`}>{icon && <span className="leading-none">{icon}</span>}{label}</span>;
}

function TypeB({ type }) {
  if (type === 'shortened') return <span className="text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-px rounded">Shortened</span>;
  return <span className="text-[11px] text-gray-400 bg-white/[0.04] px-1.5 py-px rounded">Saved</span>;
}

function IconPlus(props) {
  return (
    <svg className={props.className || 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}