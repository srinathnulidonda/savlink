// frontend/src/public-site/components/Footer.jsx
import { Link } from 'react-router-dom';

const LINKS = {
  Product: [
    { name: 'Features', href: '#features' },
    { name: 'Changelog', href: '/changelog' },
    { name: 'Roadmap', href: '/roadmap' },
  ],
  Resources: [
    { name: 'Documentation', href: '/docs' },
    { name: 'API', href: '/api' },
    { name: 'Status', href: '/status' },
  ],
  Company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
  ],
  Legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ],
};

const SOCIAL = [
  { name: 'Twitter', href: 'https://twitter.com', d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  { name: 'GitHub', href: 'https://github.com', d: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-black">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="py-12 sm:py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
            <div className="sm:col-span-2">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <span className="text-[17px] font-semibold text-white">Savlink</span>
              </Link>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-gray-400">
                Your personal library for the web. Save, organize, and access your important links from anywhere.
              </p>
              <div className="mt-5 flex gap-2.5">
                {SOCIAL.map((s) => (
                  <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg bg-white/[0.04] p-2.5 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white" aria-label={s.name}>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d={s.d} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {Object.entries(LINKS).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="mb-4 text-[13px] font-semibold text-white">{cat}</h3>
                <ul className="space-y-2.5">
                  {items.map((l) => (
                    <li key={l.name}>
                      <Link to={l.href} className="text-[13px] text-gray-400 transition-colors hover:text-white">{l.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-6 sm:flex-row">
          <p className="text-[12px] text-gray-500">© {new Date().getFullYear()} Savlink. All rights reserved.</p>
          <div className="flex gap-5 text-[12px]">
            <Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="text-gray-500 hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}