// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Eager load the home page
import Home from './pages/public/Home';
import VerifyEmail from './pages/auth/VerifyEmail';

// Lazy load other pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const NotFound = lazy(() => import('./pages/public/NotFound'));

// Enhanced Loading component
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-gray-800 border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// Error Boundary for better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Router Error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
            <p className="text-gray-400 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reload Page
              </button>
            </div>
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-gray-900 p-4 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced redirect handler for SPA routing
function RedirectHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle redirect from 404.html with query parameter
    const params = new URLSearchParams(location.search);
    const redirectPath = params.get('redirect');

    if (redirectPath && redirectPath !== location.pathname) {
      console.log('Redirecting from 404 to:', redirectPath);
      // Clean the URL and navigate to the intended path
      navigate(redirectPath, { replace: true });
      return;
    }

    // Handle hash routing fallback for Vercel 404s
    if (window.location.hash && window.location.hash.length > 1) {
      const hashPath = window.location.hash.substring(1);

      // Only redirect if it's a different path than current
      if (hashPath !== location.pathname && hashPath.startsWith('/')) {
        console.log('Redirecting from hash to:', hashPath);
        // Clear the hash from URL and navigate
        window.history.replaceState(null, '', hashPath);
        navigate(hashPath, { replace: true });
        return;
      }
    }

    // Handle Vercel's routing fallback scenarios
    // If we're on the root with a path parameter that looks like a route
    if (location.pathname === '/' && location.search) {
      const searchParams = new URLSearchParams(location.search);

      // Check for common route patterns in search params
      for (const [key, value] of searchParams) {
        if ((key === 'path' || key === 'route') && value.startsWith('/')) {
          console.log('Redirecting from search param to:', value);
          navigate(value, { replace: true });
          return;
        }
      }
    }

  }, [location, navigate]);

  return null;
}

// Component to handle router enhancements and scroll restoration
function RouterEnhancements() {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top on route change (except for hash links within the same page)
    if (!location.hash) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 0);
    } else {
      // Handle hash links within pages
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.pathname]);

  // Log route changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Route changed to:', location.pathname + location.search + location.hash);
    }
  }, [location]);

  return null;
}

// Enhanced 404 fallback handler
function FallbackHandler() {
  const location = useLocation();

  useEffect(() => {
    // Handle cases where user manually enters invalid URLs
    const path = location.pathname;

    // Common typos and alternative spellings
    const redirectMappings = {
      '/dashbaord': '/dashboard',
      '/dash': '/dashboard',
      '/home': '/',
      '/signin': '/login',
      '/signup': '/register',
      '/log-in': '/login',
      '/sign-up': '/register',
      '/sign-in': '/login'
    };

    // Check for redirect mappings
    if (redirectMappings[path]) {
      console.log('Auto-correcting typo:', path, '->', redirectMappings[path]);
      window.location.replace(redirectMappings[path]);
    }
  }, [location]);

  return null;
}

export default function App() {
  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);

      // Don't show error for network-related issues that are handled elsewhere
      if (event.reason?.message?.includes('Failed to fetch') ||
        event.reason?.message?.includes('NetworkError')) {
        return;
      }

      // Prevent the default browser error handling
      event.preventDefault();
    };

    const handleError = (event) => {
      console.error('Global error:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <AuthProvider>
      <ErrorBoundary>
        <RedirectHandler />
        <RouterEnhancements />
        <FallbackHandler />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Auth callback route for OAuth flows */}
            <Route path="/auth/callback" element={<Login />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Common Redirects for better UX */}
            <Route path="/signin" element={<Navigate to="/login" replace />} />
            <Route path="/signup" element={<Navigate to="/register" replace />} />
            <Route path="/sign-in" element={<Navigate to="/login" replace />} />
            <Route path="/sign-up" element={<Navigate to="/register" replace />} />
            <Route path="/log-in" element={<Navigate to="/login" replace />} />
            <Route path="/app" element={<Navigate to="/dashboard" replace />} />
            <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />
            <Route path="/home" element={<Navigate to="/" replace />} />

            {/* Dashboard alias routes */}
            <Route path="/dash" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dash/*" element={<Navigate to="/dashboard" replace />} />

            {/* Legacy routes if you had any */}
            <Route path="/links" element={<Navigate to="/dashboard" replace />} />
            <Route path="/bookmarks" element={<Navigate to="/dashboard" replace />} />

            {/* Catch all 404 - Must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}