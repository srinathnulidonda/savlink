// src/components/dashboard/header/ViewModeToggle.jsx
export default function ViewModeToggle({ viewMode, onViewModeChange }) {
    return (
        <div className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-800 p-1">
            <button
                onClick={() => onViewModeChange('grid')}
                className={`rounded p-1.5 transition-all ${viewMode === 'grid'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-500 hover:text-white'
                    }`}
                title="Grid view"
            >
                <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            </button>
            <button
                onClick={() => onViewModeChange('list')}
                className={`rounded p-1.5 transition-all ${viewMode === 'list'
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-500 hover:text-white'
                    }`}
                title="List view"
            >
                <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
        </div>
    );
}