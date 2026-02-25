// frontend/src/public-site/components/Features.jsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/* ── Feature Data with inline icons (same style as Platforms Bar) ── */
const FEATURES = [
  {
    id: 'save',
    title: 'Save in one click',
    desc: 'Capture any link from your browser, phone, or just paste a URL. Titles, favicons, and metadata are grabbed automatically.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        <rect x="4" y="4" width="16" height="16" rx="3" strokeLinecap="round" />
      </svg>
    ),
    span: 'col-span-full lg:col-span-4',
    featured: true,
  },
  {
    id: 'organize',
    title: 'Smart collections',
    desc: 'Auto-categorize links into folders. Add custom tags, notes, and color-coded labels.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        <path strokeLinecap="round" d="M9 13h6m-3-3v6" />
      </svg>
    ),
    span: 'col-span-full xs:col-span-1 lg:col-span-2',
  },
  {
    id: 'search',
    title: 'Instant search',
    desc: 'Full-text search across all links, notes, and tags in under 50ms.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M16.5 16.5L20 20" />
      </svg>
    ),
    span: 'col-span-full xs:col-span-1 lg:col-span-2',
  },
  {
    id: 'privacy',
    title: 'Private & secure',
    desc: 'End-to-end encryption. No tracking, no ads, no data selling.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V7l8-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    ),
    span: 'col-span-full xs:col-span-1 lg:col-span-2',
  },
  {
    id: 'shorten',
    title: 'Short links',
    desc: 'Generate branded short URLs with built-in click analytics.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" d="M9 17H7a5 5 0 010-10h2m6 0h2a5 5 0 010 10h-2" />
        <path strokeLinecap="round" d="M8 12h8" />
      </svg>
    ),
    span: 'col-span-full xs:col-span-1 lg:col-span-2',
  },
  {
    id: 'sync',
    title: 'Sync everywhere',
    desc: 'Real-time sync keeps your library perfectly in sync across desktop, tablet, and phone.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0114.3-4.8L20 5v4h-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 01-14.3 4.8L4 19v-4h4" />
      </svg>
    ),
    span: 'col-span-full lg:col-span-4',
    featured: true,
  },
];

const PLATFORMS = [
  {
    name: 'Chrome',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <path d="M21.17 8H12" />
        <path d="M6.5 3.5L12 12" />
        <path d="M6.5 20.5L12 12" />
      </svg>
    ),
  },
  {
    name: 'Mobile',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path strokeLinecap="round" d="M10 18h4" />
      </svg>
    ),
  },
  {
    name: 'Web App',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="20" height="14" rx="2" />
        <path strokeLinecap="round" d="M8 21h8M12 18v3" />
      </svg>
    ),
  },
  {
    name: 'API',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l4 4-4 4M8 13l-4 4 4 4" />
        <path strokeLinecap="round" d="M14 4l-4 16" />
      </svg>
    ),
  },
];

const STATS = [
  { value: '50M+', label: 'Links saved' },
  { value: '99.99%', label: 'Uptime' },
  { value: '<50ms', label: 'Search' },
  { value: '4.9★', label: 'Rating' },
];

/* ── Feature Card ── */
function FeatureCard({ feature, delay, inView }) {
  const { title, desc, icon, span, featured } = feature;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] ${span}`}
    >
      <div className={featured ? 'flex flex-col sm:flex-row sm:items-start sm:gap-5' : ''}>
        {/* Icon container - matching Platforms Bar style */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-gray-400 transition-colors group-hover:border-white/[0.12] group-hover:text-white">
          {icon}
        </div>

        <div className={featured ? 'mt-4 sm:mt-0 flex-1' : ''}>
          <h3 className={`font-semibold text-white ${featured ? 'text-[16px] sm:text-[17px]' : 'text-[15px] mt-4'}`}>
            {title}
          </h3>
          <p className={`mt-2 leading-relaxed text-gray-400 ${featured ? 'text-[13px] sm:text-[14px] max-w-lg' : 'text-[13px]'}`}>
            {desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Platforms Bar ── */
function PlatformsBar({ inView }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
    >
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Available everywhere</h3>
          <p className="mt-1 text-[12px] sm:text-[13px] text-gray-400">
            Browser, mobile, web, and API access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {PLATFORMS.map((p) => (
            <div
              key={p.name}
              className="group/p relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-gray-400 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
            >
              {p.icon}
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover/p:opacity-100">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Stats Bar ── */
function StatsBar({ inView }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: 0.55 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]"
    >
      <div className="grid grid-cols-2 xs:grid-cols-4 gap-6">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
            className="text-center"
          >
            <div className="text-xl sm:text-2xl font-bold text-white">{s.value}</div>
            <div className="mt-1 text-[11px] sm:text-[12px] text-gray-500">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Main Features Section ── */
export default function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="features" ref={ref} className="relative bg-black py-20 sm:py-28 lg:py-32">
      {/* Top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
            Everything you need
          </h2>
          <p className="mt-4 text-[clamp(1rem,2vw,1.125rem)] text-gray-400">
            Simple tools for saving and organizing your digital life.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard
              key={f.id}
              feature={f}
              delay={0.08 + i * 0.05}
              inView={inView}
            />
          ))}
        </div>

        {/* Bottom Row */}
        <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <PlatformsBar inView={inView} />
          <StatsBar inView={inView} />
        </div>
      </div>
    </section>
  );
}