// src/dashboard/components/header/HeaderDesktop.jsx

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../../../auth/services/auth.service';

// ── View label mapping ──────────────────────────────────────
const VIEW_META = {
    home:       { label: 'Home' },
    myfiles:    { label: 'My Files' },
    all:        { label: 'All Links' },
    starred:    { label: 'Starred' },
    recent:     { label: 'Recent' },
    archive:    { label: 'Archive' },
    collections:{ label: 'Collections' },
    settings:   { label: 'Settings' },
};

// Pages that show the view toggle
const VIEW_TOGGLE_PAGES = ['all', 'starred', 'recent', 'archive', 'myfiles'];

export default function HeaderDesktop({
    user,
    activeView,
    stats,
    searchQuery,
    onSearch,
    viewMode,
    onViewModeChange,
    onAddLink,
    onOpenCommandPalette,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const [profileOpen, setProfileOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const profileRef = useRef(null);
    const searchRef = useRef(null);

    // ── Detect current view from URL ────────────────────────
    const getCurrentView = useCallback(() => {
        const path = location.pathname;
        if (path.includes('/home') || path === '/dashboard' || path === '/dashboard/') return 'home';
        if (path.includes('/myfiles')) return 'myfiles';
        if (path.includes('/all')) return 'all';
        if (path.includes('/starred')) return 'starred';
        if (path.includes('/recent')) return 'recent';
        if (path.includes('/archive')) return 'archive';
        if (path.includes('/collections')) return 'collections';
        if (path.includes('/settings')) return 'settings';
        return 'home';
    }, [location.pathname]);

    const currentView = getCurrentView();
    const viewInfo = VIEW_META[currentView] || { label: 'Dashboard' };
    const showViewToggle = VIEW_TOGGLE_PAGES.includes(currentView);

    // ── Close profile on outside click ──────────────────────
    useEffect(() => {
        if (!profileOpen) return;
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [profileOpen]);

    // ── Close on Escape ─────────────────────────────────────
    useEffect(() => {
        if (!profileOpen) return;
        const handler = (e) => {
            if (e.key === 'Escape') setProfileOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [profileOpen]);

    // ── "/" to focus search ─────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const tag = document.activeElement?.tagName;
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    e.preventDefault();
                    searchRef.current?.focus();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleLogout = async () => {
        setProfileOpen(false);
        await AuthService.logout();
        navigate('/');
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const count = stats[currentView] || stats.all || null;

    return (
        <div className="flex items-center h-14 px-6">

            {/* ── Left: Page title ───────────────────────── */}
            <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
                <h1 className="text-[15px] font-semibold text-white truncate">
                    {viewInfo.label}
                </h1>
                {count != null && count > 0 && (
                    <span className="text-[11px] text-gray-500 tabular-nums bg-gray-800/40 
                                     px-2 py-0.5 rounded-md font-medium">
                        {count.toLocaleString()}
                    </span>
                )}
            </div>

            {/* ── Spacer ─────────────────────────────────── */}
            <div className="flex-1 min-w-[40px]" />

            {/* ── Right: Controls ────────────────────────── */}
            <div className="flex items-center">

                {/* ── Search Bar ─────────────────────────── */}
                <div className="relative">
                    <div
                        className={`flex items-center rounded-lg border transition-all duration-250 ease-out
                                   ${searchFocused
                                ? 'w-[320px] lg:w-[380px] xl:w-[440px] border-gray-700/60 bg-gray-900/70 ring-1 ring-primary/15'
                                : 'w-[260px] lg:w-[320px] xl:w-[380px] border-gray-800/40 bg-gray-900/30 hover:border-gray-700/40 hover:bg-gray-900/40'
                            }`}
                    >
                        {/* Search icon */}
                        <div className="pl-3 pr-1 flex items-center">
                            <svg className={`h-4 w-4 transition-colors ${searchFocused ? 'text-gray-400' : 'text-gray-600'}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Input */}
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search links…"
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            className="flex-1 bg-transparent text-[13px] text-white placeholder-gray-600 
                                       outline-none py-2 pr-2 min-w-0"
                        />

                        {/* Clear / Shortcut */}
                        <div className="pr-2.5 flex items-center">
                            {searchQuery ? (
                                <button
                                    onClick={() => {
                                        onSearch('');
                                        searchRef.current?.focus();
                                    }}
                                    className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors rounded"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            ) : (
                                <kbd className="text-[10px] font-mono text-gray-600 bg-gray-800/50 
                                                border border-gray-700/30 rounded px-1.5 py-0.5 leading-none
                                                hidden lg:inline-block">
                                    /
                                </kbd>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Divider ────────────────────────────── */}
                {showViewToggle && <HeaderDivider className="mx-4" />}

                {/* ── View Toggle ─────────────────────────── */}
                {showViewToggle && (
                    <ViewToggle
                        viewMode={viewMode}
                        onViewModeChange={onViewModeChange}
                    />
                )}

                {/* ── Divider ────────────────────────────── */}
                <HeaderDivider className="mx-4" />

                {/* ── Add Link ───────────────────────────── */}
                <motion.button
                    onClick={onAddLink}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-3.5 py-[7px] text-[13px] font-medium 
                               text-white bg-primary hover:bg-primary-light rounded-lg 
                               transition-colors flex-shrink-0"
                    title="Add new link (⌘N)"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden lg:inline">New Link</span>
                </motion.button>

                {/* ── Divider ────────────────────────────── */}
                <HeaderDivider className="mx-4" />

                {/* ── User Profile ───────────────────────── */}
                <div ref={profileRef} className="relative flex-shrink-0">
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-colors group
                                   ${profileOpen
                                ? 'bg-white/[0.04]'
                                : 'hover:bg-white/[0.03]'
                            }`}
                    >
                        {/* Avatar */}
                        <div className="relative">
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.name}
                                    className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/[0.06]"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary 
                                                flex items-center justify-center ring-1 ring-white/[0.06]">
                                    <span className="text-[11px] font-bold text-white">
                                        {getInitials(user?.name)}
                                    </span>
                                </div>
                            )}
                            {/* Status dot */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full 
                                            border-[2px] border-[#0a0a0a]
                                            ${user?._syncedWithBackend ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>

                        {/* Name */}
                        <div className="hidden xl:block text-left min-w-0">
                            <p className="text-[13px] font-medium text-gray-300 truncate max-w-[100px] leading-tight
                                          group-hover:text-white transition-colors">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-[11px] text-gray-600 truncate max-w-[100px] leading-tight">
                                {user?.email_verified ? 'Pro' : 'Free'}
                            </p>
                        </div>

                        {/* Chevron */}
                        <motion.svg
                            className="h-3 w-3 text-gray-600 hidden xl:block flex-shrink-0"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            animate={{ rotate: profileOpen ? 180 : 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </motion.svg>
                    </button>

                    {/* ── Profile Dropdown ────────────────── */}
                    <AnimatePresence>
                        {profileOpen && (
                            <ProfileDropdown
                                user={user}
                                stats={stats}
                                onClose={() => setProfileOpen(false)}
                                onLogout={handleLogout}
                                onNavigate={(path) => {
                                    setProfileOpen(false);
                                    navigate(path);
                                }}
                                onOpenCommandPalette={() => {
                                    setProfileOpen(false);
                                    onOpenCommandPalette?.();
                                }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}


// ── View Toggle Component ───────────────────────────────────

function ViewToggle({ viewMode, onViewModeChange }) {
    return (
        <div className="flex items-center rounded-lg border border-gray-800/40 bg-gray-900/20 p-[3px]"
            role="radiogroup"
            aria-label="View mode"
        >
            <ViewToggleButton
                active={viewMode === 'grid'}
                onClick={() => onViewModeChange('grid')}
                label="Grid view"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
            </ViewToggleButton>

            <ViewToggleButton
                active={viewMode === 'list'}
                onClick={() => onViewModeChange('list')}
                label="List view"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </ViewToggleButton>
        </div>
    );
}

function ViewToggleButton({ active, onClick, label, children }) {
    return (
        <button
            onClick={onClick}
            className={`relative p-[7px] rounded-md transition-all duration-150
                       ${active
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
            title={label}
            role="radio"
            aria-checked={active}
            aria-label={label}
        >
            {/* Active background */}
            {active && (
                <motion.div
                    layoutId="viewToggleActive"
                    className="absolute inset-0 bg-white/[0.08] rounded-md"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
            )}
            <span className="relative">{children}</span>
        </button>
    );
}


// ── Header Divider ──────────────────────────────────────────

function HeaderDivider({ className = '' }) {
    return (
        <div className={`w-px h-5 bg-gray-800/60 flex-shrink-0 ${className}`} />
    );
}


// ── Profile Dropdown ────────────────────────────────────────

function ProfileDropdown({ user, stats, onClose, onLogout, onNavigate, onOpenCommandPalette }) {
    return (
        <>
            {/* ── Full-screen click blocker ───────────────
                 This sits above ALL content (links, cards, etc.)
                 and prevents any interaction below the dropdown */}
            <div
                className="fixed inset-0 z-[100]"
                onClick={onClose}
            />

            {/* ── Dropdown panel ──────────────────────────
                 z-[110] ensures it's above the blocker */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-[260px] z-[110]
                           rounded-xl border border-gray-700/60 
                           bg-[#111111]
                           shadow-[0_20px_60px_rgba(0,0,0,0.8),0_8px_24px_rgba(0,0,0,0.6)]
                           overflow-hidden"
            >
                {/* User card */}
                <div className="px-4 py-3.5 border-b border-gray-800/60 bg-[#111111]">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.name}
                                className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/[0.06]"
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/80 to-primary 
                                            flex items-center justify-center ring-1 ring-white/[0.06]">
                                <span className="text-xs font-bold text-white">
                                    {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                                </span>
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-white truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-[12px] text-gray-500 truncate mt-0.5">
                                {user?.email || ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full
                                         ${user?.email_verified
                                ? 'bg-primary/10 text-primary'
                                : 'bg-gray-800 text-gray-500'
                            }`}>
                            {user?.email_verified ? 'Pro' : 'Free'}
                        </span>
                        <span className="text-[11px] text-gray-600">
                            · {stats?.all || 0} links saved
                        </span>
                    </div>
                </div>

                {/* Menu */}
                <div className="p-1.5 bg-[#111111]">
                    <DropdownItem
                        icon={<SettingsIcon />}
                        label="Settings"
                        onClick={() => onNavigate('/dashboard/settings')}
                    />
                    <DropdownItem
                        icon={<UserIcon />}
                        label="Profile"
                        onClick={() => onNavigate('/dashboard/profile')}
                    />
                    <DropdownItem
                        icon={<KeyboardIcon />}
                        label="Keyboard shortcuts"
                        shortcut="?"
                        onClick={onOpenCommandPalette}
                    />
                </div>

                {/* Logout */}
                <div className="p-1.5 border-t border-gray-800/60 bg-[#111111]">
                    <DropdownItem
                        icon={<LogoutIcon />}
                        label="Sign out"
                        onClick={onLogout}
                        danger
                    />
                </div>
            </motion.div>
        </>
    );
}

function DropdownItem({ icon, label, shortcut, onClick, danger = false }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors group
                       ${danger
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                }`}
        >
            <span className={`flex-shrink-0 transition-colors
                             ${danger ? '' : 'text-gray-600 group-hover:text-gray-400'}`}>
                {icon}
            </span>
            <span className="flex-1 text-left">{label}</span>
            {shortcut && (
                <kbd className="text-[10px] font-mono text-gray-700 bg-gray-800/60 
                                border border-gray-800/50 rounded px-1.5 py-0.5">
                    {shortcut}
                </kbd>
            )}
        </button>
    );
}


// ── SVG Icons ───────────────────────────────────────────────

function SettingsIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    );
}

function KeyboardIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
    );
}

function LogoutIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
    );
}