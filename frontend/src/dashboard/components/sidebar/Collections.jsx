// src/dashboard/components/sidebar/Collections.jsx

import { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useContextMenu } from '../common/ContextMenu';
import toast from 'react-hot-toast';

const MAX_SLOTS = 6;

export default function Collections({
    folders = [],
    onTogglePin,
    onToggleStar,
    onAddLink,
    onNavigate,
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const contextMenu = useContextMenu();

    // ── Derive display list: pinned first, then recent ──────
    const displayItems = useMemo(() => {
        const pinned = folders
            .filter((f) => f.pinned)
            .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

        const recent = folders
            .filter((f) => !f.pinned)
            .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

        if (pinned.length > 0) {
            const remaining = Math.max(0, MAX_SLOTS - pinned.length);
            return [
                ...pinned.map((f) => ({ ...f, _pinned: true })),
                ...recent.slice(0, remaining).map((f) => ({ ...f, _pinned: false })),
            ];
        }

        return recent.slice(0, MAX_SLOTS).map((f) => ({ ...f, _pinned: false }));
    }, [folders]);

    const handleClick = (folder) => {
        navigate(`/dashboard/collections/${folder.id}`);
        onNavigate?.();
    };

    const isActive = (folder) =>
        location.pathname === `/dashboard/collections/${folder.id}`;

    // ── Context menu for collection items ───────────────
    const handleContextMenu = useCallback((e, folder) => {
        if (!contextMenu?.open) return;

        const collectionPath = `/dashboard/collections/${folder.id}`;
        const fullUrl = `${window.location.origin}${collectionPath}`;

        contextMenu.open(e, [
            {
                id: 'open',
                label: 'Open',
                icon: <CtxIcon d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542" />,
                action: () => {
                    navigate(collectionPath);
                    onNavigate?.();
                },
            },
            {
                id: 'open-tab',
                label: 'Open in new tab',
                icon: <CtxIcon d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />,
                action: () => window.open(fullUrl, '_blank'),
            },
            { type: 'divider' },
            {
                id: 'pin',
                label: folder.pinned ? 'Unpin from sidebar' : 'Pin to sidebar',
                shortcut: 'P',
                active: !!folder.pinned,
                icon: <PinCtxIcon filled={folder.pinned} />,
                action: () => onTogglePin?.(folder.id),
            },
            {
                id: 'star',
                label: folder.starred ? 'Remove from favorites' : 'Add to favorites',
                shortcut: 'S',
                active: !!folder.starred,
                icon: <StarCtxIcon filled={folder.starred} />,
                action: () => onToggleStar?.(folder.id),
            },
            { type: 'divider' },
            {
                id: 'share',
                label: 'Share',
                icon: <CtxIcon d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />,
                action: async () => {
                    try {
                        if (navigator.share) {
                            await navigator.share({ title: folder.name, url: fullUrl });
                        } else {
                            await navigator.clipboard.writeText(fullUrl);
                            toast.success('Link copied');
                        }
                    } catch {
                        /* user cancelled share */
                    }
                },
            },
            {
                id: 'copy-path',
                label: 'Copy path',
                shortcut: '⌘C',
                icon: <CtxIcon d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75" />,
                action: async () => {
                    try {
                        await navigator.clipboard.writeText(fullUrl);
                        toast.success('Path copied');
                    } catch {
                        toast.error('Copy failed');
                    }
                },
            },
            { type: 'divider' },
            { type: 'label', label: 'Create' },
            {
                id: 'new-link',
                label: 'New Link',
                shortcut: '⌘N',
                icon: <CtxIcon d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />,
                action: () => onAddLink?.(),
            },
            {
                id: 'new-folder',
                label: 'New Folder',
                icon: <CtxIcon d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />,
                action: () => toast('New folder — coming soon', { icon: '📁' }),
            },
            {
                id: 'import',
                label: 'Import',
                icon: <CtxIcon d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />,
                action: () => toast('Import — coming soon', { icon: '📥' }),
            },
            { type: 'divider' },
            {
                id: 'properties',
                label: 'Properties',
                icon: <CtxIcon d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />,
                action: () => toast(
                    `${folder.emoji || '📁'} ${folder.name}\nPinned: ${folder.pinned ? 'Yes' : 'No'} · Starred: ${folder.starred ? 'Yes' : 'No'}`,
                    { duration: 3000 },
                ),
            },
        ], { folderId: folder.id });
    }, [contextMenu, navigate, onNavigate, onTogglePin, onToggleStar, onAddLink]);

    // ── Empty state ─────────────────────────────────────────
    if (displayItems.length === 0) {
        return (
            <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800/40">
                <div className="px-5 py-3 flex-shrink-0">
                    <span className="text-[11px] font-medium text-gray-600
                                     uppercase tracking-wider">
                        Collections
                    </span>
                </div>
                <div className="text-center py-10 px-4">
                    <div className="w-9 h-9 mx-auto rounded-lg bg-gray-800/30
                                    border border-gray-800/40
                                    flex items-center justify-center mb-2.5">
                        <svg className="w-4 h-4 text-gray-600" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M2.25 12.75V12A2.25 2.25 0 014.5
                                   9.75h15A2.25 2.25 0 0121.75
                                   12v.75m-8.69-6.44l-2.12-2.12a1.5
                                   1.5 0 00-1.061-.44H4.5A2.25 2.25 0
                                   002.25 6v12a2.25 2.25 0
                                   002.25 2.25h15A2.25 2.25 0
                                   0021.75 18V9a2.25 2.25 0
                                   00-2.25-2.25h-5.379a1.5 1.5 0
                                   01-1.06-.44z" />
                        </svg>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                        Open or pin folders to<br />see them here
                    </p>
                </div>
            </div>
        );
    }

    // ── Folder list ─────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800/40">
            <div className="px-5 py-3 flex-shrink-0">
                <span className="text-[11px] font-medium text-gray-600
                                 uppercase tracking-wider">
                    Collections
                </span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent
                            scrollbar-thumb-gray-800 px-3 pb-2 space-y-0.5">
                {displayItems.map((folder) => {
                    const active = isActive(folder);

                    return (
                        <div
                            key={folder.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleClick(folder)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleClick(folder);
                                }
                            }}
                            onContextMenu={(e) => handleContextMenu(e, folder)}
                            className={`w-full flex items-center gap-2.5 px-3 py-[7px]
                                       rounded-lg text-[13px] transition-all group cursor-pointer
                                       ${active
                                    ? 'bg-white/[0.06] text-white'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                                }`}
                        >
                            {/* Emoji */}
                            <span className={`text-sm flex-shrink-0 transition-transform
                                             ${active ? '' : 'opacity-70 group-hover:opacity-100'}
                                             group-hover:scale-110`}>
                                {folder.emoji || '📁'}
                            </span>

                            {/* Name */}
                            <span className="flex-1 text-left truncate font-medium">
                                {folder.name}
                            </span>

                            {/* Star indicator — always visible if starred */}
                            {folder.starred && <StarIndicator />}

                            {/* Pin indicator / toggle */}
                            <PinControl
                                pinned={folder._pinned}
                                onToggle={(e) => {
                                    e.stopPropagation();
                                    onTogglePin?.(folder.id);
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Star indicator (favorite) ───────────────────────────────
function StarIndicator() {
    return (
        <svg className="w-3 h-3 text-amber-500/70 flex-shrink-0"
            fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0
                     00.475.345l5.518.442c.499.04.701.663.321.988l-4.204
                     3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0
                     01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982
                     20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0
                     00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563
                     0 00.475-.345L11.48 3.5z" />
        </svg>
    );
}

// ── Pin indicator / toggle ──────────────────────────────────
// ✅ FIXED: Changed from <button> to <span role="button"> to avoid nesting buttons
function PinControl({ pinned, onToggle }) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onToggle(e);
        }
    };

    if (pinned) {
        return (
            <span
                role="button"
                tabIndex={0}
                onClick={onToggle}
                onKeyDown={handleKeyDown}
                className="flex-shrink-0 p-0.5 rounded transition-colors cursor-pointer
                           text-primary/60 hover:text-primary"
                title="Unpin from sidebar"
            >
                <PinSmIcon />
            </span>
        );
    }
    return (
        <span
            role="button"
            tabIndex={0}
            onClick={onToggle}
            onKeyDown={handleKeyDown}
            className="flex-shrink-0 p-0.5 rounded transition-all cursor-pointer
                       text-gray-700 opacity-0 group-hover:opacity-100
                       hover:text-gray-400"
            title="Pin to sidebar"
        >
            <PinSmIcon />
        </span>
    );
}

// ── Inline pin icon (small) ─────────────────────────────────
function PinSmIcon() {
    return (
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.146.146A.5.5 0 014.5 0h7a.5.5 0 01.5.5c0
                     .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36
                     7.775 13 8.527 13 9.5a.5.5 0 01-.5.5h-4v4.5a.5.5 0
                     01-1 0V10h-4A.5.5 0 013 9.5c0-.973.64-1.725
                     1.17-2.189A5.92 5.92 0 015 6.708V2.277a2.77 2.77 0
                     01-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 01.146-.354z" />
        </svg>
    );
}

// ── Compact icon helper for context-menu items ──────────────
function CtxIcon({ d }) {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

function PinCtxIcon({ filled }) {
    return (
        <svg className="w-4 h-4" viewBox="0 0 16 16"
            fill={filled ? 'currentColor' : 'none'}
            stroke={filled ? 'none' : 'currentColor'}
            strokeWidth={1}>
            <path d="M4.146.146A.5.5 0 014.5 0h7a.5.5 0 01.5.5c0
                     .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36
                     7.775 13 8.527 13 9.5a.5.5 0 01-.5.5h-4v4.5a.5.5 0
                     01-1 0V10h-4A.5.5 0 013 9.5c0-.973.64-1.725
                     1.17-2.189A5.92 5.92 0 015 6.708V2.277a2.77 2.77 0
                     01-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 01.146-.354z" />
        </svg>
    );
}

function StarCtxIcon({ filled }) {
    return (
        <svg className="w-4 h-4"
            fill={filled ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563
                   0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204
                   3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0
                   01-.84.61l-4.725-2.885a.563.563 0 00-.586
                   0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562
                   0 00-.182-.557l-4.204-3.602a.563.563 0
                   01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
    );
}