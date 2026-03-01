// src/dashboard/pages/myfiles/useMyFiles.js

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import FoldersService from '../../../services/folders.service';
import LinksService from '../../../services/links.service';
import { cache, KEYS, STALE_TIMES } from '../../../cache';
import { invalidateFolders, invalidateHome } from '../../../cache';
import toast from 'react-hot-toast';

function rootKey(sort, order, type, tags, search) {
  return KEYS.ROOT_ITEMS + `:${sort}:${order}:${type}:${tags}:${search || ''}`;
}

export function useMyFiles() {
  const [folders, setFolders] = useState([]);
  const [links, setLinks] = useState([]);
  const [meta, setMeta] = useState({ has_more: false, next_cursor: null, total: 0 });
  const [stats, setStats] = useState({ total_folders: 0, total_links: 0, root_folders: 0, unassigned_links: 0 });
  const [loading, setLoading] = useState(true);
  const [linksLoading, setLinksLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [typeFilter, setTypeFilter] = useState('');
  const [tagFilter, setTagFilter] = useState([]);

  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ═══ On mount or filter change — cache-first fetch ═══
  useEffect(() => {
    const tagStr = tagFilter.join(',');
    const cacheKey = rootKey(sortBy, sortOrder, typeFilter, tagStr, searchQuery);
    const cached = cache.get(cacheKey);

    if (cached && !initializedRef.current) {
      // First mount with cache → instant render
      _applyRootData(cached);
      setLoading(false);
      initializedRef.current = true;

      if (cache.isStale(cacheKey, STALE_TIMES.ROOT_ITEMS)) {
        fetchRoot(true, false);
      }
    } else if (cached) {
      // Filter changed with cache → instant render + background refresh
      _applyRootData(cached);
      if (cache.isStale(cacheKey, STALE_TIMES.ROOT_ITEMS)) {
        fetchRoot(true, false);
      }
    } else {
      // No cache — show loading only on first mount
      fetchRoot(true, !initializedRef.current);
      initializedRef.current = true;
    }
  }, [searchQuery, sortBy, sortOrder, typeFilter, tagFilter]);

  function _applyRootData(d) {
    setFolders(d.folders || []);
    setLinks(d.links || []);
    setMeta({
      has_more: d.meta?.has_more || false,
      next_cursor: d.meta?.next_cursor || null,
      total: d.meta?.total ?? 0,
    });
    setStats(d.stats || {});
  }

  const fetchRoot = useCallback(async (reset = true, showLoading = true) => {
    const id = ++fetchIdRef.current;
    if (showLoading) setLoading(true);
    if (!reset) setLinksLoading(true);

    try {
      const params = { sort: sortBy, order: sortOrder, limit: 30 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (typeFilter) params.type = typeFilter;
      if (tagFilter.length > 0) params.tag_ids = tagFilter.join(',');
      if (!reset && meta.next_cursor) params.cursor = meta.next_cursor;

      const result = await FoldersService.getRootItems(params);
      if (!mountedRef.current || id !== fetchIdRef.current) return;

      if (result.success) {
        const d = result.data;
        if (reset) {
          _applyRootData(d);

          // Cache the first page
          const tagStr = tagFilter.join(',');
          cache.set(rootKey(sortBy, sortOrder, typeFilter, tagStr, searchQuery), d);
        } else {
          setLinks(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const deduped = (d.links || []).filter(l => !existingIds.has(l.id));
            return [...prev, ...deduped];
          });
          setMeta({
            has_more: d.meta?.has_more || false,
            next_cursor: d.meta?.next_cursor || null,
            total: d.meta?.total ?? 0,
          });
          setStats(d.stats || {});
        }
      }
    } finally {
      if (mountedRef.current && id === fetchIdRef.current) {
        setLoading(false);
        setLinksLoading(false);
      }
    }
  }, [searchQuery, sortBy, sortOrder, typeFilter, tagFilter, meta.next_cursor]);

  const loadMore = useCallback(() => {
    if (!meta.has_more || linksLoading) return;
    fetchRoot(false, false);
  }, [fetchRoot, meta.has_more, linksLoading]);

  const refresh = useCallback(() => {
    invalidateHome();
    invalidateFolders();
    cache.dropByPrefix(KEYS.ROOT_ITEMS);
    fetchRoot(true, false);  // ← No skeleton on refresh
  }, [fetchRoot]);

  const updateLink = useCallback(async (linkId, updates) => {
    const result = await LinksService.updateLink(linkId, updates);
    if (result?.success && result?.data) {
      setLinks(prev => prev.map(l => l.id === linkId ? result.data : l));
      cache.dropByPrefix(KEYS.ROOT_ITEMS);
      toast.success('Updated');
    }
  }, []);

  const deleteLink = useCallback(async (linkId) => {
    const prev = links;
    setLinks(p => p.filter(l => l.id !== linkId));
    const result = await LinksService.deleteLink(linkId);
    if (result.success) {
      toast.success('Deleted');
      cache.dropByPrefix(KEYS.ROOT_ITEMS);
    } else {
      setLinks(prev);
      toast.error(result.error);
    }
  }, [links]);

  const pinLink = useCallback(async (linkId) => {
    const link = links.find(l => l.id === linkId);
    // Optimistic
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, pinned: !l.pinned } : l));

    const result = link?.pinned
      ? await LinksService.unpinLink(linkId)
      : await LinksService.pinLink(linkId);

    if (result.success) {
      cache.dropByPrefix(KEYS.ROOT_ITEMS);
      toast.success(link?.pinned ? 'Unpinned' : 'Pinned');
    } else {
      // Rollback
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, pinned: link.pinned } : l));
    }
  }, [links]);

  const starLink = useCallback(async (linkId) => {
    const link = links.find(l => l.id === linkId);
    // Optimistic
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, starred: !l.starred } : l));

    const result = link?.starred
      ? await LinksService.unstarLink(linkId)
      : await LinksService.starLink(linkId);

    if (result.success) {
      cache.dropByPrefix(KEYS.ROOT_ITEMS);
      toast.success(link?.starred ? 'Unstarred' : 'Starred');
    } else {
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, starred: link.starred } : l));
    }
  }, [links]);

  const archiveLink = useCallback(async (linkId) => {
    const prev = links;
    setLinks(p => p.filter(l => l.id !== linkId));
    const link = prev.find(l => l.id === linkId);
    const result = link?.archived
      ? await LinksService.restoreLink(linkId)
      : await LinksService.archiveLink(linkId);
    if (result.success) {
      toast.success(link?.archived ? 'Restored' : 'Archived');
      cache.dropByPrefix(KEYS.ROOT_ITEMS);
    } else {
      setLinks(prev);
      toast.error(result.error);
    }
  }, [links]);

  const deleteFolder = useCallback(async (folderId) => {
    if (!window.confirm('Delete this folder? Links inside will be unassigned.')) return;
    const result = await FoldersService.deleteFolder(folderId);
    if (result.success) { toast.success('Folder deleted'); refresh(); }
    else toast.error(result.error || 'Delete failed');
  }, [refresh]);

  const bulkDelete = useCallback(async (ids) => {
    if (!window.confirm(`Delete ${ids.length} items?`)) return false;
    const result = await LinksService.bulkDelete(ids);
    if (result.success) { toast.success('Deleted'); refresh(); return true; }
    toast.error(result.error); return false;
  }, [refresh]);

  const bulkArchive = useCallback(async (ids) => {
    const result = await LinksService.bulkArchive(ids);
    if (result.success) { toast.success('Archived'); refresh(); return true; }
    toast.error(result.error); return false;
  }, [refresh]);

  const bulkMove = useCallback(async (ids, folderId) => {
    let ok = 0;
    for (const id of ids) {
      const r = await LinksService.moveToFolder(id, folderId);
      if (r.success) ok++;
    }
    if (ok > 0) { toast.success(`Moved ${ok} links`); refresh(); return true; }
    return false;
  }, [refresh]);

  return {
    folders, links, meta, stats, loading, linksLoading,
    searchQuery, setSearchQuery,
    sortBy, setSortBy, sortOrder, setSortOrder,
    typeFilter, setTypeFilter, tagFilter, setTagFilter,
    loadMore, refresh, updateLink, deleteLink, pinLink,
    starLink, archiveLink, deleteFolder,
    bulkDelete, bulkArchive, bulkMove,
  };
}