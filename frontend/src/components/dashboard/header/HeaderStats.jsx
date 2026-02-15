// src/components/dashboard/header/HeaderStats.jsx
export default function HeaderStats({ activeView, stats }) {
    const tabs = [
        { id: 'all', label: 'All Links', icon: '🔗' },
        { id: 'recent', label: 'Recent', icon: '⏱️' },
        { id: 'starred', label: 'Starred', icon: '⭐' },
        { id: 'archive', label: 'Archive', icon: '📦' },
    ];

    const currentTab = tabs.find(t => t.id === activeView);

    return (
        <div>
            <h1 className="text-base lg:text-lg font-semibold text-white flex items-center gap-2">
                <span>{currentTab?.icon}</span>
                {currentTab?.label}
            </h1>
            <p className="text-xs lg:text-sm text-gray-500">
                {(stats[activeView] || 0).toLocaleString()} links
            </p>
        </div>
    );
}