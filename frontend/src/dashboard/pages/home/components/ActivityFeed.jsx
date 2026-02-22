// src/dashboard/pages/home/components/ActivityFeed.jsx

import { motion } from 'framer-motion';

export default function ActivityFeed({ activities = [] }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
            </h2>
            
            {activities.length === 0 ? (
                <div className="text-center py-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            No recent activity
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Your activity will appear here
                        </p>
                    </motion.div>
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.slice(0, 5).map((activity, index) => (
                        <motion.div
                            key={activity.id || index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3"
                        >
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {activity.description}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {activity.time}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}