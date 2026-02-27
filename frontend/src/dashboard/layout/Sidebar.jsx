// src/dashboard/layout/Sidebar.jsx
import SidebarBranding from '../components/sidebar/SidebarBranding';
import SidebarSearch from '../components/sidebar/SidebarSearch';
import Navigation from '../components/sidebar/Navigation';
import Collections from '../components/sidebar/Collections';
import SidebarFooter from '../components/sidebar/SidebarFooter';

export default function Sidebar({
  stats, activeView, onViewChange, folders,
  onTogglePin, onToggleStar, onOpenCommandPalette,
  onAddLink, onCreateFolder,
}) {
  return (
    <div className="w-[240px] lg:w-[260px] flex-shrink-0 border-r border-gray-800/60
                     bg-[#0a0a0a] flex flex-col select-none">
      <SidebarBranding />
      <SidebarSearch onOpenCommandPalette={onOpenCommandPalette} />
      <Navigation stats={stats} activeView={activeView} onViewChange={onViewChange} />
      <Collections
        folders={folders}
        onTogglePin={onTogglePin}
        onToggleStar={onToggleStar}
        onAddLink={onAddLink}
        onCreateFolder={onCreateFolder}
      />
      <SidebarFooter onAddLink={onAddLink} onCreateFolder={onCreateFolder} />
    </div>
  );
}