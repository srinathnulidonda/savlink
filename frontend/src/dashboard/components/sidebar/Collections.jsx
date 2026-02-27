// src/dashboard/components/sidebar/Collections.jsx
import { useMemo, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useContextMenu } from '../common/ContextMenu';
import FolderPropertiesModal from '../../modals/FolderProperties/FolderPropertiesModal';
import FoldersService from '../../../services/folders.service';
import { useOverview } from '../../../hooks/useOverview';
import toast from 'react-hot-toast';

const MAX_SLOTS = 6;

function displayIcon(icon) {
  if (!icon) return '📁';
  if (icon.length <= 2) return icon;
  return '📁';
}

export default function Collections({
  folders = [], onTogglePin, onToggleStar,
  onAddLink, onCreateFolder, onNavigate,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const contextMenu = useContextMenu();
  const { refetch } = useOverview();

  const [propsFolder, setPropsFolder] = useState(null);
  const [propsOpen, setPropsOpen] = useState(false);

  const displayItems = useMemo(() => {
    const pinned = folders.filter(f => f.pinned).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
    const recent = folders.filter(f => !f.pinned).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
    if (pinned.length > 0) {
      const remaining = Math.max(0, MAX_SLOTS - pinned.length);
      return [
        ...pinned.map(f => ({ ...f, _pinned: true })),
        ...recent.slice(0, remaining).map(f => ({ ...f, _pinned: false })),
      ];
    }
    return recent.slice(0, MAX_SLOTS).map(f => ({ ...f, _pinned: false }));
  }, [folders]);

  const handleClick = (folder) => { navigate(`/dashboard/collections/${folder.id}`); onNavigate?.(); };
  const isActive = (folder) => location.pathname === `/dashboard/collections/${folder.id}`;

  const openProperties = useCallback((folder) => {
    setPropsFolder(folder);
    setPropsOpen(true);
  }, []);

  const handleRename = useCallback(async (folder) => {
    const newName = window.prompt('Rename folder', folder.name);
    if (!newName || newName.trim() === folder.name) return;
    const result = await FoldersService.updateFolder(folder.id, { name: newName.trim() });
    if (result.success) { toast.success('Renamed'); refetch(); }
    else toast.error(result.error || 'Rename failed');
  }, [refetch]);

  const handleDelete = useCallback(async (folder) => {
    if (!window.confirm(`Delete "${folder.name}"? Links inside will be unassigned.`)) return;
    const result = await FoldersService.deleteFolder(folder.id);
    if (result.success) { toast.success('Deleted'); refetch(); }
    else toast.error(result.error || 'Delete failed');
  }, [refetch]);

  const handleContextMenu = useCallback((e, folder) => {
    if (!contextMenu?.open) return;
    const path = `/dashboard/collections/${folder.id}`;
    const url = `${window.location.origin}${path}`;

    contextMenu.open(e, [
      {
        id: 'open', label: 'Open',
        icon: <I d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542" />,
        action: () => { navigate(path); onNavigate?.(); },
      },
      {
        id: 'open-tab', label: 'Open in new tab',
        icon: <I d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />,
        action: () => window.open(url, '_blank'),
      },
      { type: 'divider' },
      {
        id: 'pin', label: folder.pinned ? 'Unpin from sidebar' : 'Pin to sidebar',
        shortcut: 'P', active: !!folder.pinned,
        icon: <PinI filled={folder.pinned} />,
        action: () => onTogglePin?.(folder.id),
      },
      {
        id: 'star', label: folder.starred ? 'Remove from favorites' : 'Add to favorites',
        shortcut: 'S', active: !!folder.starred,
        icon: <StarI filled={folder.starred} />,
        action: () => onToggleStar?.(folder.id),
      },
      { type: 'divider' },
      {
        id: 'rename', label: 'Rename', shortcut: 'F2',
        icon: <I d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />,
        action: () => handleRename(folder),
      },
      {
        id: 'properties', label: 'Properties', shortcut: '⌘I',
        icon: <I d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />,
        action: () => openProperties(folder),
      },
      { type: 'divider' },
      { type: 'label', label: 'Create' },
      {
        id: 'new-link', label: 'New link here', shortcut: '⌘N',
        icon: <I d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />,
        action: () => onAddLink?.(),
      },
      {
        id: 'new-subfolder', label: 'New subfolder',
        icon: <I d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />,
        action: () => onCreateFolder?.(folder.id),
      },
      { type: 'divider' },
      {
        id: 'share', label: 'Share',
        icon: <I d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />,
        action: async () => {
          try {
            if (navigator.share) await navigator.share({ title: folder.name, url });
            else { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
          } catch {}
        },
      },
      {
        id: 'copy-path', label: 'Copy path', shortcut: '⌘C',
        icon: <I d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75" />,
        action: async () => {
          try { await navigator.clipboard.writeText(url); toast.success('Path copied'); }
          catch { toast.error('Copy failed'); }
        },
      },
      { type: 'divider' },
      {
        id: 'delete', label: 'Delete folder', danger: true, shortcut: '⌫',
        icon: <I d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />,
        action: () => handleDelete(folder),
      },
    ], { folderId: folder.id });
  }, [contextMenu, navigate, onNavigate, onTogglePin, onToggleStar, onAddLink, onCreateFolder, openProperties, handleRename, handleDelete]);

  const sectionHeader = (
    <div className="px-5 py-3 flex-shrink-0 flex items-center justify-between">
      <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wider">Collections</span>
      <button
        onClick={() => onCreateFolder?.()}
        className="p-1 text-gray-600 hover:text-gray-400 rounded-md hover:bg-white/[0.04] transition-colors"
        title="New folder"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );

  if (displayItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800/40">
        {sectionHeader}
        <div className="text-center py-10 px-4">
          <div className="w-9 h-9 mx-auto rounded-lg bg-gray-800/30 border border-gray-800/40 flex items-center justify-center mb-2.5">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed mb-3">No folders yet</p>
          <button onClick={() => onCreateFolder?.()}
            className="text-[11px] text-primary hover:text-primary-light font-medium transition-colors">
            Create your first folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800/40">
        {sectionHeader}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800 px-3 pb-2 space-y-0.5">
          {displayItems.map(folder => {
            const active = isActive(folder);
            return (
              <div key={folder.id} role="button" tabIndex={0}
                onClick={() => handleClick(folder)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
                className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition-all group cursor-pointer
                  ${active ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`}>
                <span className={`text-sm flex-shrink-0 transition-transform ${active ? '' : 'opacity-70 group-hover:opacity-100'} group-hover:scale-110`}>
                  {displayIcon(folder.emoji || folder.icon)}
                </span>
                <span className="flex-1 text-left truncate font-medium">{folder.name}</span>
                {folder.link_count > 0 && (
                  <span className="text-[11px] text-gray-700 tabular-nums">{folder.link_count}</span>
                )}
                <PinControl pinned={folder._pinned} onToggle={(e) => { e.stopPropagation(); onTogglePin?.(folder.id); }} />
              </div>
            );
          })}
        </div>
      </div>
      <FolderPropertiesModal
        isOpen={propsOpen}
        onClose={() => { setPropsOpen(false); setPropsFolder(null); }}
        folder={propsFolder}
        onUpdate={refetch}
      />
    </>
  );
}

function PinControl({ pinned, onToggle }) {
  return (
    <span role="button" tabIndex={0} onClick={onToggle}
      className={`flex-shrink-0 p-0.5 rounded transition-all cursor-pointer
        ${pinned ? 'text-primary/60 hover:text-primary' : 'text-gray-700 opacity-0 group-hover:opacity-100 hover:text-gray-400'}`}
      title={pinned ? 'Unpin' : 'Pin to sidebar'}>
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.146.146A.5.5 0 014.5 0h7a.5.5 0 01.5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 01-.5.5h-4v4.5a.5.5 0 01-1 0V10h-4A.5.5 0 013 9.5c0-.973.64-1.725 1.17-2.189A5.92 5.92 0 015 6.708V2.277a2.77 2.77 0 01-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 01.146-.354z" />
      </svg>
    </span>
  );
}

function I({ d }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function PinI({ filled }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={1}>
      <path d="M4.146.146A.5.5 0 014.5 0h7a.5.5 0 01.5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 01-.5.5h-4v4.5a.5.5 0 01-1 0V10h-4A.5.5 0 013 9.5c0-.973.64-1.725 1.17-2.189A5.92 5.92 0 015 6.708V2.277a2.77 2.77 0 01-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 01.146-.354z" />
    </svg>
  );
}

function StarI({ filled }) {
  return (
    <svg className="w-4 h-4" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}