// src/hooks/useOverview.js

import { useCallback, useMemo } from 'react';
import { useCachedData, KEYS, STALE_TIMES } from '../cache';
import DashboardService from '../services/dashboard.service';

export function useOverview() {
  const fetcher = useCallback(async () => {
    const result = await DashboardService.getOverview();
    if (!result.success) throw new Error(result.error || 'Failed to load');
    return result.data;
  }, []);

  const { data, loading, error, refetch } = useCachedData(
    KEYS.OVERVIEW, fetcher, { staleTime: STALE_TIMES.OVERVIEW }
  );

  const homeData = useMemo(() => {
    if (!data) return null;
    return {
      recentLinks: data.recentLinks,
      pinnedLinks: data.pinnedLinks,
      collections: data.collections,
      activities: data.activities,
      quickAccess: data.quickAccess,
      stats: data.stats,
    };
  }, [data]);

  const folders = useMemo(() => {
    if (!data?.folders) return [];
    return data.folders.map(f => ({
      id: f.id, name: f.name,
      emoji: f.icon || '📁', icon: f.icon,
      color: f.color, pinned: f.pinned || false,
      parent_id: f.parent_id,
      link_count: f.link_count ?? 0,
      position: f.position,
      lastOpened: f.updated_at ? new Date(f.updated_at).getTime() : 0,
      children: f.children || [],
    }));
  }, [data]);

  const tags = useMemo(() => data?.tags || [], [data]);

  const stats = useMemo(() => data?.countsForNav || {
    all: 0, recent: 0, starred: 0, archive: 0,
  }, [data]);

  return { data, homeData, folders, tags, stats, loading, error, refetch };
}