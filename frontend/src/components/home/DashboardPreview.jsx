// src/components/home/DashboardPreview.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPreview() {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLink, setSelectedLink] = useState(null);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [hoveredLinkId, setHoveredLinkId] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Detect mobile
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Simulate live activity
    const [liveActivity, setLiveActivity] = useState([]);
    useEffect(() => {
        const activities = [
            'New link saved',
            'Collection updated',
            'Link shared',
            '5 links imported',
            'Tag added',
        ];
        const interval = setInterval(() => {
            setLiveActivity(prev => {
                const newActivity = activities[Math.floor(Math.random() * activities.length)];
                return [newActivity, ...prev.slice(0, 2)];
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const tabs = [
        { id: 'all', label: 'All', count: 2847, icon: '🔗' },
        { id: 'recent', label: 'Recent', count: 24, icon: '⏱️' },
        { id: 'favorites', label: 'Starred', count: 156, icon: '⭐' },
        { id: 'archived', label: 'Archive', count: 89, icon: '📦' },
    ];

    const collections = [
        { name: 'Engineering', color: 'from-blue-600 to-blue-500', count: 432, emoji: '⚡' },
        { name: 'Design', color: 'from-purple-600 to-purple-500', count: 234, emoji: '🎨' },
        { name: 'Marketing', color: 'from-green-600 to-green-500', count: 156, emoji: '📈' },
        { name: 'Docs', color: 'from-amber-600 to-amber-500', count: 89, emoji: '📚' },
        { name: 'Research', color: 'from-red-600 to-red-500', count: 67, emoji: '🔬' },
    ];

    const links = [
        {
            id: 1,
            title: 'Linear Method',
            url: 'linear.app',
            fullUrl: 'https://linear.app/method',
            favicon: '🟣',
            description: 'How Linear builds product, from concept to launch.',
            tags: ['product', 'methodology'],
            collection: 'Engineering',
            saved: '2h ago',
            views: 234,
            isPublic: true,
            note: 'Product development framework',
            color: 'from-purple-500/20 to-indigo-500/20'
        },
        {
            id: 2,
            title: 'Stripe Design',
            url: 'stripe.com',
            fullUrl: 'https://stripe.com/docs/design',
            favicon: '🔵',
            description: 'Learn how Stripe approaches design.',
            tags: ['design', 'ui'],
            collection: 'Design',
            saved: '5h ago',
            views: 567,
            isPublic: false,
            note: 'Payment flow UX reference',
            color: 'from-blue-500/20 to-cyan-500/20'
        },
        {
            id: 3,
            title: 'Vercel Docs',
            url: 'vercel.com',
            fullUrl: 'https://vercel.com/docs',
            favicon: '▲',
            description: 'Deploy and scale applications on Vercel.',
            tags: ['deployment', 'devops'],
            collection: 'Engineering',
            saved: '1d ago',
            views: 892,
            isPublic: true,
            note: 'Edge functions guide',
            color: 'from-gray-600/20 to-gray-500/20'
        },
        {
            id: 4,
            title: 'Tailwind CSS',
            url: 'tailwindcss.com',
            fullUrl: 'https://tailwindcss.com',
            favicon: '🎨',
            description: 'Utility-first CSS framework.',
            tags: ['css', 'frontend'],
            collection: 'Design',
            saved: '2d ago',
            views: 445,
            isPublic: true,
            note: 'Component patterns',
            color: 'from-cyan-500/20 to-teal-500/20'
        },
        {
            id: 5,
            title: 'React 18',
            url: 'react.dev',
            fullUrl: 'https://react.dev',
            favicon: '⚛️',
            description: 'Concurrent features in React 18.',
            tags: ['react', 'javascript'],
            collection: 'Engineering',
            saved: '3d ago',
            views: 678,
            isPublic: true,
            note: 'Suspense & transitions',
            color: 'from-blue-400/20 to-blue-600/20'
        },
        {
            id: 6,
            title: 'Figma Guide',
            url: 'figma.com',
            fullUrl: 'https://figma.com/best-practices',
            favicon: '🎭',
            description: 'Master Auto Layout in Figma.',
            tags: ['design', 'tools'],
            collection: 'Design',
            saved: '4d ago',
            views: 334,
            isPublic: false,
            note: 'Responsive components',
            color: 'from-pink-500/20 to-rose-500/20'
        },
    ];

    const filteredLinks = links.filter(link =>
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Function to open link
    const handleOpenLink = (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Function to handle card click
    const handleCardClick = (e, link) => {
        // Prevent opening details if clicking on action buttons
        if (e.target.closest('button')) {
            return;
        }
        setSelectedLink(link);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative mx-auto mt-16 sm:mt-24 max-w-7xl px-4 sm:px-6"
        >
            {/* Glow Effect - Less intense on mobile */}
            <div className="absolute -inset-2 sm:-inset-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/5 sm:from-primary/10 via-transparent to-primary/5 sm:to-primary/10 opacity-50 blur-2xl sm:blur-3xl" />

            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-900 bg-black shadow-2xl">
                {/* Browser Chrome - Simplified on mobile */}
                <div className="flex items-center justify-between border-b border-gray-900 bg-gray-950 px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden sm:flex gap-1.5">
                            <div className="h-3 w-3 rounded-full bg-gray-800 hover:bg-red-500 transition-colors cursor-pointer" />
                            <div className="h-3 w-3 rounded-full bg-gray-800 hover:bg-yellow-500 transition-colors cursor-pointer" />
                            <div className="h-3 w-3 rounded-full bg-gray-800 hover:bg-green-500 transition-colors cursor-pointer" />
                        </div>
                        <div className="hidden sm:block h-5 w-px bg-gray-800" />
                        <div className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-[10px] sm:text-xs text-gray-400 font-mono truncate max-w-[150px] sm:max-w-none">app.savlink.com</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button className="sm:hidden p-1.5 text-gray-500">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                        <button className="sm:hidden p-1.5 text-gray-500">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="flex h-[500px] sm:h-[600px] lg:h-[700px] bg-black">
                    {/* Sidebar - Hidden on mobile */}
                    <div className="hidden md:flex w-56 lg:w-64 flex-shrink-0 border-r border-gray-900 bg-gray-950/50 flex-col">
                        {/* User Profile */}
                        <div className="border-b border-gray-900 p-3 lg:p-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="h-9 lg:h-10 w-9 lg:w-10 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-semibold">
                                        JD
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 lg:h-3 w-2.5 lg:w-3 rounded-full bg-green-500 border-2 border-gray-950 animate-pulse"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">John Doe</div>
                                    <div className="text-xs text-gray-500">Pro • 2.3k links</div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="p-3 lg:p-4">
                            <button
                                onClick={() => setIsCommandPaletteOpen(true)}
                                className="w-full flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-sm text-gray-400 hover:border-gray-700 hover:bg-gray-900 hover:text-white transition-all"
                            >
                                <span className="flex items-center gap-2 text-xs lg:text-sm">
                                    <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Search...
                                </span>
                                <kbd className="text-[10px] lg:text-xs bg-gray-800 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="px-3 pb-3">
                            <div className="space-y-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs lg:text-sm font-medium transition-all ${activeTab === tab.id
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className="text-sm lg:text-base">{tab.icon}</span>
                                            {tab.label}
                                        </span>
                                        <span className={`text-[10px] lg:text-xs ${activeTab === tab.id ? 'text-primary' : 'text-gray-600'
                                            }`}>
                                            {tab.count > 999 ? '999+' : tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </nav>

                        {/* Collections */}
                        <div className="flex-1 border-t border-gray-900 p-3 lg:p-4 overflow-y-auto">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wider">Collections</h3>
                                <button className="text-gray-500 hover:text-gray-400 transition-colors">
                                    <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                            <div className="space-y-1">
                                {collections.map((collection) => (
                                    <button
                                        key={collection.name}
                                        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs lg:text-sm text-gray-400 hover:bg-gray-900 hover:text-white transition-all group"
                                    >
                                        <span className="text-sm lg:text-base opacity-70 group-hover:opacity-100">{collection.emoji}</span>
                                        <span className="flex-1 text-left truncate">{collection.name}</span>
                                        <span className="text-[10px] lg:text-xs text-gray-600">{collection.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Storage */}
                        <div className="border-t border-gray-900 p-3 lg:p-4">
                            <div className="mb-2 flex items-center justify-between text-[10px] lg:text-xs">
                                <span className="text-gray-500">Storage</span>
                                <span className="text-gray-400">2.3/10 GB</span>
                            </div>
                            <div className="h-1 lg:h-1.5 w-full rounded-full bg-gray-900 overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                                    initial={{ width: '0%' }}
                                    animate={{ width: '23%' }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header - Mobile optimized */}
                        <div className="border-b border-gray-900 bg-gray-950/50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                            {/* Mobile Header */}
                            <div className="sm:hidden">
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        onClick={() => setIsMobileMenuOpen(true)}
                                        className="p-1.5 text-gray-400"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </button>
                                    <h1 className="text-sm font-semibold text-white">
                                        {tabs.find(t => t.id === activeTab)?.label}
                                    </h1>
                                    <button
                                        onClick={() => setIsCommandPaletteOpen(true)}
                                        className="p-1.5 text-gray-400"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </button>
                                </div>
                                {/* Mobile Tabs */}
                                <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-gray-500'
                                                }`}
                                        >
                                            <span>{tab.icon}</span>
                                            <span>{tab.label}</span>
                                            <span className="text-[10px]">({tab.count})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Desktop Header */}
                            <div className="hidden sm:flex items-center justify-between">
                                <div>
                                    <h1 className="text-base lg:text-lg font-semibold text-white flex items-center gap-2">
                                        <span>{tabs.find(t => t.id === activeTab)?.icon}</span>
                                        {tabs.find(t => t.id === activeTab)?.label}
                                    </h1>
                                    <p className="text-xs lg:text-sm text-gray-500">
                                        {tabs.find(t => t.id === activeTab)?.count.toLocaleString()} links
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 lg:gap-3">
                                    {/* Search - Hidden on mobile */}
                                    <div className="relative hidden lg:block">
                                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-48 xl:w-64 rounded-lg border border-gray-800 bg-gray-900 pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                        />
                                    </div>

                                    {/* View Options */}
                                    <div className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-800 p-1">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`rounded p-1.5 transition-all ${viewMode === 'grid' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`rounded p-1.5 transition-all ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Add Link - Responsive */}
                                    <button className="btn-primary flex items-center gap-2 text-xs lg:text-sm px-3 lg:px-5 py-1.5 lg:py-2.5">
                                        <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="hidden sm:inline">Add</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Links Grid/List - Responsive */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
                            {searchQuery && filteredLinks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                                    <svg className="h-10 sm:h-12 w-10 sm:w-12 text-gray-600 mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <h3 className="text-base sm:text-lg font-medium text-white mb-1">No results</h3>
                                    <p className="text-xs sm:text-sm text-gray-500">Try different keywords</p>
                                </div>
                            ) : (
                                <div className={
                                    viewMode === 'grid'
                                        ? "grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                                        : "space-y-2 sm:space-y-3"
                                }>
                                    <AnimatePresence mode="popLayout">
                                        {filteredLinks.map((link, index) => (
                                            <motion.div
                                                key={link.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                                onMouseEnter={() => !isMobile && setHoveredLinkId(link.id)}
                                                onMouseLeave={() => !isMobile && setHoveredLinkId(null)}
                                                onClick={(e) => handleCardClick(e, link)}
                                                className={`group relative cursor-pointer overflow-hidden rounded-lg sm:rounded-xl border border-gray-900 bg-gray-950/50 transition-all hover:border-gray-800 hover:bg-gray-950 ${viewMode === 'list' ? 'p-3 sm:p-4' : ''
                                                    }`}
                                            >
                                                {viewMode === 'grid' ? (
                                                    <>
                                                        {/* Grid View - Responsive */}
                                                        <div className={`aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-gradient-to-br ${link.color}`}>
                                                            <div className="flex h-full items-center justify-center">
                                                                <span className="text-3xl sm:text-4xl">{link.favicon}</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 sm:p-4">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="text-sm sm:text-base font-medium text-white line-clamp-1 group-hover:text-primary transition-colors">
                                                                        {link.title}
                                                                    </h3>
                                                                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500 font-mono truncate">{link.url}</p>
                                                                </div>
                                                                {link.isPublic && (
                                                                    <span className="flex-shrink-0">
                                                                        <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-2 text-xs sm:text-sm text-gray-400 line-clamp-2">
                                                                {link.description}
                                                            </p>
                                                            <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                                                                {link.tags.slice(0, 2).map((tag) => (
                                                                    <span
                                                                        key={tag}
                                                                        className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] sm:text-xs text-gray-400"
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                                {link.tags.length > 2 && (
                                                                    <span className="text-[10px] sm:text-xs text-gray-600">
                                                                        +{link.tags.length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-2 sm:mt-3 flex items-center justify-between border-t border-gray-900 pt-2 sm:pt-3">
                                                                <span className="text-[10px] sm:text-xs text-gray-500">{link.saved}</span>
                                                                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                                                                    <svg className="h-3 sm:h-3.5 w-3 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    {link.views}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* List View - Mobile optimized */}
                                                        <div className="flex items-center gap-3 sm:gap-4">
                                                            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center flex-shrink-0`}>
                                                                <span className="text-xl sm:text-2xl">{link.favicon}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="text-sm sm:text-base font-medium text-white truncate group-hover:text-primary transition-colors">
                                                                        {link.title}
                                                                    </h3>
                                                                    {link.isPublic && (
                                                                        <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] sm:text-xs text-gray-500 font-mono truncate">{link.url}</p>
                                                            </div>
                                                            <div className="hidden sm:flex items-center gap-2 sm:gap-4">
                                                                <div className="hidden lg:flex gap-1">
                                                                    {link.tags.slice(0, 2).map((tag) => (
                                                                        <span
                                                                            key={tag}
                                                                            className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                                                                        >
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs text-gray-500">{link.saved}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {/* Hover Actions - Desktop only */}
                                                <AnimatePresence>
                                                    {!isMobile && hoveredLinkId === link.id && viewMode === 'grid' && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="absolute right-2 top-2 flex gap-1"
                                                        >
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenLink(link.fullUrl);
                                                                }}
                                                                className="rounded-lg bg-black/80 backdrop-blur-sm p-1.5 sm:p-2 text-white hover:bg-black transition-all"
                                                            >
                                                                <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                            </button>
                                                            <button className="rounded-lg bg-black/80 backdrop-blur-sm p-1.5 sm:p-2 text-white hover:bg-black transition-all">
                                                                <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Activity Bar - Simplified on mobile */}
                        <div className="border-t border-gray-900 bg-gray-950/50 px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="hidden sm:inline">All systems operational</span>
                                        <span className="sm:hidden">Online</span>
                                    </span>
                                    <span className="hidden sm:inline">Last sync: Just now</span>
                                </div>
                                <div className="text-[10px] sm:text-xs text-gray-400">
                                    {liveActivity[0]}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Desktop only */}
                    <AnimatePresence>
                        {!isMobile && selectedLink && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 280, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="hidden lg:block border-l border-gray-900 bg-gray-950/50 overflow-hidden"
                            >
                                <div className="p-4 h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-medium text-white">Details</h3>
                                        <button
                                            onClick={() => setSelectedLink(null)}
                                            className="text-gray-500 hover:text-white transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto text-xs">
                                        <div>
                                            <label className="text-gray-500">Title</label>
                                            <p className="mt-1 text-white">{selectedLink.title}</p>
                                        </div>
                                        <div>
                                            <label className="text-gray-500">URL</label>
                                            <p className="mt-1 text-gray-400 font-mono break-all">{selectedLink.url}</p>
                                        </div>
                                        <div>
                                            <label className="text-gray-500">Collection</label>
                                            <p className="mt-1 text-white">{selectedLink.collection}</p>
                                        </div>
                                        <div>
                                            <label className="text-gray-500">Tags</label>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {selectedLink.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2 border-t border-gray-900 pt-4">
                                        <button
                                            onClick={() => handleOpenLink(selectedLink.fullUrl)}
                                            className="w-full btn-primary text-xs py-2"
                                        >
                                            Open Link
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Mobile Menu Drawer */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                className="absolute left-0 top-0 z-50 h-full w-64 bg-gray-950 border-r border-gray-800 md:hidden"
                            >
                                <div className="p-4 border-b border-gray-900">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-semibold text-white">Menu</h2>
                                        <button
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="text-gray-500"
                                        >
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Collections</h3>
                                    <div className="space-y-1">
                                        {collections.map((collection) => (
                                            <button
                                                key={collection.name}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-900 hover:text-white"
                                            >
                                                <span>{collection.emoji}</span>
                                                <span className="flex-1 text-left">{collection.name}</span>
                                                <span className="text-xs text-gray-600">{collection.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Mobile Link Details Modal */}
                <AnimatePresence>
                    {isMobile && selectedLink && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm md:hidden"
                            onClick={() => setSelectedLink(null)}
                        >
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                className="absolute bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 rounded-t-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-medium text-white">Link Details</h3>
                                        <button
                                            onClick={() => setSelectedLink(null)}
                                            className="text-gray-500"
                                        >
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500">Title</label>
                                            <p className="mt-1 text-sm text-white">{selectedLink.title}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">URL</label>
                                            <p className="mt-1 text-xs text-gray-400 font-mono break-all">{selectedLink.url}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Tags</label>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {selectedLink.tags.map((tag) => (
                                                    <span key={tag} className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => handleOpenLink(selectedLink.fullUrl)}
                                            className="flex-1 btn-primary text-sm"
                                        >
                                            Open Link
                                        </button>
                                        <button className="flex-1 btn-secondary text-sm">
                                            Share
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Command Palette - Mobile optimized */}
                <AnimatePresence>
                    {isCommandPaletteOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-10 sm:pt-20"
                            onClick={() => setIsCommandPaletteOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="w-[calc(100%-2rem)] sm:w-full max-w-lg rounded-xl border border-gray-800 bg-gray-950 shadow-2xl mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-3 border-b border-gray-900 p-3 sm:p-4">
                                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search or type command..."
                                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                                        autoFocus
                                    />
                                    <kbd className="text-[10px] sm:text-xs text-gray-500 font-mono">ESC</kbd>
                                </div>
                                <div className="p-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                                    <div className="text-[10px] sm:text-xs text-gray-500 px-3 py-2">Quick Actions</div>
                                    {[
                                        { icon: '➕', label: 'Add new link', shortcut: 'N' },
                                        { icon: '📁', label: 'Create collection', shortcut: 'C' },
                                        { icon: '🔍', label: 'Search links', shortcut: 'S' },
                                        { icon: '📥', label: 'Import', shortcut: 'I' },
                                        { icon: '📤', label: 'Export', shortcut: 'E' },
                                    ].map((command) => (
                                        <button
                                            key={command.label}
                                            onClick={() => setIsCommandPaletteOpen(false)}
                                            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-400 hover:bg-gray-900 hover:text-white text-left transition-all"
                                        >
                                            <span className="flex items-center gap-2 sm:gap-3">
                                                <span className="text-sm sm:text-base">{command.icon}</span>
                                                {command.label}
                                            </span>
                                            <kbd className="text-[10px] sm:text-xs text-gray-600 font-mono">
                                                <span className="hidden sm:inline">⌘</span>{command.shortcut}
                                            </kbd>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}