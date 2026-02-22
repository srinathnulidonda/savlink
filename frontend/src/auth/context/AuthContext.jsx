// frontend/src/auth/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import apiService from '../../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

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
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken();
          apiService.setAuthToken(token);
          
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            avatar_url: firebaseUser.photoURL,
            email_verified: firebaseUser.emailVerified,
          };
          
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          console.log('🔐 User authenticated:', userData.email);
        } else {
          apiService.removeAuthToken();
          localStorage.removeItem('user');
          setUser(null);
          console.log('🔓 User signed out');
        }
      } catch (error) {
        console.error('🔥 Auth state change error:', error);
        apiService.removeAuthToken();
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    });

    const existingToken = apiService.getAuthToken();
    const existingUser = localStorage.getItem('user');
    
    if (existingToken && existingUser && !initialized) {
      try {
        const userData = JSON.parse(existingUser);
        apiService.setAuthToken(existingToken);
        setUser(userData);
        console.log('🔄 Restored auth state for:', userData.email);
      } catch (error) {
        console.error('🔥 Failed to restore auth state:', error);
        apiService.removeAuthToken();
        localStorage.removeItem('user');
      }
    }

    return unsubscribe;
  }, [initialized]);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      return { success: true, user: result.user };
    } catch (error) {
      console.error('🔥 Sign in error:', error);
      let message = 'Failed to sign in';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
        default:
          message = error.message || 'Failed to sign in';
      }
      
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, name) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (name) {
        await updateProfile(result.user, { displayName: name });
      }
      
      toast.success('Account created successfully!');
      return { success: true, user: result.user };
    } catch (error) {
      console.error('🔥 Sign up error:', error);
      let message = 'Failed to create account';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/weak-password':
          message = 'Password is too weak';
          break;
        default:
          message = error.message || 'Failed to create account';
      }
      
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      toast.success('Welcome!');
      return { success: true, user: result.user };
    } catch (error) {
      console.error('🔥 Google sign in error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, error: null };
      }
      
      const message = error.message || 'Failed to sign in with Google';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success('Signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('🔥 Sign out error:', error);
      const message = error.message || 'Failed to sign out';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error) {
      console.error('🔥 Password reset error:', error);
      let message = 'Failed to send reset email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        default:
          message = error.message || 'Failed to send reset email';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    initialized,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}