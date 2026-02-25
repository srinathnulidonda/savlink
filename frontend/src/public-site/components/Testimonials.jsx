// frontend/src/public-site/components/Testimonials.jsx
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';

const DATA = [
  { id: 1, q: 'Savlink transformed how our team manages resources. The UI is incredibly intuitive.', name: 'Sarah Chen', role: 'Product Designer', co: 'Figma', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
  { id: 2, q: 'Finally a tool that respects my workflow. Keyboard shortcuts save me hours every week.', name: 'Alex Rivera', role: 'Engineering Lead', co: 'Stripe', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face' },
  { id: 3, q: "We replaced three tools with Savlink. It does everything better and it's free.", name: 'Jordan Park', role: 'Developer Advocate', co: 'Vercel', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face' },
  { id: 4, q: 'The auto-categorization is incredible. It organizes links exactly how I would.', name: 'Maya Patel', role: 'Content Lead', co: 'Notion', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face' },
  { id: 5, q: 'All my research in one place with instant search. Absolute game-changer.', name: 'Dr. James Wu', role: 'Research Lead', co: 'DeepMind', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face' },
  { id: 6, q: 'Sharing collections with my team has never been easier or more secure.', name: 'Emma Thompson', role: 'Marketing Director', co: 'Linear', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face' },
];

export default function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const [idx, setIdx] = useState(0);
  const [perView, setPerView] = useState(3);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const update = () => setPerView(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const next = useCallback(() => setIdx((p) => (p + 1) % DATA.length), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, paused]);

  const extended = [...DATA, ...DATA.slice(0, perView)];
  const tx = -(idx * (100 / perView));
  const widthCls = perView === 1 ? 'w-full' : perView === 2 ? 'w-1/2' : 'w-1/3';

  return (
    <section id="testimonials" ref={ref} className="relative bg-black py-20 sm:py-28 lg:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12 sm:mb-14"
        >
          <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
            Loved by thousands
          </h2>
          <p className="mt-4 text-[clamp(1rem,2vw,1.125rem)] text-gray-400">
            Join 50,000+ professionals who trust Savlink every day.
          </p>
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-gray-400">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="font-medium">4.9/5 from 2,847 reviews</span>
          </div>
        </motion.div>

        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <motion.div
            className="flex"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            style={{ transform: `translateX(${tx}%)`, transition: idx === 0 ? 'none' : 'transform 600ms cubic-bezier(0.25,0.1,0.25,1)' }}
          >
            {extended.map((t, i) => (
              <div key={`${t.id}-${i}`} className={`${widthCls} flex-shrink-0 px-2`}>
                <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="flex-1 text-[14px] leading-relaxed text-gray-300 mb-5">"{t.q}"</p>
                  <div className="flex items-center gap-3">
                    <img src={t.img} alt={t.name} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
                    <div>
                      <div className="text-[13px] font-medium text-white">{t.name}</div>
                      <div className="text-[11px] text-gray-500">{t.role}, {t.co}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}