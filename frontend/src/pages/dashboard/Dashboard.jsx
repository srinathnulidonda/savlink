// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import LinksView from '../../components/dashboard/LinksView';
import AddLinkModal from '../../components/dashboard/AddLinkModal';
import CommandPalette from '../../components/dashboard/CommandPalette';
import { LinksService } from '../../services/links.service';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

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

    // Prevent duplicate fetches
    const fetchingRef = useRef(false);
    const lastFetchParamsRef = useRef({ view: '', searchQuery: '' });

    // Fetch data when component mounts or view/search changes
    useEffect(() => {
        // Check if params actually changed
        if (
            lastFetchParamsRef.current.view === view &&
            lastFetchParamsRef.current.searchQuery === searchQuery &&
            fetchingRef.current
        ) {
            return;
        }

        lastFetchParamsRef.current = { view, searchQuery };
        fetchDashboardData();
    }, [view, searchQuery]);

    const fetchDashboardData = async () => {
        // Prevent duplicate requests
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            setDataLoading(true);

            // Fetch data in parallel
            const [linksResult, statsResult] = await Promise.allSettled([
                LinksService.getLinks({ view, search: searchQuery }),
                LinksService.getStats()
            ]);

            // Handle links
            if (linksResult.status === 'fulfilled' && linksResult.value?.success) {
                const linksData = linksResult.value.data?.links || [];
                setLinks(linksData);
            } else if (linksResult.reason?.message?.includes('401')) {
                // Token expired
                navigate('/login', { replace: true });
                return;
            } else {
                console.error('Links fetch failed:', linksResult.reason);
                setLinks([]);
            }

            // Handle stats (don't wait for stats to show links)
            if (statsResult.status === 'fulfilled' && statsResult.value?.success) {
                const statsData = statsResult.value.data?.stats;
                if (statsData?.counts) {
                    setStats({
                        all: statsData.counts.all || 0,
                        recent: statsData.counts.recent || 0,
                        starred: statsData.counts.starred || 0,
                        archive: statsData.counts.archive || 0,
                    });
                }
            }

        } catch (error) {
            console.error('Dashboard data fetch error:', error);
            toast.error('Failed to load data');
        } finally {
            setDataLoading(false);
            fetchingRef.current = false;
        }
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
            if (result?.success && result?.data?.link) {
                // Optimistically update UI
                setLinks([result.data.link, ...links]);
                setIsAddLinkOpen(false);
                toast.success('Link saved successfully');

                // Update stats in background
                LinksService.getStats().then(statsResult => {
                    if (statsResult?.success && statsResult?.data?.stats?.counts) {
                        setStats({
                            all: statsResult.data.stats.counts.all || 0,
                            recent: statsResult.data.stats.counts.recent || 0,
                            starred: statsResult.data.stats.counts.starred || 0,
                            archive: statsResult.data.stats.counts.archive || 0,
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error creating link:', error);
            toast.error(error.message || 'Failed to save link');
        }
    };

    const handleUpdateLink = async (linkId, updates) => {
        try {
            const result = await LinksService.updateLink(linkId, updates);
            if (result?.success && result?.data?.link) {
                setLinks(links.map(link =>
                    link.id === linkId ? result.data.link : link
                ));
                toast.success('Link updated');
            }
        } catch (error) {
            console.error('Error updating link:', error);
            toast.error(error.message || 'Failed to update link');
        }
    };

    const handleDeleteLink = async (linkId) => {
        try {
            // Optimistically update UI
            setLinks(links.filter(link => link.id !== linkId));
            toast.success('Link deleted');

            // Delete in background
            await LinksService.deleteLink(linkId);

            // Update stats in background
            LinksService.getStats().then(statsResult => {
                if (statsResult?.success && statsResult?.data?.stats?.counts) {
                    setStats({
                        all: statsResult.data.stats.counts.all || 0,
                        recent: statsResult.data.stats.counts.recent || 0,
                        starred: statsResult.data.stats.counts.starred || 0,
                        archive: statsResult.data.stats.counts.archive || 0,
                    });
                }
            });
        } catch (error) {
            // Revert on error
            fetchDashboardData();
            console.error('Error deleting link:', error);
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

            // Refresh to get updated order
            fetchDashboardData();
        } catch (error) {
            console.error('Error toggling pin:', error);
            toast.error(error.message || 'Failed to update pin status');
        }
    };

    const handleArchiveLink = async (linkId) => {
        try {
            const link = links.find(l => l.id === linkId);

            // Optimistically update UI
            if (view === 'archive' && !link?.archived) {
                setLinks(links.filter(l => l.id !== linkId));
            } else if (view !== 'archive' && link?.archived) {
                setLinks(links.filter(l => l.id !== linkId));
            }

            if (link?.archived) {
                await LinksService.restoreLink(linkId);
                toast.success('Link restored');
            } else {
                await LinksService.archiveLink(linkId);
                toast.success('Link archived');
            }

            // Refresh in background
            fetchDashboardData();
        } catch (error) {
            console.error('Error archiving link:', error);
            toast.error(error.message || 'Failed to archive link');
            fetchDashboardData();
        }
    };

    return (
        <DashboardLayout
            user={user}
            stats={stats}
            activeView={view}
            onViewChange={setView}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
            onAddLink={() => setIsAddLinkOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        >
            <Routes>
                <Route
                    path="/"
                    element={
                        <LinksView
                            links={links}
                            view={view}
                            searchQuery={searchQuery}
                            viewMode={window.innerWidth >= 768 ? 'grid' : 'list'}
                            onUpdateLink={handleUpdateLink}
                            onDeleteLink={handleDeleteLink}
                            onPinLink={handlePinLink}
                            onArchiveLink={handleArchiveLink}
                            onRefresh={() => setIsAddLinkOpen(true)}
                            loading={dataLoading}
                        />
                    }
                />
                <Route path="/collections/:id" element={<div>Collection View</div>} />
                <Route path="/settings" element={<div>Settings</div>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

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