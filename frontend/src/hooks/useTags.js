// src/hooks/useTags.js

import { useCallback } from 'react';
import { useCachedData, KEYS, STALE_TIMES } from '../cache';
import TagsService from '../services/tags.service';

export function useTags() {
  const fetcher = useCallback(async () => {
    const result = await TagsService.getTags();
    if (!result.success) throw new Error('Failed to load tags');
    return result.data;
  }, []);

  return useCachedData(KEYS.TAGS, fetcher, { staleTime: STALE_TIMES.TAGS });
}