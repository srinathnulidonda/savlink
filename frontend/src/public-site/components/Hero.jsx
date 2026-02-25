// frontend/src/public-site/components/Hero.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardPreview from './DashboardPreview';

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[40%] h-[900px] w-[1100px] rounded-full bg-[radial-gradient(ellipse,rgba(113,60,207,0.12),transparent_70%)] animate-glow-pulse" />
        <div className="absolute top-[10%] left-[5%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.05),transparent_65%)]" />
        <div className="absolute top-[10%] right-[5%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.04),transparent_65%)]" />
        <div className="absolute inset-0 bg-dot-pattern" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 pt-32 sm:pt-40 lg:pt-48 pb-16 sm:pb-20">
        <div className="mx-auto max-w-[800px] text-center">
          {/* Badge */}
          <motion.div {...fade(0)} className="mb-8 flex justify-center">
            <span className="group inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/[0.05] px-4 py-1.5 text-[13px] font-medium text-primary-light backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.08]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Trusted by 50k+ professionals
              <svg className="h-3.5 w-3.5 text-primary/60 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            {...fade(0.08)}
            className="text-[clamp(2.75rem,8vw,5.25rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-white text-balance"
          >
            Save links.
            <br />
            <span className="text-gradient">Find them instantly.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            {...fade(0.16)}
            className="mx-auto mt-6 max-w-[520px] text-[clamp(1.05rem,2.5vw,1.25rem)] leading-[1.7] text-gray-400"
          >
            Your personal library for the web. Save, organize, and access
            everything that matters — beautifully.
          </motion.p>

          {/* CTAs */}
          <motion.div
            {...fade(0.24)}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              to="/register"
              className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(113,60,207,0.25)] transition-all hover:shadow-[0_8px_40px_rgba(113,60,207,0.35)] active:scale-[0.98] sm:w-auto"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative flex items-center gap-2">
                Get started free
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-7 py-3.5 text-[15px] font-semibold text-gray-300 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white sm:w-auto"
            >
              See how it works
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            {...fade(0.36)}
            className="mt-14 flex flex-col items-center gap-5 sm:flex-row sm:justify-center"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  'photo-1494790108377-be9c29b29330',
                  'photo-1507003211169-0a1dd7228f2d',
                  'photo-1517841905240-472988babdf9',
                  'photo-1438761681033-6461ffad8d80',
                  'photo-1472099645785-5658abf4ff4e',
                ].map((id, i) => (
                  <img
                    key={i}
                    src={`https://images.unsplash.com/${id}?w=80&h=80&fit=crop&crop=face`}
                    alt=""
                    className="h-8 w-8 rounded-full border-[2px] border-black object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[12px] text-gray-500">
                  Loved by <span className="text-gray-300 font-medium">50,000+</span> users
                </p>
              </div>
            </div>

            <div className="hidden h-5 w-px bg-white/[0.06] sm:block" />

            <div className="flex items-center gap-5 text-[12px] sm:text-[13px] text-gray-500">
              {['Free forever', 'No credit card'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}