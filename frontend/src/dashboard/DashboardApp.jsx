// src/dashboard/DashboardApp.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import DashboardLayout from './layout/DashboardLayout';
import HomePage from './pages/home/HomePage';
import MyFiles from './pages/myfiles/MyFiles';
import CollectionView from './pages/collections/CollectionView';
import LinksView from './components/links/LinksView';
import AddLinkModal from './modals/AddLink/AddLinkModal';
import CreateFolderModal from './modals/CreateFolder/CreateFolderModal';
import ImportLinksModal from './modals/ImportLinks/ImportLinksModal';
import CommandPalette from './modals/CommandPalette/CommandPalette';
import DashboardService from '../services/dashboard.service';
import LinksService from '../services/links.service';
import { useAuth } from '../auth/context/AuthContext';
import { useOverview } from '../hooks/useOverview';
import { invalidateHome, invalidateFolders } from '../cache';
import toast from 'react-hot-toast';
import apiService from '../utils/api';

function LinksPageWrapper(props) {
  const { filterView } = useParams();
  return <LinksView {...props} view={filterView || 'all'} />;
}

const LINK_ROUTES = ['/links'];
function needsLinks(p) { return LINK_ROUTES.some(r => p.includes(r)); }

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { stats, refetch: refetchOverview } = useOverview();

  const [links, setLinks] = useState([]);
  const [view, setView] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('savlink_view_mode') || 'grid'; } catch { return 'grid'; }
  });

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    try { localStorage.setItem('savlink_view_mode', mode); } catch {}
  }, []);

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  const lastFetchRef = useRef(null);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const key = `${view}|${searchQuery}`;
    if (lastFetchRef.current === key) return;
    lastFetchRef.current = key;
    fetchLinks();
  }, [view, searchQuery]);

  const fetchLinks = useCallback(async () => {
    if (fetchingRef.current || !needsLinks(location.pathname)) {
      setDataLoading(false);
      return;
    }
    fetchingRef.current = true;
    const id = ++fetchIdRef.current;
    try {
      setDataLoading(true);
      const result = await DashboardService.getLinks({ view, search: searchQuery });
      if (mountedRef.current && id === fetchIdRef.current) {
        setLinks(result.data?.links || []);
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current && id === fetchIdRef.current) setDataLoading(false);
    }
  }, [view, searchQuery, location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCommandPaletteOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !e.shiftKey) { e.preventDefault(); setIsAddLinkOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') { e.preventDefault(); openCreateFolder(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); setIsImportOpen(true); }
      if (e.key === 'Escape') { setIsCommandPaletteOpen(false); setIsAddLinkOpen(false); setIsImportOpen(false); setIsCreateFolderOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const refresh = useCallback(() => {
    lastFetchRef.current = null;
    apiService.invalidateCache();
    invalidateHome();
    refetchOverview();
    fetchLinks();
  }, [fetchLinks, refetchOverview]);

  const openCreateFolder = useCallback((parentId = null) => {
    setCreateFolderParentId(parentId);
    setIsCreateFolderOpen(true);
  }, []);

  const handleFolderCreated = useCallback(() => {
    invalidateFolders();
    refetchOverview();
  }, [refetchOverview]);

  const handleLinkAdded = useCallback(() => { setIsAddLinkOpen(false); refresh(); }, [refresh]);
  const handleImportDone = useCallback(() => { setIsImportOpen(false); refresh(); }, [refresh]);

  const handleUpdateLink = async (linkId, updates) => {
    const result = await LinksService.updateLink(linkId, updates);
    if (result?.success && result?.data) {
      setLinks(prev => prev.map(l => l.id === linkId ? result.data : l));
      toast.success('Link updated');
    }
  };

  const handleDeleteLink = async (linkId) => {
    const prev = links;
    setLinks(p => p.filter(l => l.id !== linkId));
    const result = await LinksService.deleteLink(linkId);
    if (result.success) { toast.success('Deleted'); refresh(); }
    else { setLinks(prev); toast.error(result.error); }
  };

  const handlePinLink = async (linkId) => {
    const link = links.find(l => l.id === linkId);
    const result = link?.pinned ? await LinksService.unpinLink(linkId) : await LinksService.pinLink(linkId);
    if (result.success) { toast.success(link?.pinned ? 'Unpinned' : 'Pinned'); refresh(); }
  };

  const handleStarLink = async (linkId) => {
    const link = links.find(l => l.id === linkId);
    const result = link?.starred ? await LinksService.unstarLink(linkId) : await LinksService.starLink(linkId);
    if (result.success) { toast.success(link?.starred ? 'Removed' : 'Starred'); refresh(); }
  };

  const handleArchiveLink = async (linkId) => {
    const prev = links;
    const link = links.find(l => l.id === linkId);
    setLinks(p => p.filter(l => l.id !== linkId));
    const result = link?.archived ? await LinksService.restoreLink(linkId) : await LinksService.archiveLink(linkId);
    if (result.success) { toast.success(link?.archived ? 'Restored' : 'Archived'); refresh(); }
    else { setLinks(prev); toast.error(result.error); }
  };

  const linkViewProps = {
    links, searchQuery, viewMode,
    onUpdateLink: handleUpdateLink, onDeleteLink: handleDeleteLink,
    onPinLink: handlePinLink, onStarLink: handleStarLink,
    onArchiveLink: handleArchiveLink,
    onRefresh: () => setIsAddLinkOpen(true),
    loading: dataLoading,
  };

  return (
    <DashboardLayout
      user={user} stats={stats} activeView={view}
      onViewChange={setView} onSearch={setSearchQuery}
      searchQuery={searchQuery} onAddLink={() => setIsAddLinkOpen(true)}
      onCreateFolder={openCreateFolder}
      onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      viewMode={viewMode} onViewModeChange={handleViewModeChange}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/myfiles" element={
          <MyFiles
            onAddLink={() => setIsAddLinkOpen(true)}
            onCreateFolder={openCreateFolder}
          />
        } />
        <Route path="/myfiles/:slug" element={
          <CollectionView
            viewMode={viewMode}
            onAddLink={() => setIsAddLinkOpen(true)}
            onCreateFolder={openCreateFolder}
          />
        } />
        <Route path="/links/:filterView" element={<LinksPageWrapper {...linkViewProps} />} />
        {/* Legacy redirect */}
        <Route path="/collections/:id" element={<Navigate to="/dashboard/myfiles" replace />} />
        <Route path="/settings" element={<div>Settings</div>} />
        <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
      </Routes>

      <AnimatePresence>
        {isAddLinkOpen && <AddLinkModal isOpen onClose={() => setIsAddLinkOpen(false)} onSubmit={handleLinkAdded} />}
      </AnimatePresence>
      <AnimatePresence>
        {isCreateFolderOpen && (
          <CreateFolderModal isOpen onClose={() => setIsCreateFolderOpen(false)}
            onCreated={handleFolderCreated} parentId={createFolderParentId} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isImportOpen && <ImportLinksModal isOpen onClose={() => setIsImportOpen(false)} onComplete={handleImportDone} />}
      </AnimatePresence>
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <CommandPalette isOpen onClose={() => setIsCommandPaletteOpen(false)}
            onAddLink={() => { setIsCommandPaletteOpen(false); setIsAddLinkOpen(true); }}
            onCreateFolder={() => { setIsCommandPaletteOpen(false); openCreateFolder(); }}
            onImport={() => { setIsCommandPaletteOpen(false); setIsImportOpen(true); }}
            onNavigate={(p) => { setIsCommandPaletteOpen(false); navigate(p); }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}