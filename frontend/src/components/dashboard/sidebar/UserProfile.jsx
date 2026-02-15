// src/components/dashboard/sidebar/UserProfile.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../../utils/auth';
import { useNavigate } from 'react-router-dom';

export default function UserProfile({ user, stats }) {
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await AuthService.logout();
        navigate('/');
    };

    const getInitials = (name) => {
        if (!name) return 'US';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getStatusColor = () => {
        return user?._syncedWithBackend ? 'bg-green-500' : 'bg-yellow-500';
    };

    return (
        <div className="border-b border-gray-900 p-3 lg:p-4 relative">
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="h-9 lg:h-10 w-9 lg:w-10 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="h-9 lg:h-10 w-9 lg:w-10 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-semibold">
                            {getInitials(user?.name)}
                        </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 lg:h-3 w-2.5 lg:w-3 rounded-full ${getStatusColor()} border-2 border-gray-950`}>
                        {user?._syncPending && (
                            <div className="absolute inset-0 rounded-full bg-yellow-500 animate-ping opacity-75"></div>
                        )}
                    </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                        {user?.name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500">
                        {user?.email_verified ? 'Pro' : 'Free'} • {stats.all || 0} links
                    </div>
                </div>

                {/* Dropdown Toggle */}
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-1.5 text-gray-500 hover:text-gray-400 transition-colors"
                    title="Account options"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                </button>
            </div>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {showDropdown && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowDropdown(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute top-full left-3 lg:left-4 right-3 lg:right-4 mt-2 z-20 rounded-lg border border-gray-800 bg-gray-950 shadow-xl"
                        >
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setShowDropdown(false);
                                        navigate('/dashboard/settings');
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-gray-900 hover:text-white rounded-md transition-all"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Settings
                                </button>

                                <button
                                    onClick={() => {
                                        setShowDropdown(false);
                                        navigate('/dashboard/profile');
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-gray-900 hover:text-white rounded-md transition-all"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Profile
                                </button>

                                <div className="border-t border-gray-800 mt-2 pt-2">
                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-all"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}