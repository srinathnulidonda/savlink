// src/dashboard/components/links/LinkDetails.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { resolveDomain, resolveFavicon, formatUrl, timeAgo } from './LinkMeta';
import toast from 'react-hot-toast';

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
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied');
      setTimeout(() => setCopiedField(null), 2000);
    } catch { toast.error('Copy failed'); }
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

  const handleDelete = useCallback(() => { if (window.confirm('Delete this link?')) onDelete?.(link.id); }, [link.id, onDelete]);
  const openLink = useCallback(() => { window.open(link.original_url, '_blank', 'noopener,noreferrer'); }, [link.original_url]);

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }} animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex-shrink-0 border-l border-white/[0.06] bg-[#09090b] overflow-hidden"
    >
      <div className="h-full flex flex-col w-[400px]">
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
              {favicon && !faviconErr
                ? <img src={favicon} alt="" className="w-4 h-4" onError={() => setFaviconErr(true)} />
                : <span className="text-[9px] font-bold text-gray-600 uppercase">{domain?.[0]}</span>}
            </div>
            <span className="text-[13px] text-gray-400 truncate">{domain}</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <HBtn onClick={openLink} title="Open"><ExternalI /></HBtn>
            <HBtn onClick={() => copy(link.original_url, 'url')} title="Copy URL">
              {copiedField === 'url' ? <CheckI /> : <CopyI />}
            </HBtn>
            <div className="w-px h-4 bg-white/[0.06] mx-1" />
            <HBtn onClick={onClose} title="Close"><CloseI /></HBtn>
          </div>
        </div>

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
                <Pencil />
              </h2>
            )}

            {link.description && (
              <p className="text-[12px] text-gray-500 mt-1.5 line-clamp-2">{link.description}</p>
            )}

            <p className="text-[11px] text-gray-600 font-mono mt-1 truncate">{formatUrl(link.original_url)}</p>
          </div>

          <Div />

          <div className="px-5 py-3 flex flex-wrap gap-1.5">
            <CopyPill label="Copy URL" copied={copiedField === 'url'} onClick={() => copy(link.original_url, 'url')} />
            {link.short_url && <CopyPill label="Short URL" copied={copiedField === 'short'} onClick={() => copy(link.short_url, 'short')} highlight />}
            <CopyPill label="Markdown" copied={copiedField === 'md'} onClick={() => copy(`[${link.title || link.original_url}](${link.original_url})`, 'md')} />
          </div>

          <Div />

          <div className="px-5 py-3">
            <Sec>Properties</Sec>
            <div className="mt-1">
              <Row label="Domain">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-3.5 h-3.5 rounded bg-white/[0.04] flex items-center justify-center overflow-hidden">
                    {favicon && !faviconErr
                      ? <img src={favicon} alt="" className="w-2.5 h-2.5" onError={() => setFaviconErr(true)} />
                      : <span className="text-[6px] font-bold text-gray-600 uppercase">{domain?.[0]}</span>}
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
                  <StarRI filled={link.starred} />
                  <span className={link.starred ? 'text-amber-400' : 'text-gray-500'}>{link.starred ? 'Yes' : 'No'}</span>
                </button>
              </Row>
              <Row label="Pinned">
                <button onClick={onPin} className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
                  <PinRI filled={link.pinned} />
                  <span className={link.pinned ? 'text-blue-400' : 'text-gray-500'}>{link.pinned ? 'Yes' : 'No'}</span>
                </button>
              </Row>
            </div>
          </div>

          <Div />

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
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Add a note…
                    </p>}
                <Pencil className="mt-0.5" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-white/[0.05] p-3 space-y-2">
          <button onClick={openLink} className="w-full h-9 flex items-center justify-center gap-2 text-[13px] font-medium text-white bg-primary hover:bg-primary-light rounded-lg transition-colors">
            <ExternalI /> Open link
          </button>
          <div className="grid grid-cols-2 gap-2">
            <ABtn onClick={onStar}><StarRI filled={link.starred} size={14} /> {link.starred ? 'Unstar' : 'Star'}</ABtn>
            <ABtn onClick={onPin}><PinRI filled={link.pinned} size={14} /> {link.pinned ? 'Unpin' : 'Pin'}</ABtn>
          </div>
          <ABtn onClick={onArchive} full><ArchiveI /> {link.archived ? 'Restore' : 'Archive'}</ABtn>
          <button onClick={handleDelete} className="w-full h-8 flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-colors">
            <TrashI /> Delete
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
      {copied ? <CheckI /> : <CopyI />} {copied ? 'Copied' : label}
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
function Pencil({ className = '' }) {
  return <svg className={`inline w-3 h-3 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 align-middle ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>;
}
function ExternalI() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>; }
function CopyI() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>; }
function CheckI() { return <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>; }
function CloseI() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>; }
function ArchiveI() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>; }
function TrashI() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>; }
function StarRI({ filled, size = 14 }) {
  return <svg style={{ width: size, height: size }} className={filled ? 'text-amber-400' : 'text-gray-600'} fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>;
}
function PinRI({ filled, size = 14 }) {
  return <svg style={{ width: size, height: size }} className={filled ? 'text-blue-400' : 'text-gray-600'} viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={1}><path d="M4.146.146A.5.5 0 014.5 0h7a.5.5 0 01.5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 01-.5.5h-4v4.5a.5.5 0 01-1 0V10h-4A.5.5 0 013 9.5c0-.973.64-1.725 1.17-2.189A5.92 5.92 0 015 6.708V2.277a2.77 2.77 0 01-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 01.146-.354z" /></svg>;
}