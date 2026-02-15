// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../utils/auth';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { app } from '../config/firebase';

const auth = getAuth(app);

const AuthContext = createContext({
    user: null,
    loading: true,
    error: null,
    signIn: async () => { },
    signOut: async () => { },
    updateUser: () => { }
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Refs to prevent duplicate operations
    const syncAttemptRef = useRef(false);
    const authInitializedRef = useRef(false);
    const lastUserIdRef = useRef(null);

    useEffect(() => {
        // Only initialize once
        if (authInitializedRef.current) return;
        authInitializedRef.current = true;

        let unsubscribe;
        let authServiceUnsubscribe;

        const initializeAuth = async () => {
            try {
                console.log('🔐 Initializing auth context...');

                // Ensure AuthService is initialized
                await AuthService.ensureInitialized();

                // Set up Firebase auth listener
                unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                    // Only log if user state actually changed
                    const userStateChanged = firebaseUser ?
                        firebaseUser.uid !== lastUserIdRef.current :
                        lastUserIdRef.current !== null;

                    if (userStateChanged) {
                        console.log('🔄 Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
                        lastUserIdRef.current = firebaseUser?.uid || null;
                    }

                    if (!firebaseUser) {
                        // User is signed out
                        setUser(null);
                        setLoading(false);
                        setError(null);
                        syncAttemptRef.current = false;
                        return;
                    }

                    // Check if we already have complete user data
                    const currentUser = AuthService.getCurrentUser();

                    if (currentUser && currentUser.id === firebaseUser.uid && currentUser._syncedWithBackend) {
                        // We have complete user data already
                        if (!user || user.id !== currentUser.id) {
                            setUser(currentUser);
                        }
                        setLoading(false);
                        setError(null);
                        return;
                    }

                    // Check if we're already syncing
                    if (syncAttemptRef.current) {
                        return;
                    }

                    // User exists but we need to get/sync their data
                    if (!currentUser || currentUser.id !== firebaseUser.uid) {
                        syncAttemptRef.current = true;

                        try {
                            // Wait a moment for AuthService to process the auth state change
                            await new Promise(resolve => setTimeout(resolve, 1500));

                            let userData = AuthService.getCurrentUser();

                            // If still no user data or it's incomplete, try backend sync
                            if (!userData || !userData._syncedWithBackend) {
                                console.log('⚠️ Syncing user data with backend...');
                                const syncResult = await AuthService.retryBackendSync();

                                if (syncResult.success) {
                                    userData = AuthService.getCurrentUser();
                                }
                            }

                            if (userData) {
                                setUser(userData);
                                setError(null);
                            } else {
                                // Fallback to Firebase data
                                console.warn('Using Firebase user data as fallback');
                                setUser({
                                    id: firebaseUser.uid,
                                    email: firebaseUser.email,
                                    name: firebaseUser.displayName,
                                    avatar_url: firebaseUser.photoURL,
                                    _fallback: true
                                });
                            }
                        } catch (error) {
                            console.error('Error syncing user data:', error);

                            // Use Firebase data as fallback
                            setUser({
                                id: firebaseUser.uid,
                                email: firebaseUser.email,
                                name: firebaseUser.displayName,
                                avatar_url: firebaseUser.photoURL,
                                _fallback: true
                            });
                        } finally {
                            syncAttemptRef.current = false;
                            setLoading(false);
                        }
                    } else {
                        // We have user data
                        setUser(currentUser);
                        setLoading(false);
                        setError(null);
                    }
                });

                // Listen to AuthService changes for backend sync updates
                authServiceUnsubscribe = AuthService.onAuthStateChange((currentUser) => {
                    // Only update if we have a new user or the user data has been enhanced
                    if (currentUser) {
                        setUser(prevUser => {
                            // Don't update if it's the same user with same sync status
                            if (prevUser &&
                                prevUser.id === currentUser.id &&
                                prevUser._syncedWithBackend === currentUser._syncedWithBackend) {
                                return prevUser;
                            }

                            // Update if user is new or has been synced
                            if (!prevUser ||
                                prevUser._fallback ||
                                (currentUser._syncedWithBackend && !prevUser._syncedWithBackend)) {
                                console.log('✅ User data updated:', currentUser.email);
                                return currentUser;
                            }

                            return prevUser;
                        });
                    } else if (user) {
                        // User was logged out
                        setUser(null);
                        setError(null);
                    }
                });

            } catch (error) {
                console.error('❌ Auth initialization error:', error);
                setError('Failed to initialize authentication');
                setLoading(false);
            }
        };

        initializeAuth();

        // Cleanup
        return () => {
            if (unsubscribe) unsubscribe();
            if (authServiceUnsubscribe) authServiceUnsubscribe();
        };
    }, []); // Empty dependency array - only run once

    const signIn = async (email, password, rememberMe = true) => {
        setLoading(true);
        setError(null);

        try {
            const response = await AuthService.login({ email, password, rememberMe });

            if (response.success) {
                // The auth state listener will handle updating the user
                return { success: true, message: response.message };
            } else {
                const errorMessage = response.error?.message || 'Login failed';
                setError(errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            const errorMessage = error.message || 'An unexpected error occurred';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        setLoading(true);
        setError(null);

        try {
            await AuthService.logout();
            setUser(null);
            navigate('/');
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            const errorMessage = 'Failed to sign out. Please try again.';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const updateUser = (updates) => {
        if (user) {
            setUser(prevUser => ({ ...prevUser, ...updates }));
        }
    };

    // Clear error after a timeout
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const value = {
        user,
        loading,
        error,
        signIn,
        signOut,
        updateUser,
        isAuthenticated: !!user,
        isEmailVerified: user?.email_verified ?? false
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;