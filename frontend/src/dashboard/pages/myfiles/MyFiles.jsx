// src/dashboard/pages/myfiles/MyFiles.jsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardService from '../../../services/dashboard.service';
import LinksService from '../../../services/links.service';
import toast from 'react-hot-toast';

// Tab configuration
const TABS = [
    { id: 'all', label: 'All' },
    { id: 'links', label: 'Links' },
    { id: 'folders', label: 'Folders' },
    { id: 'tags', label: 'Tags' },
];

const SORT_OPTIONS = [
    { id: 'recent', label: 'Recently added' },
    { id: 'name', label: 'Name' },
    { id: 'clicks', label: 'Most clicked' },
    { id: 'oldest', label: 'Oldest first' },
];

export default function MyFiles() {
    const navigate = useNavigate();

    // State
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState('list');
    const [sortBy, setSortBy] = useState('recent');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Data
    const [links, setLinks] = useState([]);
    const [folders, setFolders] = useState([]);
    const [tags, setTags] = useState([]);
    const [stats, setStats] = useState({ links: 0, folders: 0, tags: 0 });

    const sortMenuRef = useRef(null);

    // Fetch data
    useEffect(() => {
        fetchData();
    }, [activeTab, sortBy]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [linksResult, statsResult] = await Promise.allSettled([
                DashboardService.getLinks({ view: 'all', sort: sortBy }),
                DashboardService.getStats()
            ]);

            if (linksResult.status === 'fulfilled' && linksResult.value?.success) {
                setLinks(linksResult.value.data?.links || []);
            }

            if (statsResult.status === 'fulfilled' && statsResult.value?.success) {
                const s = statsResult.value.data?.stats || {};
                setStats({
                    links: s.all || 0,
                    folders: s.folders || 0,
                    tags: s.tags || 0,
                });
            }
        } catch (error) {
            console.error('MyFiles fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Close sort menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
                setShowSortMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter items based on search
    const filteredLinks = links.filter(link => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            link.title?.toLowerCase().includes(q) ||
            link.original_url?.toLowerCase().includes(q) ||
            link.tags?.some(tag => tag.toLowerCase().includes(q))
        );
    });

    // Select/deselect
    const toggleSelect = (id) => {
        setSelectedItems(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedItems.length === filteredLinks.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredLinks.map(l => l.id));
        }
    };

    // Actions
    const handleDelete = async (id) => {
        try {
            setLinks(prev => prev.filter(l => l.id !== id));
            await LinksService.deleteLink(id);
            toast.success('Deleted');
            fetchData();
        } catch {
            fetchData();
            toast.error('Failed to delete');
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedItems.length) return;
        if (!window.confirm(`Delete ${selectedItems.length} items?`)) return;

        try {
            setLinks(prev => prev.filter(l => !selectedItems.includes(l.id)));
            setSelectedItems([]);
            toast.success(`${selectedItems.length} items deleted`);
            fetchData();
        } catch {
            fetchData();
            toast.error('Failed to delete items');
        }
    };

    const handleOpenLink = (link) => {
        window.open(link.original_url, '_blank', 'noopener,noreferrer');
    };

    const handleCopyUrl = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    // Get domain from URL
    const getDomain = (url) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    // Get time display
    const getTimeDisplay = (link) => {
        return link.relative_time || 'Recently';
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-800">
                <div className="px-6 py-5">
                    {/* Title Row */}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h1 className="text-xl font-semibold text-white">My Files</h1>
                            <p className="text-sm text-gray-400 mt-0.5">
                                {stats.links} links · {stats.folders} folders · {stats.tags} tags
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* New Folder */}
                            <button className="px-3 py-1.5 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors">
                                New folder
                            </button>

                            {/* Add Link */}
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                            >
                                Add link
                            </button>
                        </div>
                    </div>

                    {/* Tabs + Controls */}
                    <div className="flex items-center justify-between">
                        {/* Tabs */}
                        <div className="flex items-center gap-1">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === tab.id
                                            ? 'text-white bg-gray-800'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            {/* Search */}
                            <div className="relative">
                                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search files..."
                                    className="w-48 pl-8 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Sort */}
                            <div className="relative" ref={sortMenuRef}>
                                <button
                                    onClick={() => setShowSortMenu(!showSortMenu)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 border border-gray-700 rounded-md transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9M3 12h5m0 0l4-4m-4 4l4 4" />
                                    </svg>
                                    <span className="hidden sm:inline">
                                        {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
                                    </span>
                                </button>

                                <AnimatePresence>
                                    {showSortMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full mt-1 w-44 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20"
                                        >
                                            <div className="p-1">
                                                {SORT_OPTIONS.map(option => (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => {
                                                            setSortBy(option.id);
                                                            setShowSortMenu(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                                            sortBy === option.id
                                                                ? 'text-white bg-gray-800'
                                                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* View Toggle */}
                            <div className="flex items-center border border-gray-700 rounded-md overflow-hidden">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-gray-700 text-white'
                                            : 'text-gray-500 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-gray-700 text-white'
                                            : 'text-gray-500 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {selectedItems.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex-shrink-0 border-b border-gray-800 bg-blue-600/10"
                    >
                        <div className="px-6 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={selectAll}
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    {selectedItems.length === filteredLinks.length ? 'Deselect all' : 'Select all'}
                                </button>
                                <span className="text-sm text-gray-400">
                                    {selectedItems.length} selected
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors">
                                    Move to folder
                                </button>
                                <button className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors">
                                    Archive
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setSelectedItems([])}
                                    className="p-1 text-gray-500 hover:text-white transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                            <span className="text-sm text-gray-400">Loading...</span>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredLinks.length === 0 && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center max-w-sm">
                            {searchQuery ? (
                                <>
                                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-medium text-white mb-1">No results found</h3>
                                    <p className="text-sm text-gray-400">
                                        No files matching "{searchQuery}". Try a different search.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-medium text-white mb-1">No files yet</h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Save your first link to get started. All your links, folders, and collections will appear here.
                                    </p>
                                    <button className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                                        Add your first link
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* List View */}
                {!loading && filteredLinks.length > 0 && viewMode === 'list' && (
                    <div className="divide-y divide-gray-800/50">
                        {/* Table Header */}
                        <div className="px-6 py-2.5 flex items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-900/30">
                            <div className="w-6">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.length === filteredLinks.length && filteredLinks.length > 0}
                                    onChange={selectAll}
                                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                            </div>
                            <div className="flex-1">Name</div>
                            <div className="w-32 hidden md:block">Domain</div>
                            <div className="w-28 hidden lg:block">Tags</div>
                            <div className="w-24 hidden sm:block text-right">Modified</div>
                            <div className="w-16"></div>
                        </div>

                        {/* Table Rows */}
                        {filteredLinks.map((link) => {
                            const isSelected = selectedItems.includes(link.id);

                            return (
                                <div
                                    key={link.id}
                                    className={`group px-6 py-3 flex items-center gap-4 transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-600/5'
                                            : 'hover:bg-gray-800/30'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <div className="w-6">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(link.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
                                        />
                                    </div>

                                    {/* Name + URL */}
                                    <div
                                        className="flex-1 min-w-0 flex items-center gap-3"
                                        onClick={() => handleOpenLink(link)}
                                    >
                                        <div className="w-8 h-8 rounded-md bg-gray-800 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm">{link.favicon || '🔗'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                                                {link.title || 'Untitled'}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {link.display_url || link.original_url}
                                            </div>
                                        </div>
                                        {link.pinned && (
                                            <span className="text-yellow-500 text-xs flex-shrink-0">⭐</span>
                                        )}
                                    </div>

                                    {/* Domain */}
                                    <div className="w-32 hidden md:block">
                                        <span className="text-xs text-gray-500 truncate">
                                            {getDomain(link.original_url)}
                                        </span>
                                    </div>

                                    {/* Tags */}
                                    <div className="w-28 hidden lg:block">
                                        <div className="flex gap-1">
                                            {link.tags?.slice(0, 2).map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-400 rounded"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {link.tags?.length > 2 && (
                                                <span className="text-xs text-gray-600">
                                                    +{link.tags.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Modified */}
                                    <div className="w-24 hidden sm:block text-right">
                                        <span className="text-xs text-gray-500">
                                            {getTimeDisplay(link)}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="w-16 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyUrl(link.short_url || link.original_url);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                                            title="Copy URL"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenLink(link);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                                            title="Open link"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(link.id);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Grid View */}
                {!loading && filteredLinks.length > 0 && viewMode === 'grid' && (
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredLinks.map((link) => {
                            const isSelected = selectedItems.includes(link.id);

                            return (
                                <div
                                    key={link.id}
                                    onClick={() => handleOpenLink(link)}
                                    className={`group relative rounded-lg border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'border-blue-500/50 bg-blue-600/5'
                                            : 'border-gray-800 hover:border-gray-700 bg-gray-900/50'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <div className="absolute top-3 left-3 z-10">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(link.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
                                        />
                                    </div>

                                    {/* Preview */}
                                    <div className="aspect-[16/10] bg-gray-800/50 rounded-t-lg flex items-center justify-center">
                                        <span className="text-3xl">{link.favicon || '🔗'}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                                                    {link.title || 'Untitled'}
                                                </h3>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {getDomain(link.original_url)}
                                                </p>
                                            </div>
                                            {link.pinned && <span className="text-yellow-500 text-xs">⭐</span>}
                                        </div>

                                        {/* Tags */}
                                        {link.tags?.length > 0 && (
                                            <div className="flex gap-1 mt-3">
                                                {link.tags.slice(0, 2).map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-400 rounded"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                                            <span className="text-xs text-gray-500">{getTimeDisplay(link)}</span>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyUrl(link.short_url || link.original_url);
                                                    }}
                                                    className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(link.id);
                                                    }}
                                                    className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="flex-shrink-0 px-6 py-2 border-t border-gray-800 bg-gray-950/50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                        {filteredLinks.length} {filteredLinks.length === 1 ? 'item' : 'items'}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </span>
                    <span>
                        {selectedItems.length > 0 && `${selectedItems.length} selected · `}
                        {viewMode === 'list' ? 'List view' : 'Grid view'}
                    </span>
                </div>
            </div>
        </div>
    );
}