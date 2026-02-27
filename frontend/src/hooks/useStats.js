// src/hooks/useStats.js

import { useCallback } from 'react';
import { useCachedData, KEYS, STALE_TIMES } from '../cache';
import DashboardService from '../services/dashboard.service';

export function useStats() {
  const fetcher = useCallback(async () => {
    const result = await DashboardService.getStats();
    return result.data?.stats || {};
  }, []);

  return useCachedData(KEYS.STATS, fetcher, { staleTime: STALE_TIMES.STATS });
}