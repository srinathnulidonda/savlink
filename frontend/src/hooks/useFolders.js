// src/hooks/useFolders.js

import { useCallback } from 'react';
import { useCachedData, KEYS, STALE_TIMES } from '../cache';
import FoldersService from '../services/folders.service';

export function useFolders() {
  const fetcher = useCallback(async () => {
    const result = await FoldersService.getFolders();
    if (!result.success) throw new Error('Failed to load folders');
    return result.data.map(f => ({
      id: f.id,
      name: f.name,
      emoji: f.icon || '📁',
      icon: f.icon,
      color: f.color,
      pinned: f.pinned || false,
      starred: false,
      parent_id: f.parent_id,
      link_count: f.link_count ?? 0,
      position: f.position,
      lastOpened: f.updated_at ? new Date(f.updated_at).getTime() : 0,
    }));
  }, []);

  return useCachedData(KEYS.FOLDERS, fetcher, { staleTime: STALE_TIMES.FOLDERS });
}