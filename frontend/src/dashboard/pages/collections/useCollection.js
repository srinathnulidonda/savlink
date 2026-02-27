// src/dashboard/pages/collections/useCollection.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import FoldersService from '../../../services/folders.service';
import LinksService from '../../../services/links.service';
import { invalidateFolders, invalidateHome } from '../../../cache';
import toast from 'react-hot-toast';

export function useCollection() {
  const { id } = useParams();
  const folderId = parseInt(id, 10);

  const [folder, setFolder] = useState(null);
  const [children, setChildren] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [stats, setStats] = useState(null);
  const [links, setLinks] = useState([]);
  const [meta, setMeta] = useState({ has_more: false, next_cursor: null, total: null });
  const [loading, setLoading] = useState(true);
  const [linksLoading, setLinksLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setLinks([]);
    setFolder(null);
    setChildren([]);
    setBreadcrumb([]);
    setStats(null);
    setMeta({ has_more: false, next_cursor: null, total: null });
    setSearchQuery('');
    setError(null);
    setLoading(true);
    fetchFolder();
  }, [folderId]);

  useEffect(() => {
    if (!folder) return;
    fetchLinks(true);
  }, [folderId, searchQuery, sortBy, sortOrder]);

  const fetchFolder = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      const result = await FoldersService.getFolder(folderId);
      if (!mountedRef.current || fetchId !== fetchIdRef.current) return;
      if (!result.success) {
        setError(result.error || 'Folder not found');
        setLoading(false);
        return;
      }
      setFolder(result.data.folder);
      setChildren(result.data.children || []);
      setBreadcrumb(result.data.breadcrumb || []);
      setStats(result.data.stats || null);
      setError(null);
      await fetchLinks(true);
    } catch (err) {
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setError(err.message || 'Failed to load folder');
      }
    } finally {
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [folderId]);

  const fetchLinks = useCallback(async (reset = false) => {
    setLinksLoading(true);
    try {
      const params = {
        sort: sortBy,
        order: sortOrder,
        limit: 30,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (!reset && meta.next_cursor) params.cursor = meta.next_cursor;

      const result = await FoldersService.getFolderLinks(folderId, params);
      if (!mountedRef.current) return;

      if (result.success) {
        const newLinks = result.data.links || [];
        setLinks(prev => reset ? newLinks : [...prev, ...newLinks]);
        setMeta({
          has_more: result.data.meta?.has_more || false,
          next_cursor: result.data.meta?.next_cursor || null,
          total: result.data.meta?.total ?? null,
        });
      }
    } finally {
      if (mountedRef.current) setLinksLoading(false);
    }
  }, [folderId, searchQuery, sortBy, sortOrder, meta.next_cursor]);

  const loadMore = useCallback(() => {
    if (!meta.has_more || linksLoading) return;
    fetchLinks(false);
  }, [fetchLinks, meta.has_more, linksLoading]);

  const refresh = useCallback(() => {
    invalidateHome();
    invalidateFolders();
    fetchFolder();
  }, [fetchFolder]);

  const updateLink = useCallback(async (linkId, updates) => {
    const result = await LinksService.updateLink(linkId, updates);
    if (result?.success && result?.data) {
      setLinks(prev => prev.map(l => l.id === linkId ? result.data : l));
      toast.success('Updated');
    }
  }, []);

  const deleteLink = useCallback(async (linkId) => {
    const prev = links;
    setLinks(p => p.filter(l => l.id !== linkId));
    const result = await LinksService.deleteLink(linkId);
    if (result.success) {
      toast.success('Deleted');
      if (stats) setStats(s => ({ ...s, link_count: Math.max(0, (s.link_count || 0) - 1) }));
    } else {
      setLinks(prev);
      toast.error(result.error);
    }
  }, [links, stats]);

  const pinLink = useCallback(async (linkId) => {
    const link = links.find(l => l.id === linkId);
    const result = link?.pinned
      ? await LinksService.unpinLink(linkId)
      : await LinksService.pinLink(linkId);
    if (result.success) {
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, pinned: !l.pinned } : l));
      toast.success(link?.pinned ? 'Unpinned' : 'Pinned');
    }
  }, [links]);

  const starLink = useCallback(async (linkId) => {
    const link = links.find(l => l.id === linkId);
    const result = link?.starred
      ? await LinksService.unstarLink(linkId)
      : await LinksService.starLink(linkId);
    if (result.success) {
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, starred: !l.starred } : l));
      toast.success(link?.starred ? 'Unstarred' : 'Starred');
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
      if (stats) setStats(s => ({ ...s, link_count: Math.max(0, (s.link_count || 0) - 1) }));
    } else {
      setLinks(prev);
      toast.error(result.error);
    }
  }, [links, stats]);

  return {
    folderId,
    folder,
    children,
    breadcrumb,
    stats,
    links,
    meta,
    loading,
    linksLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    loadMore,
    refresh,
    updateLink,
    deleteLink,
    pinLink,
    starLink,
    archiveLink,
  };
}