// src/components/dashboard/header/HeaderMobile.jsx
export default function HeaderMobile({
    activeView,
    onMenuClick,
    onOpenCommandPalette,
    stats
}) {
    const tabs = [
        { id: 'all', label: 'All', icon: '🔗' },
        { id: 'recent', label: 'Recent', icon: '⏱️' },
        { id: 'starred', label: 'Starred', icon: '⭐' },
        { id: 'archive', label: 'Archive', icon: '📦' },
    ];

    const currentTab = tabs.find(t => t.id === activeView);

    return (
        <div className="flex items-center justify-between mb-3">
            <button
                onClick={onMenuClick}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Open menu"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <div className="flex items-center gap-2">
                <span className="text-sm">{currentTab?.icon}</span>
                <h1 className="text-sm font-semibold text-white">
                    {currentTab?.label}
                </h1>
                <span className="text-xs text-gray-500">
                    ({stats[activeView] || 0})
                </span>
            </div>

            <button
                onClick={onOpenCommandPalette}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Search (⌘K)"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>
        </div>
    );
}