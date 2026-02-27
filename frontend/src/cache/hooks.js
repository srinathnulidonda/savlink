// src/cache/hooks.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { cache } from './store';

export function useCachedData(key, fetcher, options = {}) {
  const { staleTime = 60_000 } = options;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);
  const dataRef = useRef(null);

  const [data, setData] = useState(() => {
    const cached = cache.get(key);
    dataRef.current = cached;
    return cached;
  });
  const [loading, setLoading] = useState(() => !cache.has(key));
  const [error, setError] = useState(null);

  const fetchFresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      cache.set(key, result);
      dataRef.current = result;
      setData(result);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      if (!dataRef.current) {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    mountedRef.current = true;
    const cached = cache.get(key);

    if (cached) {
      dataRef.current = cached;
      setData(cached);
      setLoading(false);
      if (cache.isStale(key, staleTime)) {
        fetchFresh(false);
      }
    } else {
      fetchFresh(true);
    }

    return () => { mountedRef.current = false; };
  }, [key, staleTime, fetchFresh]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      const shouldRefresh =
        !detail.key && !detail.keys
        || detail.key === key
        || detail.keys?.includes(key);

      if (shouldRefresh) fetchFresh(false);
    };

    window.addEventListener('cache:invalidate', handler);
    return () => window.removeEventListener('cache:invalidate', handler);
  }, [key, fetchFresh]);

  const refetch = useCallback(() => fetchFresh(false), [fetchFresh]);

  return { data, loading, error, refetch };
}