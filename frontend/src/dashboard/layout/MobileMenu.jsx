// src/dashboard/layout/MobileMenu.jsx
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService } from '../../auth/services/auth.service';
import SidebarBranding from '../components/sidebar/SidebarBranding';
import Navigation from '../components/sidebar/Navigation';
import Collections from '../components/sidebar/Collections';

const BOTTOM_NAV_IDS = ['home', 'myfiles', 'starred'];

export default function MobileMenu({
  isOpen, onClose, stats, activeView, onViewChange,
  folders, onTogglePin, onToggleStar, onAddLink, onCreateFolder,
}) {
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    onClose();
    await AuthService.logout();
    navigate('/');
  }, [onClose, navigate]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed left-0 top-0 z-50 h-full w-[280px] bg-[#0a0a0a]
                   border-r border-gray-800/60 md:hidden overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between pr-3 flex-shrink-0">
          <SidebarBranding />
          <button onClick={onClose}
            className="p-1.5 text-gray-600 hover:text-gray-400 rounded-lg hover:bg-gray-800/50 transition-colors"
            aria-label="Close menu">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
          <Navigation stats={stats} activeView={activeView} onViewChange={onViewChange} exclude={BOTTOM_NAV_IDS} />
          <Collections
            folders={folders}
            onTogglePin={onTogglePin}
            onToggleStar={onToggleStar}
            onAddLink={onAddLink}
            onCreateFolder={onCreateFolder}
            onNavigate={onClose}
          />
        </div>

        <div className="flex-shrink-0 border-t border-gray-800/40">
          <div className="p-2 space-y-0.5">
            <FooterButton
              icon={<SettingsIcon />} label="Settings"
              onClick={() => { navigate('/dashboard/settings'); onClose(); }}
            />
            <FooterButton icon={<LogoutIcon />} label="Sign out" onClick={handleLogout} danger />
          </div>
          <div className="flex items-center justify-center gap-2 px-3 py-3 border-t border-gray-800/30">
            <Link to="/terms" className="text-[10px] text-gray-700 hover:text-gray-500 transition-colors">Terms</Link>
            <span className="text-gray-800 text-[10px]">·</span>
            <Link to="/privacy" className="text-[10px] text-gray-700 hover:text-gray-500 transition-colors">Privacy</Link>
            <span className="text-gray-800 text-[10px]">·</span>
            <span className="text-[10px] text-gray-700">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function FooterButton({ icon, label, onClick, danger = false }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors touch-manipulation
        ${danger ? 'text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`}>
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}