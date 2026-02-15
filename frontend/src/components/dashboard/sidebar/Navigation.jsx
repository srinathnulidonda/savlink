// src/components/dashboard/sidebar/Navigation.jsx
import { motion } from 'framer-motion';

export default function Navigation({ stats, activeView, onViewChange }) {
    // Top level navigation items
    const topLevelTabs = [
        { id: 'home', label: 'Home', icon: '🏠', color: 'text-blue-400' },
        { id: 'myfiles', label: 'My Files', icon: '📁', color: 'text-purple-400' },
    ];

    // Link management tabs
    const linkTabs = [
        { id: 'all', label: 'All Links', count: stats.all, icon: '🔗', color: 'text-blue-400' },
        { id: 'recent', label: 'Recent', count: stats.recent, icon: '🕒', color: 'text-green-400' },
        { id: 'starred', label: 'Starred', count: stats.starred, icon: '⭐', color: 'text-yellow-400' },
        { id: 'archive', label: 'Archive', count: stats.archive, icon: '📦', color: 'text-gray-400' },
    ];

    const getCountDisplay = (count) => {
        if (count > 9999) return '9999+';
        if (count > 999) return '999+';
        return count.toString();
    };

    return (
        <nav className="px-2.5 lg:px-3 pb-2">
            {/* Top Level Navigation */}
            <div className="space-y-0.5 mb-2">
                {topLevelTabs.map((tab) => {
                    const isActive = activeView === tab.id;

                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => onViewChange(tab.id)}
                            whileHover={{ scale: isActive ? 1 : 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all group ${isActive
                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                                : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                }`}
                        >
                            <span className={`text-xs transition-transform group-hover:scale-110 ${isActive ? tab.color : ''}`}>
                                {tab.icon}
                            </span>
                            <span className="font-medium">{tab.label}</span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="relative mb-2">
                <div className="border-t border-gray-800"></div>
            </div>

            {/* Link Management Navigation */}
            <div className="space-y-0.5">
                {linkTabs.map((tab, index) => {
                    const isActive = activeView === tab.id;

                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => onViewChange(tab.id)}
                            whileHover={{ scale: isActive ? 1 : 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all group ${isActive
                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                                : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                }`}
                            title={`View ${tab.label.toLowerCase()}`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className={`text-xs transition-transform group-hover:scale-110 ${isActive ? tab.color : ''
                                    }`}>
                                    {tab.icon}
                                </span>
                                <span className="font-medium">
                                    {tab.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {/* Count Display */}
                                {isActive ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-primary/20 text-primary">
                                        {getCountDisplay(tab.count)}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-mono text-gray-600">
                                        {getCountDisplay(tab.count)}
                                    </span>
                                )}
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}