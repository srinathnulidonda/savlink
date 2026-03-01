// src/dashboard/layout/MobileShell.jsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import HeaderMobile from '../components/header/HeaderMobile';
import MobileMenu from './MobileMenu';
import MobileAddButton from '../components/common/MobileAddButton';
import MobileBottomNav, { BOTTOM_NAV_HEIGHT } from '../components/common/MobileBottomNav';

export default function MobileShell({
  user, stats, activeView, onViewChange, onSearch,
  searchQuery, onAddLink, onCreateFolder, onOpenCommandPalette,
  folders, onTogglePin, onToggleStar, children,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Detect if we're inside a folder (collection) view
  const isInFolderView = /^\/dashboard\/myfiles\/[^/]+/.test(location.pathname);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  return (
    <div className="flex h-[100dvh] bg-black overflow-hidden relative">
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Only show global header when NOT in folder view */}
        {!isInFolderView && (
          <header
            className="flex-shrink-0 border-b border-gray-800/40 bg-[#0a0a0a]/95 relative z-30"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <HeaderMobile
              user={user} searchQuery={searchQuery} onSearch={onSearch}
              onMenuClick={() => setIsMobileMenuOpen(true)}
              onOpenCommandPalette={onOpenCommandPalette}
            />
          </header>
        )}

        {/* Content area — add top padding when in folder view for the folder header */}
        <div
          className="flex-1 overflow-y-auto bg-black overscroll-contain -webkit-overflow-scrolling-touch"
          style={{
            paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 8px)`,
            paddingTop: isInFolderView ? 'env(safe-area-inset-top, 0px)' : undefined,
          }}
        >
          {children}
        </div>
      </div>

      <MobileBottomNav />
      <MobileAddButton
        onAddLink={onAddLink}
        onCreateFolder={onCreateFolder}
        useSafeArea
        bottomOffset={BOTTOM_NAV_HEIGHT}
      />

      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            stats={stats} activeView={activeView}
            onViewChange={(view) => { onViewChange(view); setIsMobileMenuOpen(false); }}
            folders={folders || []}
            onTogglePin={onTogglePin}
            onToggleStar={onToggleStar}
            onAddLink={onAddLink}
            onCreateFolder={() => { setIsMobileMenuOpen(false); onCreateFolder?.(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}