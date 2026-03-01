// src/dashboard/components/common/MobileBottomNav.jsx
import { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

/*  Exported constant so other components (FAB, content area)
      can offset themselves above the nav  */
export const BOTTOM_NAV_HEIGHT = 56; // Tailwind h-14

export default function MobileBottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(false);

    //  Only render on mobile 
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    //  Haptic feedback (Android / supported browsers) 
    const haptic = useCallback(() => {
        try {
            navigator?.vibrate?.(4);
        } catch { /* silent */ }
    }, []);

    //  Nav items 
    const navItems = useMemo(() => [
        {
            id: 'home',
            label: 'Home',
            path: '/dashboard/home',
            activeIcon: (
                <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 01-1.06
                             1.06l-.97-.97V19.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-3.75h-3v3.75a.75.75
                             0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-6.88l-.97.97a.75.75 0
                             01-1.06-1.06l8.69-8.69z" />
                </svg>
            ),
            inactiveIcon: (
                <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75
                           12M4.5 9.75v10.125c0 .621.504 1.125 1.125
                           1.125H9.75v-4.875c0-.621.504-1.125
                           1.125-1.125h2.25c.621 0 1.125.504 1.125
                           1.125V21h4.125c.621 0 1.125-.504
                           1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
            ),
        },
        {
            id: 'starred',
            label: 'Starred',
            path: '/dashboard/links/starred',
            activeIcon: (
                <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082
                           5.007 5.404.433c1.164.093 1.636 1.545.749
                           2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964
                           2.033-1.96 1.425L12 18.354 7.373
                           21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433
                           2.082-5.006z"
                        clipRule="evenodd" />
                </svg>
            ),
            inactiveIcon: (
                <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 011.04
                           0l2.125 5.111a.563.563 0
                           00.475.345l5.518.442c.499.04.701.663.321.988l-4.204
                           3.602a.563.563 0
                           00-.182.557l1.285 5.385a.562.562 0
                           01-.84.61l-4.725-2.885a.563.563 0
                           00-.586 0L6.982 20.54a.562.562 0
                           01-.84-.61l1.285-5.386a.562.562 0
                           00-.182-.557l-4.204-3.602a.563.563 0
                           01.321-.988l5.518-.442a.563.563 0
                           00.475-.345L11.48 3.5z" />
                </svg>
            ),
        },
        {
            id: 'short',
            label: 'Short',
            path: '/dashboard/links/shortened',
            activeIcon: (
                <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd"
                        d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5
                           4.5a3.75 3.75 0 001.035
                           6.037.75.75 0
                           01-.646 1.353 5.25 5.25 0
                           01-1.449-8.45l4.5-4.5a5.25 5.25 0
                           117.424 7.424l-1.757 1.757a.75.75 0
                           11-1.06-1.06l1.757-1.758a3.75 3.75 0
                           000-5.304zm-7.389 4.267a.75.75 0
                           011-.353 5.25 5.25 0
                           011.449 8.45l-4.5 4.5a5.25 5.25 0
                           11-7.424-7.424l1.757-1.757a.75.75 0
                           111.06 1.06l-1.757 1.758a3.75 3.75 0
                           105.304 5.304l4.5-4.5a3.75 3.75 0
                           00-1.035-6.037.75.75 0 01-.354-1z"
                        clipRule="evenodd" />
                </svg>
            ),
            inactiveIcon: (
                <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                        d="M13.19 8.688a4.5 4.5 0 011.242
                           7.244l-4.5 4.5a4.5 4.5 0
                           01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5
                           4.5 0 00-6.364-6.364l-4.5 4.5a4.5
                           4.5 0 001.242 7.244" />
                </svg>
            ),
        },
        {
            id: 'files',
            label: 'Files',
            path: '/dashboard/myfiles',
            activeIcon: (
                <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0
                             00-3 3V18a3 3 0 003 3h15zM1.5
                             10.146V6a3 3 0 013-3h5.379a2.25 2.25 0
                             011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3
                             3 0 013 3v1.146A4.483 4.483 0 0019.5
                             9h-15a4.483 4.483 0 00-3 1.146z" />
                </svg>
            ),
            inactiveIcon: (
                <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.25 12.75V12A2.25 2.25 0
                           014.5 9.75h15A2.25 2.25 0
                           0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5
                           1.5 0 00-1.061-.44H4.5A2.25 2.25 0
                           002.25 6v12a2.25 2.25 0
                           002.25 2.25h15A2.25 2.25 0
                           0021.75 18V9a2.25 2.25 0
                           00-2.25-2.25h-5.379a1.5 1.5 0
                           01-1.06-.44z" />
                </svg>
            ),
        },
    ], []);

    //  Active-state matcher 
    const isActive = useCallback((item) => {
        const p = location.pathname;
        switch (item.id) {
            case 'home':
                return p === '/dashboard' || p === '/dashboard/' || p === '/dashboard/home';
            case 'starred':
                return p.includes('/links/starred');
            case 'short':
                return p.includes('/links/shortened');
            case 'files':
                return p.includes('/myfiles');
            default:
                return false;
        }
    }, [location.pathname]);

    if (!isMobile) return null;

    return (
        <nav
            className="fixed bottom-0 inset-x-0 z-50 md:hidden select-none"
            role="tablist"
            aria-label="Main navigation"
        >
            {/*  Glassmorphism background  */}
            <div
                className="absolute inset-0 border-t border-white/[0.04]"
                style={{
                    background: 'rgba(10,10,10,0.92)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                }}
            />

            {/*  Items row  */}
            <div
                className="relative flex items-stretch"
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    paddingLeft: 'env(safe-area-inset-left, 0px)',
                    paddingRight: 'env(safe-area-inset-right, 0px)',
                }}
            >
                {navItems.map((item) => {
                    const active = isActive(item);

                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => {
                                if (!active) {
                                    haptic();
                                    navigate(item.path);
                                }
                            }}
                            whileTap={{ scale: 0.88 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`
                                relative flex-1 flex flex-col items-center justify-center
                                gap-[3px] min-h-[52px] py-[6px]
                                outline-none touch-manipulation
                                focus-visible:bg-white/[0.04] rounded-lg
                                transition-colors duration-150
                            `}
                            role="tab"
                            aria-selected={active}
                            aria-label={item.label}
                        >
                            {/*  Top indicator bar  */}
                            {active && (
                                <motion.div
                                    layoutId="mobileNavIndicator"
                                    className="absolute top-0 left-4 right-4 h-[2.5px] rounded-full"
                                    style={{
                                        background: 'var(--color-primary, #6366f1)',
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 420,
                                        damping: 32,
                                        mass: 0.8,
                                    }}
                                />
                            )}

                            {/*  Icon  */}
                            <motion.div
                                animate={{
                                    scale: active ? 1.05 : 1,
                                    y: active ? -0.5 : 0,
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                className={`transition-colors duration-200
                                    ${active ? 'text-primary' : 'text-gray-600'}`}
                            >
                                {active ? item.activeIcon : item.inactiveIcon}
                            </motion.div>

                            {/*  Label  */}
                            <span
                                className={`
                                    text-[10px] leading-none font-medium
                                    transition-colors duration-200
                                    ${active ? 'text-primary' : 'text-gray-600'}
                                `}
                            >
                                {item.label}
                            </span>

                            {/*  Badge (optional)  */}
                            {item.badge != null && item.badge > 0 && (
                                <span
                                    className="absolute top-[5px] left-1/2 ml-[7px]
                                               min-w-[16px] h-[16px] rounded-full bg-red-500
                                               text-white text-[9px] font-bold
                                               flex items-center justify-center px-[4px]
                                               ring-2 ring-[#0a0a0a]"
                                >
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}