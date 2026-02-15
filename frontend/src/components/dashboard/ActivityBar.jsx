// src/components/dashboard/ActivityBar.jsx
import { useState, useEffect } from 'react';

export default function ActivityBar() {
    const [liveActivity, setLiveActivity] = useState(['System ready']);
    const [syncStatus, setSyncStatus] = useState('synced');

    useEffect(() => {
        const activities = [
            'Links synced',
            'Auto-save enabled',
            'New update available',
            'Backup complete',
        ];

        const interval = setInterval(() => {
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            setLiveActivity([randomActivity]);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="border-t border-gray-900 bg-gray-950/50 px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="hidden sm:inline">All systems operational</span>
                        <span className="sm:hidden">Online</span>
                    </span>
                    {syncStatus === 'synced' && (
                        <span className="hidden sm:inline">Last sync: Just now</span>
                    )}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-400">
                    {liveActivity[0]}
                </div>
            </div>
        </div>
    );
}