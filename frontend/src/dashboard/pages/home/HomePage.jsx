// src/dashboard/pages/home/HomePage.jsx

import { useState, useEffect } from 'react';
import QuickActions from './components/QuickActions';
import RecentLinks from './components/RecentLinks';
import PinnedLinks from './components/PinnedLinks';
import StatsOverview from './components/StatsOverview';
import ActivityFeed from './components/ActivityFeed';
import CollectionsPreview from './components/CollectionsPreview';
import SearchShortcut from './components/SearchShortcut';
import { useHomeData } from './hooks/useHomeData';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

export default function HomePage() {
    const { data, loading, error, refetch } = useHomeData();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 17) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    if (loading) {
        return <LoadingState message="Loading your dashboard..." size="large" />;
    }

    if (error) {
        return (
            <ErrorState
                title="Failed to load dashboard"
                message={error}
                onRetry={refetch}
                retryLabel="Reload Dashboard"
            />
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Header with Greeting */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-white">
                            {greeting}! 👋
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Here's what's happening with your links today
                        </p>
                    </div>
                    <SearchShortcut />
                </div>

                {/* Stats Overview */}
                <StatsOverview stats={data?.stats} />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Quick Actions */}
                        <QuickActions />

                        {/* Recent Links */}
                        <RecentLinks links={data?.recentLinks} />

                        {/* Collections Preview */}
                        <CollectionsPreview collections={data?.collections} />
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-8">
                        {/* Pinned Links */}
                        <PinnedLinks links={data?.pinnedLinks} />

                        {/* Activity Feed */}
                        <ActivityFeed activities={data?.activities} />
                    </div>
                </div>
            </div>
        </div>
    );
}