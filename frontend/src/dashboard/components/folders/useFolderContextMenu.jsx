// src/dashboard/components/folders/useFolderContextMenu.jsx
import { useCallback } from 'react';
import {
  IconFolderOpen, IconExternal, IconCopy, IconPin,
  IconPencil, IconInfo, IconFolderPlus, IconLink,
  IconShare, IconCheckCircle, IconTrash,
} from '../common/Icons';
import toast from 'react-hot-toast';

export function useFolderContextMenu({
  onOpen, onRename, onTogglePin, onDelete, onProperties,
  onCreateFolder, onAddLink, onSelect,
}) {
  const getMenuItems = useCallback((folder) => {
    if (!folder) return [];

    const folderUrl = `${window.location.origin}/dashboard/myfiles/${folder.slug}`;

    return [
      {
        id: 'open',
        label: 'Open',
        shortcut: '↵',
        icon: <IconFolderOpen />,
        action: () => onOpen?.(),
      },
      {
        id: 'open-tab',
        label: 'Open in new tab',
        icon: <IconExternal />,
        action: () => window.open(`/dashboard/myfiles/${folder.slug}`, '_blank'),
      },
      { type: 'divider' },
      {
        id: 'pin',
        label: folder.pinned ? 'Unpin' : 'Pin',
        shortcut: 'P',
        active: !!folder.pinned,
        icon: <IconPin filled={folder.pinned} />,
        action: () => onTogglePin?.(),
      },
      { type: 'divider' },
      {
        id: 'rename',
        label: 'Rename',
        shortcut: 'F2',
        icon: <IconPencil />,
        action: () => onRename?.(),
      },
      {
        id: 'properties',
        label: 'Properties',
        shortcut: '⌘I',
        icon: <IconInfo />,
        action: () => onProperties?.(),
      },
      { type: 'divider' },
      { type: 'label', label: 'Create' },
      {
        id: 'new-link',
        label: 'New link here',
        shortcut: '⌘N',
        icon: <IconLink />,
        action: () => onAddLink?.(),
      },
      {
        id: 'new-subfolder',
        label: 'New subfolder',
        icon: <IconFolderPlus />,
        action: () => onCreateFolder?.(folder.id),
      },
      { type: 'divider' },
      {
        id: 'copy-url',
        label: 'Copy URL',
        shortcut: '⌘C',
        icon: <IconCopy />,
        action: async () => {
          try {
            await navigator.clipboard.writeText(folderUrl);
            toast.success('URL copied');
          } catch {
            toast.error('Copy failed');
          }
        },
      },
      {
        id: 'share',
        label: 'Share',
        icon: <IconShare />,
        action: async () => {
          try {
            if (navigator.share) {
              await navigator.share({ title: folder.name, url: folderUrl });
            } else {
              await navigator.clipboard.writeText(folderUrl);
              toast.success('URL copied');
            }
          } catch {}
        },
      },
      { type: 'divider' },
      {
        id: 'select',
        label: 'Select',
        shortcut: 'X',
        icon: <IconCheckCircle />,
        action: () => onSelect?.(),
      },
      { type: 'divider' },
      {
        id: 'delete',
        label: 'Delete folder',
        shortcut: '⌫',
        danger: true,
        icon: <IconTrash />,
        action: () => {
          if (window.confirm(`Delete "${folder.name}"? Links inside will be unassigned.`)) {
            onDelete?.();
          }
        },
      },
    ];
  }, [onOpen, onRename, onTogglePin, onDelete, onProperties, onCreateFolder, onAddLink, onSelect]);

  return { getMenuItems };
}