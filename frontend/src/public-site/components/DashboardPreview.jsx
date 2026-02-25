// frontend/src/public-site/components/DashboardPreview.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLLECTIONS = [
  { name: 'Engineering', icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085', count: 432, color: 'text-blue-400' },
  { name: 'Design', icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42', count: 234, color: 'text-purple-400' },
  { name: 'Marketing', icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941', count: 156, color: 'text-emerald-400' },
  { name: 'Reading', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25', count: 89, color: 'text-amber-400' },
];

const LINKS = [
  { id: 1, title: 'Linear Method', url: 'linear.app', desc: 'How Linear builds product', color: 'from-purple-500/10 to-indigo-500/10', iconColor: 'text-purple-400' },
  { id: 2, title: 'Stripe Design System', url: 'stripe.com', desc: 'Design documentation', color: 'from-blue-500/10 to-cyan-500/10', iconColor: 'text-blue-400' },
  { id: 3, title: 'Vercel Documentation', url: 'vercel.com', desc: 'Deploy and scale', color: 'from-gray-500/10 to-gray-400/10', iconColor: 'text-gray-400' },
  { id: 4, title: 'Tailwind CSS v4', url: 'tailwindcss.com', desc: "What's new", color: 'from-cyan-500/10 to-teal-500/10', iconColor: 'text-cyan-400' },
  { id: 5, title: 'React Patterns', url: 'react.dev', desc: 'Advanced patterns', color: 'from-blue-400/10 to-blue-600/10', iconColor: 'text-blue-400' },
  { id: 6, title: 'Figma Updates', url: 'figma.com', desc: 'Latest features', color: 'from-pink-500/10 to-rose-500/10', iconColor: 'text-pink-400' },
];

export default function DashboardPreview() {
  const [hovered, setHovered] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const visibleLinks = isMobile ? LINKS.slice(0, 4) : LINKS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative mx-auto mt-14 sm:mt-16 lg:mt-20"
    >
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent" />
      <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-primary/[0.03] blur-3xl" />

      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#09090b] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <div className="hidden gap-1.5 sm:flex">
            <div className="h-3 w-3 rounded-full bg-white/[0.08]" />
            <div className="h-3 w-3 rounded-full bg-white/[0.08]" />
            <div className="h-3 w-3 rounded-full bg-white/[0.08]" />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 sm:ml-4 sm:flex-none sm:w-64">
            <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[11px] text-gray-500 font-mono">app.savlink.com</span>
          </div>
        </div>

        <div className="flex" style={{ height: isMobile ? 380 : 480 }}>
          {!isMobile && (
            <aside className="w-52 flex-shrink-0 border-r border-white/[0.06] bg-white/[0.01] flex flex-col">
              <div className="border-b border-white/[0.06] p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-[13px] font-semibold text-white">JD</div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-white">John Doe</div>
                    <div className="text-[11px] text-gray-500">2,847 links</div>
                  </div>
                </div>
              </div>

              <div className="p-2.5">
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2 text-[11px] text-gray-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search...</span>
                  <kbd className="ml-auto rounded bg-white/[0.06] px-1 py-px text-[9px] font-mono text-gray-600">⌘K</kbd>
                </div>
              </div>

              <div className="flex-1 px-2.5 overflow-hidden">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Collections</span>
                  <svg className="h-3.5 w-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  {COLLECTIONS.map((c) => (
                    <button key={c.name} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-colors">
                      <svg className={`h-4 w-4 ${c.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                      </svg>
                      <span className="flex-1 text-left truncate">{c.name}</span>
                      <span className="text-[10px] text-gray-600">{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/[0.06] p-3">
                <div className="mb-1.5 flex justify-between text-[10px] text-gray-500">
                  <span>Storage</span>
                  <span>2.3 / 10 GB</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light" initial={{ width: 0 }} animate={{ width: '23%' }} transition={{ duration: 1.2, delay: 1 }} />
                </div>
              </div>
            </aside>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 sm:px-5 py-3">
              <div>
                <h2 className="text-[13px] sm:text-[14px] font-medium text-white">All Links</h2>
                <p className="text-[11px] text-gray-500">2,847 saved</p>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-white hover:bg-primary-light transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Link</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {visibleLinks.map((link, i) => (
                    <motion.div
                      key={link.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.8 + i * 0.06 }}
                      onMouseEnter={() => setHovered(link.id)}
                      onMouseLeave={() => setHovered(null)}
                      className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all"
                    >
                      <div className={`flex h-20 sm:h-24 items-center justify-center bg-gradient-to-br ${link.color}`}>
                        <svg className={`h-8 w-8 ${link.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <AnimatePresence>
                          {hovered === link.id && !isMobile && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute right-2 top-2">
                              <div className="rounded-lg bg-black/60 backdrop-blur-sm p-1.5">
                                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="p-3">
                        <h3 className="truncate text-[13px] font-medium text-white">{link.title}</h3>
                        <p className="mt-0.5 truncate text-[10px] text-gray-500 font-mono">{link.url}</p>
                        <p className="mt-1.5 text-[11px] text-gray-400 line-clamp-1">{link.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="border-t border-white/[0.06] px-4 sm:px-5 py-2 flex items-center justify-between text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Synced
              </span>
              <span>{visibleLinks.length} of 2,847</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}