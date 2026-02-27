// src/dashboard/layout/DashboardLayout.jsx
import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileShell from './MobileShell';
import DashboardErrorBoundary from './DashboardErrorBoundary';
import { ContextMenuProvider } from '../components/common/ContextMenu';
import { useOverview } from '../../hooks/useOverview';
import FoldersService from '../../services/folders.service';
import toast from 'react-hot-toast';

export default function DashboardLayout({
  user, stats: externalStats, activeView, onViewChange, onSearch,
  searchQuery, onAddLink, onCreateFolder, onOpenCommandPalette,
  viewMode, onViewModeChange, children,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const { folders, stats: overviewStats, refetch } = useOverview();

  const stats = overviewStats?.all ? overviewStats : externalStats;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleTogglePin = useCallback(async (folderId) => {
    const result = await FoldersService.togglePin(folderId);
    if (result.success) refetch();
    else toast.error(result.error);
  }, [refetch]);

  const handleToggleStar = useCallback(() => {
    toast('Starring folders — coming soon', { icon: '⭐' });
  }, []);

  const folderProps = {
    folders: folders || [],
    onTogglePin: handleTogglePin,
    onToggleStar: handleToggleStar,
  };

  const content = isMobile ? (
    <MobileShell
      user={user} stats={stats} activeView={activeView}
      onViewChange={onViewChange} onSearch={onSearch}
      searchQuery={searchQuery} onAddLink={onAddLink}
      onCreateFolder={onCreateFolder}
      onOpenCommandPalette={onOpenCommandPalette}
      {...folderProps}
    >
      {children}
    </MobileShell>
  ) : (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar
        stats={stats} activeView={activeView}
        onViewChange={onViewChange}
        onOpenCommandPalette={onOpenCommandPalette}
        onAddLink={onAddLink}
        onCreateFolder={onCreateFolder}
        {...folderProps}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user} activeView={activeView} stats={stats}
          searchQuery={searchQuery} onSearch={onSearch}
          viewMode={viewMode} onViewModeChange={onViewModeChange}
          onAddLink={onAddLink} onOpenCommandPalette={onOpenCommandPalette}
        />
        <div className="flex-1 overflow-y-auto bg-black">{children}</div>
      </div>
    </div>
  );

  return (
    <ContextMenuProvider>
      <DashboardErrorBoundary>{content}</DashboardErrorBoundary>
    </ContextMenuProvider>
  );
}