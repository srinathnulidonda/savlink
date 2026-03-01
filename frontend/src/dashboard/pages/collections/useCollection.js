// src/dashboard/pages/collections/useCollection.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import FoldersService from '../../../services/folders.service';
import LinksService from '../../../services/links.service';
import { cache, KEYS, STALE_TIMES } from '../../../cache';
import { invalidateFolders, invalidateHome, invalidateFolderBySlug } from '../../../cache';
import toast from 'react-hot-toast';

function detailKey(slug) {
  return KEYS.FOLDER_DETAIL + slug;
}

function linksKey(slug, sort, order, search) {
  return KEYS.FOLDER_LINKS + `${slug}:${sort}:${order}:${search || ''}`;
}

export function useCollection() {
  const { slug } = useParams();

  const [folder, setFolder] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [children, setChildren] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [stats, setStats] = useState(null);
  const [links, setLinks] = useState([]);
  const [meta, setMeta] = useState({ has_more: false, next_cursor: null, total: null });
  const [loading, setLoading] = useState(true);
  const [linksLoading, setLinksLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  const folderIdRef = useRef(null);
  const prevSlugRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ═══ Slug changed — instant cache restore or single combined fetch ═══
  useEffect(() => {
    if (slug === prevSlugRef.current) return;
    prevSlugRef.current = slug;
    setSearchQuery('');
    setError(null);

    const cachedDetail = cache.get(detailKey(slug));
    const lk = linksKey(slug, sortBy, sortOrder, '');
    const cachedLinks = cache.get(lk);

    if (cachedDetail) {
      // Instant restore — no skeleton
      _applyFolderDetail(cachedDetail);

      if (cachedLinks) {
        setLinks(cachedLinks.links || []);
        setMeta(cachedLinks.meta || { has_more: false, next_cursor: null, total: null });
      }

      setLoading(false);

      // Background refresh if stale
      if (cache.isStale(detailKey(slug), STALE_TIMES.FOLDER_DETAIL)) {
        _fetchFull(false);
      }
    } else {
      // No cache — single combined call
      setLoading(true);
      _resetState();
      _fetchFull(true);
    }
  }, [slug]);

  // ═══ Sort/search changed — cache check then links-only fetch ═══
  useEffect(() => {
    if (!folderIdRef.current) return;

    const lk = linksKey(slug, sortBy, sortOrder, searchQuery);
    const cached = cache.get(lk);

    if (cached && !cache.isStale(lk, STALE_TIMES.FOLDER_LINKS)) {
      setLinks(cached.links || []);
      setMeta(cached.meta || { has_more: false, next_cursor: null, total: null });
    } else if (cached) {
      // Show stale immediately, refresh behind
      setLinks(cached.links || []);
      setMeta(cached.meta || { has_more: false, next_cursor: null, total: null });
      _fetchLinksOnly(true, false);
    } else {
      _fetchLinksOnly(true, true);
    }
  }, [searchQuery, sortBy, sortOrder]);

  function _resetState() {
    setLinks([]);
    setFolder(null);
    setFolderId(null);
    setChildren([]);
    setBreadcrumb([]);
    setStats(null);
    setMeta({ has_more: false, next_cursor: null, total: null });
    folderIdRef.current = null;
  }

  function _applyFolderDetail(data) {
    const f = data.folder;
    setFolder(f);
    setFolderId(f.id);
    folderIdRef.current = f.id;
    setChildren(data.children || []);
    setBreadcrumb(data.breadcrumb || []);
    setStats(data.stats || null);
    setError(null);
  }

  // ═══ Single combined call: folder detail + links ═══
  const _fetchFull = useCallback(async (showLoading) => {
    const fetchId = ++fetchIdRef.current;

    try {
      const result = await FoldersService.getFolderFull(slug, {
        sort: sortBy,
        order: sortOrder,
        limit: 30,
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      });

      if (!mountedRef.current || fetchId !== fetchIdRef.current) return;

      if (!result.success) {
        setError(result.error || 'Folder not found');
        setLoading(false);
        return;
      }

      const d = result.data;

      // Cache folder detail
      const detailData = {
        folder: d.folder,
        children: d.children,
        breadcrumb: d.breadcrumb,
        parent: d.parent,
        stats: d.stats,
      };
      cache.set(detailKey(slug), detailData);
      _applyFolderDetail(detailData);

      // Cache and apply links
      const linksData = d.links || [];
      const metaData = d.links_meta || { has_more: false, next_cursor: null, total: null };

      setLinks(linksData);
      setMeta(metaData);

      const lk = linksKey(slug, sortBy, sortOrder, searchQuery);
      cache.set(lk, { links: linksData, meta: metaData });

    } catch (err) {
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setError(err.message || 'Failed to load folder');
      }
    } finally {
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [slug, sortBy, sortOrder, searchQuery]);

  // ═══ Links-only fetch (for sort/search/pagination) ═══
  const _fetchLinksOnly = useCallback(async (reset = false, showLoading = true) => {
    const id = folderIdRef.current;
    if (!id) return;

    if (showLoading) setLinksLoading(true);

    try {
      const params = { sort: sortBy, order: sortOrder, limit: 30 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (!reset && meta.next_cursor) params.cursor = meta.next_cursor;

      const result = await FoldersService.getFolderLinks(id, params);
      if (!mountedRef.current) return;

      if (result.success) {
        const newLinks = result.data.links || [];
        const newMeta = {
          has_more: result.data.meta?.has_more || false,
          next_cursor: result.data.meta?.next_cursor || null,
          total: result.data.meta?.total ?? null,
        };

        if (reset) {
          setLinks(newLinks);
          setMeta(newMeta);
          cache.set(linksKey(slug, sortBy, sortOrder, searchQuery), {
            links: newLinks,
            meta: newMeta,
          });
        } else {
          setLinks(prev => {
            const ids = new Set(prev.map(l => l.id));
            return [...prev, ...newLinks.filter(l => !ids.has(l.id))];
          });
          setMeta(newMeta);
        }
      }
    } finally {
      if (mountedRef.current) setLinksLoading(false);
    }
  }, [slug, searchQuery, sortBy, sortOrder, meta.next_cursor]);

  const loadMore = useCallback(() => {
    if (!meta.has_more || linksLoading) return;
    _fetchLinksOnly(false, true);
  }, [_fetchLinksOnly, meta.has_more, linksLoading]);

  const refresh = useCallback(() => {
    invalidateHome();
    invalidateFolders();
    invalidateFolderBySlug(slug);
    _fetchFull(false);
  }, [_fetchFull, slug]);

  // ═══ Link mutations (optimistic + cache invalidation) ═══

  const updateLink = useCallback(async (linkId, updates) => {
    const result = await LinksService.updateLink(linkId, updates);
    if (result?.success && result?.data) {
      setLinks(prev => prev.map(l => l.id === linkId ? result.data : l));
      invalidateFolderBySlug(slug);
      toast.success('Updated');
    }
  }, [slug]);

  const deleteLink = useCallback(async (linkId) => {
    const prev = links;
    setLinks(p => p.filter(l => l.id !== linkId));

    const result = await LinksService.deleteLink(linkId);
    if (result.success) {
      toast.success('Deleted');
      invalidateFolderBySlug(slug);
      if (stats) setStats(s => ({ ...s, link_count: Math.max(0, (s.link_count || 0) - 1) }));
    } else {
      setLinks(prev);
      toast.error(result.error);
    }
  }, [links, stats, slug]);

  const pinLink = useCallback(async (linkId) => {
    const link = links.find(l => l.id === linkId);
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, pinned: !l.pinned } : l));

    const result = link?.pinned
      ? await LinksService.unpinLink(linkId)
      : await LinksService.pinLink(linkId);

    if (result.success) {
      invalidateFolderBySlug(slug);
      toast.success(link?.pinned ? 'Unpinned' : 'Pinned');
    } else {
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, pinned: link.pinned } : l));
    }
  }, [links, slug]);

  const starLink = useCallback(async (linkId) => {
    const link = links.find(l => l.id === linkId);
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, starred: !l.starred } : l));

    const result = link?.starred
      ? await LinksService.unstarLink(linkId)
      : await LinksService.starLink(linkId);

    if (result.success) {
      invalidateFolderBySlug(slug);
      toast.success(link?.starred ? 'Unstarred' : 'Starred');
    } else {
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, starred: link.starred } : l));
    }
  }, [links, slug]);

  const archiveLink = useCallback(async (linkId) => {
    const prev = links;
    setLinks(p => p.filter(l => l.id !== linkId));

    const link = prev.find(l => l.id === linkId);
    const result = link?.archived
      ? await LinksService.restoreLink(linkId)
      : await LinksService.archiveLink(linkId);

    if (result.success) {
      toast.success(link?.archived ? 'Restored' : 'Archived');
      invalidateFolderBySlug(slug);
      if (stats) setStats(s => ({ ...s, link_count: Math.max(0, (s.link_count || 0) - 1) }));
    } else {
      setLinks(prev);
      toast.error(result.error);
    }
  }, [links, stats, slug]);

  return {
    slug, folderId, folder, children, breadcrumb, stats,
    links, meta, loading, linksLoading, error,
    searchQuery, setSearchQuery,
    sortBy, setSortBy, sortOrder, setSortOrder,
    loadMore, refresh, updateLink, deleteLink,
    pinLink, starLink, archiveLink,
  };
}