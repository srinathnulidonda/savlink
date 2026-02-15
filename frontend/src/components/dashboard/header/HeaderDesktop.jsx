// src/components/dashboard/header/HeaderDesktop.jsx
import HeaderStats from './HeaderStats';
import SearchBar from './SearchBar';
import ViewModeToggle from './ViewModeToggle';
import AddLinkButton from './AddLinkButton';

export default function HeaderDesktop({
    activeView,
    stats,
    searchQuery,
    onSearch,
    viewMode,
    onViewModeChange,
    onAddLink
}) {
    return (
        <div className="flex items-center justify-between">
            {/* Left side - Title and stats */}
            <HeaderStats activeView={activeView} stats={stats} />

            {/* Right side - Search, view options, add button */}
            <div className="flex items-center gap-2 lg:gap-3">
                <SearchBar
                    searchQuery={searchQuery}
                    onSearch={onSearch}
                />

                <ViewModeToggle
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                />

                <AddLinkButton onAddLink={onAddLink} />
            </div>
        </div>
    );
}