// frontend/src/public-site/pages/NotFound.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PublicLayout from '../layout/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-[radial-gradient(ellipse,rgba(113,60,207,0.05),transparent_70%)]" />
          <div className="absolute inset-0 bg-dot-pattern opacity-30" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative text-center px-5"
        >
          <p className="text-[140px] sm:text-[180px] font-extrabold leading-none tracking-[-0.05em] text-white/[0.03] select-none">
            404
          </p>

          <div className="-mt-12 sm:-mt-16">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Page not found
            </h1>
            <p className="mt-3 text-[15px] text-gray-500 max-w-sm mx-auto">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14px] font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-light active:scale-[0.98]"
            >
              <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go home
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-[14px] font-semibold text-gray-300 transition-all hover:bg-white/[0.06] hover:text-white"
            >
              Dashboard
            </Link>
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
}