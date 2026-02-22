// src/dashboard/pages/home/components/CollectionsPreview.jsx

export default function CollectionsPreview({ collections = [] }) {
    if (collections.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Collections
                </h2>
                <div className="text-center py-8">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-gray-500 dark:text-gray-400">No collections yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Collections
                </h2>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700">
                    View all →
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {collections.slice(0, 4).map((collection) => (
                    <div key={collection.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${collection.color} flex items-center justify-center`}>
                            <span className="text-white text-sm">{collection.icon}</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                {collection.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {collection.count} links
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}