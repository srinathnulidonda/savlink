// src/app/Providers.jsx - Update the Toaster configuration

import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../auth/context/AuthContext';

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  document.documentElement.classList.add('reduce-motion');
}

export default function Providers({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
            success: {
              style: {
                background: '#ffffff',
                color: '#059669',
                border: '1px solid #d1fae5',
              },
              iconTheme: {
                primary: '#059669',
                secondary: '#ffffff',
              },
            },
            error: {
              style: {
                background: '#ffffff',
                color: '#dc2626',
                border: '1px solid #fecaca',
              },
              iconTheme: {
                primary: '#dc2626',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}