// frontend/src/public-site/components/Navbar.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../auth/services/auth.service';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { app } from '../../config/firebase';

// Import your logo
import logo from '../../assets/savlink.png';

const auth = getAuth(app);

const NAV_LINKS = [
  { name: 'Features', href: '#features' },
  { name: 'Reviews', href: '#testimonials' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);
  useEffect(() => setMobileOpen(false), [location]);
  
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const scrollTo = useCallback((e, href) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  }, []);

  const logout = async () => { await AuthService.logout(); navigate('/'); };

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-2xl border-b border-white/[0.06]' : ''}`}>
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
          
          {/* Logo - Responsive sizing with desktop adjustment */}
          <Link to="/" className="flex items-center gap-2.5 md:-mt-1">
            <img 
              src={logo}
              alt="Savlink"
              className="h-6 w-auto sm:h-7 md:h-8"
            />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.name} href={l.href} onClick={(e) => scrollTo(e, l.href)} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-gray-400 transition-colors hover:text-white">
                {l.name}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2.5 md:flex">
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-lg bg-white/5" />
            ) : user ? (
              <>
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-white/[0.12] active:scale-[0.97]">
                  Dashboard
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <button onClick={logout} className="rounded-lg px-3 py-2 text-[13px] text-gray-400 hover:text-white transition-colors">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-gray-400 hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link to="/register" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-light active:scale-[0.97]">
                  Get started
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileOpen((v) => !v)} className="relative flex items-center justify-center rounded-lg p-2 text-gray-400 hover:text-white md:hidden" aria-label="Menu">
            <div className="relative h-5 w-5">
              <span className={`absolute block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'top-[9px] rotate-45' : 'top-1'}`} />
              <span className={`absolute top-[9px] block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`absolute block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'top-[9px] -rotate-45' : 'top-[17px]'}`} />
            </div>
          </button>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-white/[0.06] bg-black/95 backdrop-blur-2xl md:hidden"
            >
              <div className="px-5 pb-6 pt-3 space-y-1">
                {NAV_LINKS.map((l) => (
                  <a key={l.name} href={l.href} onClick={(e) => scrollTo(e, l.href)} className="flex items-center rounded-xl px-4 py-3 text-[15px] font-medium text-gray-300 transition-colors hover:bg-white/[0.04] hover:text-white">
                    {l.name}
                  </a>
                ))}
                <div className="space-y-2.5 border-t border-white/[0.06] pt-4 mt-3">
                  {loading ? (
                    <div className="h-12 animate-pulse rounded-xl bg-white/5" />
                  ) : user ? (
                    <>
                      <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-[15px] font-medium text-white">Dashboard</Link>
                      <button onClick={() => { logout(); setMobileOpen(false); }} className="flex w-full items-center justify-center rounded-xl border border-white/[0.08] px-4 py-3 text-[15px] font-medium text-gray-300 hover:bg-white/[0.04]">Sign out</button>
                    </>
                  ) : (
                    <>
                      <Link to="/register" onClick={() => setMobileOpen(false)} className="flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-[15px] font-medium text-white shadow-lg shadow-primary/25">Get started — it's free</Link>
                      <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center justify-center rounded-xl border border-white/[0.08] px-4 py-3 text-[15px] font-medium text-gray-300 hover:bg-white/[0.04]">Sign in</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}