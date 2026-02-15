// src/pages/public/NotFound.jsx
import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-300 mb-4">Page Not Found</h2>
                <p className="text-gray-500 mb-8 max-w-md">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="space-x-4">
                    <Link
                        to="/"
                        className="btn-primary"
                    >
                        Go Home
                    </Link>
                    <Link
                        to="/dashboard"
                        className="btn-secondary"
                    >
                        Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}