// src/dashboard/pages/home/components/StatsOverview.jsx

import { motion } from 'framer-motion';

export default function StatsOverview({ stats = {} }) {
    const statCards = [
        {
            label: 'Total Links',
            value: stats.total || 0,
            icon: '🔗',
            color: 'from-blue-500 to-blue-600',
            change: '+12 this week'
        },
        {
            label: 'This Week',
            value: stats.thisWeek || 0,
            icon: '📈',
            color: 'from-green-500 to-green-600',
            change: '+5 from last week'
        },
        {
            label: 'Starred',
            value: stats.starred || 0,
            icon: '⭐',
            color: 'from-yellow-500 to-yellow-600',
            change: `${stats.starred || 0} favorites`
        },
        {
            label: 'Collections',
            value: stats.collections || 0,
            icon: '📁',
            color: 'from-purple-500 to-purple-600',
            change: 'Well organized'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {card.label}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {card.value.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {card.change}
                            </p>
                        </div>
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
                            <span className="text-lg">{card.icon}</span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}