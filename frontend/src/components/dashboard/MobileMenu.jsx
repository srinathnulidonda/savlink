// src/components/dashboard/MobileMenu.jsx
import { motion } from 'framer-motion';
import UserProfile from './sidebar/UserProfile';
import Navigation from './sidebar/Navigation';
import Collections from './sidebar/Collections';

export default function MobileMenu({
    isOpen,
    onClose,
    user,
    stats,
    activeView,
    onViewChange,
    collections,
    activeCollection,
    onCollectionChange,
    onCreateCollection
}) {
    const handleViewChange = (view) => {
        onViewChange(view);
        onClose();
    };

    const handleCollectionChange = (collectionId) => {
        onCollectionChange?.(collectionId);
        onClose();
    };

    const handleCreateCollection = async (collectionData) => {
        await onCreateCollection?.(collectionData);
        // Don't close menu here - let user see the new collection
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                onClick={onClose}
            />

            {/* Menu Panel */}
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 z-50 h-full w-64 bg-gray-950 border-r border-gray-800 md:hidden overflow-hidden flex flex-col"
            >
                {/* Header with Close Button */}
                <div className="flex items-center justify-between p-4 border-b border-gray-900">
                    <h2 className="text-sm font-semibold text-white">Menu</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-900 rounded-lg transition-colors"
                        title="Close menu"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User Profile - Same as Sidebar */}
                <UserProfile user={user} stats={stats} />

                {/* Navigation - Same as Sidebar */}
                <div className="px-3 pb-3">
                    <Navigation
                        stats={stats}
                        activeView={activeView}
                        onViewChange={handleViewChange}
                    />
                </div>

                {/* Collections - Same as Sidebar */}
                <Collections
                    collections={collections}
                    activeCollection={activeCollection}
                    onCollectionChange={handleCollectionChange}
                    onCreateCollection={handleCreateCollection}
                />
            </motion.div>
        </>
    );
}