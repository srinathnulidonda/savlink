// src/dashboard/components/sidebar/Collections.jsx
import { useMemo, useCallback, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useContextMenu } from '../common/ContextMenu';
import {
  IconFolderOpen, IconExternal, IconPin, IconStar,
  IconPencil, IconInfo, IconLink, IconFolderPlus,
  IconShare, IconCopy, IconTrash, IconFolder, IconPlus,
} from '../common/Icons';
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
  const prefetchTimers = useRef({});

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

  const folderPath = (f) => `/dashboard/myfiles/${f.slug}`;
  const handleClick = (folder) => { navigate(folderPath(folder)); onNavigate?.(); };
  const isActive = (folder) => location.pathname === folderPath(folder);

  const handleMouseEnter = useCallback((folder) => {
    prefetchTimers.current[folder.id] = setTimeout(() => {
      FoldersService.prefetchFolder(folder.slug);
    }, 200);
  }, []);

  const handleMouseLeave = useCallback((folder) => {
    if (prefetchTimers.current[folder.id]) {
      clearTimeout(prefetchTimers.current[folder.id]);
      delete prefetchTimers.current[folder.id];
    }
  }, []);

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
    const path = folderPath(folder);
    const url = `${window.location.origin}${path}`;

    contextMenu.open(e, [
      {
        id: 'open', label: 'Open',
        icon: <IconFolderOpen />,
        action: () => { navigate(path); onNavigate?.(); },
      },
      {
        id: 'open-tab', label: 'Open in new tab',
        icon: <IconExternal />,
        action: () => window.open(url, '_blank'),
      },
      { type: 'divider' },
      {
        id: 'pin', label: folder.pinned ? 'Unpin' : 'Pin',
        shortcut: 'P', active: !!folder.pinned,
        icon: <IconPin filled={folder.pinned} />,
        action: () => onTogglePin?.(folder.id),
      },
      {
        id: 'star', label: folder.starred ? 'Unstar' : 'Star',
        shortcut: 'S', active: !!folder.starred,
        icon: <IconStar filled={folder.starred} />,
        action: () => onToggleStar?.(folder.id),
      },
      { type: 'divider' },
      {
        id: 'rename', label: 'Rename', shortcut: 'F2',
        icon: <IconPencil />,
        action: () => handleRename(folder),
      },
      {
        id: 'properties', label: 'Properties', shortcut: '⌘I',
        icon: <IconInfo />,
        action: () => openProperties(folder),
      },
      { type: 'divider' },
      { type: 'label', label: 'Create' },
      {
        id: 'new-link', label: 'New link here', shortcut: '⌘N',
        icon: <IconLink />,
        action: () => onAddLink?.(),
      },
      {
        id: 'new-subfolder', label: 'New subfolder',
        icon: <IconFolderPlus />,
        action: () => onCreateFolder?.(folder.id),
      },
      { type: 'divider' },
      {
        id: 'share', label: 'Share',
        icon: <IconShare />,
        action: async () => {
          try {
            if (navigator.share) await navigator.share({ title: folder.name, url });
            else { await navigator.clipboard.writeText(url); toast.success('URL copied'); }
          } catch {}
        },
      },
      {
        id: 'copy-path', label: 'Copy URL', shortcut: '⌘C',
        icon: <IconCopy />,
        action: async () => {
          try { await navigator.clipboard.writeText(url); toast.success('URL copied'); }
          catch { toast.error('Copy failed'); }
        },
      },
      { type: 'divider' },
      {
        id: 'delete', label: 'Delete folder', danger: true, shortcut: '⌫',
        icon: <IconTrash />,
        action: () => handleDelete(folder),
      },
    ], { folderId: folder.id });
  }, [contextMenu, navigate, onNavigate, onTogglePin, onToggleStar, onAddLink, onCreateFolder, openProperties, handleRename, handleDelete]);

  const sectionHeader = (
    <div className="px-5 py-3 flex-shrink-0 flex items-center justify-between">
      <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wider">Folders</span>
      <button onClick={() => onCreateFolder?.()} title="New folder"
        className="p-1 text-gray-600 hover:text-gray-400 rounded-md hover:bg-white/[0.04] transition-colors">
        <IconPlus className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (displayItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800/40">
        {sectionHeader}
        <div className="text-center py-10 px-4">
          <div className="w-9 h-9 mx-auto rounded-lg bg-gray-800/30 border border-gray-800/40 flex items-center justify-center mb-2.5">
            <IconFolder className="w-4 h-4 text-gray-600" />
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
                onMouseEnter={() => handleMouseEnter(folder)}
                onMouseLeave={() => handleMouseLeave(folder)}
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
      title={pinned ? 'Unpin' : 'Pin'}>
      <IconPin className="w-3 h-3" filled={true} />
    </span>
  );
}