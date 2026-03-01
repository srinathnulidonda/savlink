// src/dashboard/components/links/useLinkContextMenu.jsx
import { useCallback } from 'react';
import {
  IconExternal, IconCopy, IconLink, IconCode,
  IconStar, IconPin, IconArchive, IconCheckCircle, IconTrash,
} from '../common/Icons';
import {
  copyLinkUrl, copyShortUrl, copyMarkdown, openInNewTab,
  starLabel, pinLabel, archiveLabel, confirmDelete,
} from './linkHelpers';
export function useLinkContextMenu({ onPin, onStar, onArchive, onDelete, onSelect }) {
  const getMenuItems = useCallback((link) => {
    if (!link) return [];

    return [
      {
        id: 'open', label: 'Open in new tab', shortcut: '↵',
        icon: <IconExternal />,
        action: () => openInNewTab(link),
      },
      { type: 'divider' },
      {
        id: 'copy-url', label: 'Copy URL', shortcut: '⌘C',
        icon: <IconCopy />,
        action: () => copyLinkUrl(link),
      },
      ...(link.short_url ? [{
        id: 'copy-short', label: 'Copy short URL',
        icon: <IconLink />,
        action: () => copyShortUrl(link),
      }] : []),
      {
        id: 'copy-md', label: 'Copy as Markdown',
        icon: <IconCode />,
        action: () => copyMarkdown(link),
      },
      { type: 'divider' },
      {
        id: 'star', label: starLabel(link), shortcut: 'S',
        active: !!link.starred,
        icon: <IconStar filled={link.starred} />,
        action: () => onStar?.(),
      },
      {
        id: 'pin', label: pinLabel(link), shortcut: 'P',
        active: !!link.pinned,
        icon: <IconPin filled={link.pinned} />,
        action: () => onPin?.(),
      },
      {
        id: 'archive', label: archiveLabel(link), shortcut: 'E',
        icon: <IconArchive />,
        action: () => onArchive?.(),
      },
      {
        id: 'select', label: 'Select', shortcut: 'X',
        icon: <IconCheckCircle />,
        action: () => onSelect?.(),
      },
      { type: 'divider' },
      {
        id: 'delete', label: 'Delete', shortcut: '⌫', danger: true,
        icon: <IconTrash />,
        action: () => { if (confirmDelete(link)) onDelete?.(); },
      },
    ];
  }, [onPin, onStar, onArchive, onDelete, onSelect]);

  return { getMenuItems };
}