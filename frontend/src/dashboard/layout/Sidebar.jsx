// src/dashboard/layout/Sidebar.jsx

import UserProfile from '../components/sidebar/UserProfile';
import QuickActions from '../components/sidebar/QuickActions';
import Navigation from '../components/sidebar/Navigation';
import Collections from '../components/sidebar/Collections';
import SidebarFooter from '../components/sidebar/SidebarFooter';

export default function Sidebar({
    user,
    stats,
    activeView,
    onViewChange, // ✅ Add this prop
    collections,
    activeCollection,
    onCollectionChange,
    onOpenCommandPalette,
    onAddLink
}) {
    const handleCreateCollection = async (collectionData) => {
        console.log('Creating collection:', collectionData);
    };

    return (
        <div className="w-56 lg:w-64 flex-shrink-0 border-r border-gray-900 bg-gray-950/50 flex flex-col">
            {/* User Profile Section */}
            <UserProfile user={user} stats={stats} />

            {/* Quick Actions Section */}
            <QuickActions
                onOpenCommandPalette={onOpenCommandPalette}
                onAddLink={onAddLink}
                onAddCollection={() => {}} // Add collection handler if needed
            />

            {/* ✅ Pass onViewChange to Navigation */}
            <Navigation
                stats={stats}
                activeView={activeView}
                onViewChange={onViewChange}
            />

            {/* Collections Section */}
            <Collections
                collections={collections}
                activeCollection={activeCollection}
                onCollectionChange={onCollectionChange}
                onCreateCollection={handleCreateCollection}
            />

            {/* Footer Section */}
            <SidebarFooter />
        </div>
    );
}