// src/dashboard/DashboardApp.jsx

import { useState, useEffect, useRef } from 'react';
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

// Wrapper component to extract view from URL params
function LinksPageWrapper({ links, searchQuery, onUpdateLink, onDeleteLink, onPinLink, onArchiveLink, onRefresh, loading }) {
    const { filterView } = useParams();
    const view = filterView || 'all';

    return (
        <LinksView
            links={links}
            view={view}
            searchQuery={searchQuery}
            viewMode={window.innerWidth >= 768 ? 'grid' : 'list'}
            onUpdateLink={onUpdateLink}
            onDeleteLink={onDeleteLink}
            onPinLink={onPinLink}
            onArchiveLink={onArchiveLink}
            onRefresh={onRefresh}
            loading={loading}
        />
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [links, setLinks] = useState([]);
    const [stats, setStats] = useState({
        all: 0,
        recent: 0,
        starred: 0,
        archive: 0,
    });
    const [view, setView] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    const fetchingRef = useRef(false);
    const lastFetchParamsRef = useRef({ view: '', searchQuery: '' });

    // Fetch data when view or search changes
    useEffect(() => {
        if (
            lastFetchParamsRef.current.view === view &&
            lastFetchParamsRef.current.searchQuery === searchQuery
        ) {
            return;
        }

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
                DashboardService.getStats()
            ]);

            if (linksResult.status === 'fulfilled' && linksResult.value?.success) {
                setLinks(linksResult.value.data?.links || []);
            } else {
                setLinks([]);
            }

            if (statsResult.status === 'fulfilled' && statsResult.value?.success) {
                const statsData = statsResult.value.data?.stats;
                if (statsData) {
                    setStats({
                        all: statsData.all || 0,
                        recent: statsData.recent || 0,
                        starred: statsData.starred || 0,
                        archive: statsData.archive || 0,
                    });
                }
            }
        } catch (error) {
            console.error('Dashboard data fetch error:', error);
        } finally {
            setDataLoading(false);
            fetchingRef.current = false;
        }
    };

    // Handle view change from navigation
    const handleViewChange = (newView) => {
        setView(newView);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                setIsAddLinkOpen(true);
            }
            if (e.key === 'Escape') {
                setIsCommandPaletteOpen(false);
                setIsAddLinkOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleAddLink = async (linkData) => {
        try {
            const result = await LinksService.createLink(linkData);
            if (result?.success && result?.data) {
                setLinks([result.data, ...links]);
                setIsAddLinkOpen(false);
                toast.success('Link saved successfully');
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save link');
        }
    };

    const handleUpdateLink = async (linkId, updates) => {
        try {
            const result = await LinksService.updateLink(linkId, updates);
            if (result?.success && result?.data) {
                setLinks(links.map(link => link.id === linkId ? result.data : link));
                toast.success('Link updated');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update link');
        }
    };

    const handleDeleteLink = async (linkId) => {
        try {
            setLinks(links.filter(link => link.id !== linkId));
            await LinksService.deleteLink(linkId);
            toast.success('Link deleted');
            fetchDashboardData();
        } catch (error) {
            fetchDashboardData();
            toast.error(error.message || 'Failed to delete link');
        }
    };

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
        } catch (error) {
            toast.error(error.message || 'Failed to update pin status');
        }
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
        } catch (error) {
            fetchDashboardData();
            toast.error(error.message || 'Failed to archive link');
        }
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
        >
            <Routes>
                {/* Home Page */}
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />

                {/* My Files Page */}
                <Route path="/my-files" element={<MyFiles />} />

                {/* Link Views - All, Starred, Recent, Archive */}
                <Route
                    path="/links/:filterView"
                    element={
                        <LinksPageWrapper
                            links={links}
                            searchQuery={searchQuery}
                            onUpdateLink={handleUpdateLink}
                            onDeleteLink={handleDeleteLink}
                            onPinLink={handlePinLink}
                            onArchiveLink={handleArchiveLink}
                            onRefresh={() => setIsAddLinkOpen(true)}
                            loading={dataLoading}
                        />
                    }
                />

                {/* Collections */}
                <Route path="/collections/:id" element={<div>Collection View</div>} />

                {/* Settings */}
                <Route path="/settings" element={<div>Settings</div>} />

                {/* Default - redirect to home */}
                <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
            </Routes>

            {/* Global Modals */}
            <AnimatePresence>
                {isAddLinkOpen && (
                    <AddLinkModal
                        isOpen={isAddLinkOpen}
                        onClose={() => setIsAddLinkOpen(false)}
                        onSubmit={handleAddLink}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCommandPaletteOpen && (
                    <CommandPalette
                        isOpen={isCommandPaletteOpen}
                        onClose={() => setIsCommandPaletteOpen(false)}
                        onAddLink={() => {
                            setIsCommandPaletteOpen(false);
                            setIsAddLinkOpen(true);
                        }}
                        onNavigate={(path) => {
                            setIsCommandPaletteOpen(false);
                            navigate(path);
                        }}
                    />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}