// src/dashboard/DashboardApp.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import DashboardLayout from './layout/DashboardLayout';
import HomePage from './pages/home/HomePage';
import MyFiles from './pages/myfiles/MyFiles';
import LinksView from './components/links/LinksView';
import AddLinkModal from './modals/AddLink/AddLinkModal';
import CommandPalette from './modals/CommandPalette/CommandPalette';
import DashboardService from '../services/dashboard.service';
import LinksService from '../services/links.service';
import { useAuth } from '../auth/context/AuthContext';
import toast from 'react-hot-toast';
import apiService from '../utils/api';

// ── LinksPageWrapper ────────────────────────────────────────
function LinksPageWrapper({
    links,
    searchQuery,
    viewMode,
    onUpdateLink,
    onDeleteLink,
    onPinLink,
    onStarLink,
    onArchiveLink,
    onRefresh,
    loading,
}) {
    const { filterView } = useParams();
    const view = filterView || 'all';

    return (
        <LinksView
            links={links}
            view={view}
            searchQuery={searchQuery}
            viewMode={viewMode}
            onUpdateLink={onUpdateLink}
            onDeleteLink={onDeleteLink}
            onPinLink={onPinLink}
            onStarLink={onStarLink}
            onArchiveLink={onArchiveLink}
            onRefresh={onRefresh}
            loading={loading}
        />
    );
}

// ── Main Dashboard ──────────────────────────────────────────
export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [links, setLinks] = useState([]);
    const [stats, setStats] = useState({ all: 0, recent: 0, starred: 0, archive: 0 });
    const [view, setView] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem('savlink_view_mode') || 'grid'; }
        catch { return 'grid'; }
    });

    const handleViewModeChange = useCallback((mode) => {
        setViewMode(mode);
        try { localStorage.setItem('savlink_view_mode', mode); } catch {}
    }, []);

    const fetchingRef = useRef(false);
    const lastFetchParamsRef = useRef({ view: '', searchQuery: '' });

    useEffect(() => {
        if (
            lastFetchParamsRef.current.view === view &&
            lastFetchParamsRef.current.searchQuery === searchQuery
        ) return;
        lastFetchParamsRef.current = { view, searchQuery };
        fetchDashboardData();
    }, [view, searchQuery]);

    const fetchDashboardData = async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        try {
            setDataLoading(true);
            const [linksResult, statsResult] = await Promise.allSettled([
                DashboardService.getLinks({ view, search: searchQuery }),
                DashboardService.getStats(),
            ]);
            if (linksResult.status === 'fulfilled' && linksResult.value?.success) {
                setLinks(linksResult.value.data?.links || []);
            } else { setLinks([]); }
            if (statsResult.status === 'fulfilled' && statsResult.value?.success) {
                const s = statsResult.value.data?.stats;
                if (s) setStats({ all: s.all || 0, recent: s.recent || 0, starred: s.starred || 0, archive: s.archive || 0 });
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error);
        } finally {
            setDataLoading(false);
            fetchingRef.current = false;
        }
    };

    const handleViewChange = (newView) => setView(newView);

    // ── Keyboard shortcuts ──────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCommandPaletteOpen(true); }
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setIsAddLinkOpen(true); }
            if (e.key === 'Escape') { setIsCommandPaletteOpen(false); setIsAddLinkOpen(false); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleLinkAdded = useCallback(() => {
        setIsAddLinkOpen(false);
        lastFetchParamsRef.current = { view: '', searchQuery: '' };
        apiService.invalidateCache();
        fetchDashboardData();
    }, []);

    // ── Link CRUD ───────────────────────────────────────
    const handleUpdateLink = async (linkId, updates) => {
        try {
            const result = await LinksService.updateLink(linkId, updates);
            if (result?.success && result?.data) {
                setLinks(links.map(l => (l.id === linkId ? result.data : l)));
                toast.success('Link updated');
            }
        } catch (error) { toast.error(error.message || 'Failed to update link'); }
    };

    const handleDeleteLink = async (linkId) => {
        try {
            setLinks(links.filter(l => l.id !== linkId));
            await LinksService.deleteLink(linkId);
            toast.success('Link deleted');
            fetchDashboardData();
        } catch (error) { fetchDashboardData(); toast.error(error.message || 'Failed to delete link'); }
    };

    // ── Pin = sidebar / quick-access placement ──────────
    const handlePinLink = async (linkId) => {
        try {
            const link = links.find(l => l.id === linkId);
            if (link?.pinned) {
                await LinksService.unpinLink(linkId);
                toast.success('Link unpinned');
            } else {
                await LinksService.pinLink(linkId);
                toast.success('Link pinned');
            }
            fetchDashboardData();
        } catch (error) { toast.error(error.message || 'Failed to update pin'); }
    };

    // ── Star = favorite ─────────────────────────────────
    const handleStarLink = async (linkId) => {
        try {
            const link = links.find(l => l.id === linkId);
            if (link?.starred) {
                await LinksService.unstarLink(linkId);
                toast.success('Removed from favorites');
            } else {
                await LinksService.starLink(linkId);
                toast.success('Added to favorites');
            }
            fetchDashboardData();
        } catch (error) { toast.error(error.message || 'Failed to update favorite'); }
    };

    const handleArchiveLink = async (linkId) => {
        try {
            const link = links.find(l => l.id === linkId);
            setLinks(links.filter(l => l.id !== linkId));
            if (link?.archived) {
                await LinksService.restoreLink(linkId);
                toast.success('Link restored');
            } else {
                await LinksService.archiveLink(linkId);
                toast.success('Link archived');
            }
            fetchDashboardData();
        } catch (error) { fetchDashboardData(); toast.error(error.message || 'Failed to archive link'); }
    };

    const linkViewProps = {
        links,
        searchQuery,
        viewMode,
        onUpdateLink: handleUpdateLink,
        onDeleteLink: handleDeleteLink,
        onPinLink: handlePinLink,
        onStarLink: handleStarLink,
        onArchiveLink: handleArchiveLink,
        onRefresh: () => setIsAddLinkOpen(true),
        loading: dataLoading,
    };

    return (
        <DashboardLayout
            user={user}
            stats={stats}
            activeView={view}
            onViewChange={handleViewChange}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
            onAddLink={() => setIsAddLinkOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
        >
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/my-files" element={<MyFiles viewMode={viewMode} />} />
                <Route path="/links/:filterView" element={<LinksPageWrapper {...linkViewProps} />} />
                <Route path="/collections/:id" element={<div>Collection View</div>} />
                <Route path="/settings" element={<div>Settings</div>} />
                <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
            </Routes>

            <AnimatePresence>
                {isAddLinkOpen && (
                    <AddLinkModal
                        isOpen={isAddLinkOpen}
                        onClose={() => setIsAddLinkOpen(false)}
                        onSubmit={handleLinkAdded}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCommandPaletteOpen && (
                    <CommandPalette
                        isOpen={isCommandPaletteOpen}
                        onClose={() => setIsCommandPaletteOpen(false)}
                        onAddLink={() => { setIsCommandPaletteOpen(false); setIsAddLinkOpen(true); }}
                        onNavigate={(path) => { setIsCommandPaletteOpen(false); navigate(path); }}
                    />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}