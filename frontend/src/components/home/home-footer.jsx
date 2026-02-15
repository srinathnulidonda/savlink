// src/components/home/home-footer.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function HomeFooter() {
    const [hoveredLink, setHoveredLink] = useState(null);

    const footerLinks = {
        Product: [
            { name: 'Features', href: '#features', badge: null },
            { name: 'Integrations', href: '/integrations', badge: 'New' },
            { name: 'Pricing', href: '/pricing', badge: null },
            { name: 'Changelog', href: '/changelog', badge: 'Updated' },
            { name: 'Roadmap', href: '/roadmap', badge: null },
        ],
        Company: [
            { name: 'About', href: '/about', badge: null },
            { name: 'Blog', href: '/blog', badge: null },
            { name: 'Careers', href: '/careers', badge: 'Hiring' },
            { name: 'Press', href: '/press', badge: null },
            { name: 'Contact', href: '/contact', badge: null },
        ],
        Resources: [
            { name: 'Documentation', href: '/docs', badge: null },
            { name: 'API Reference', href: '/api', badge: null },
            { name: 'Guides', href: '/guides', badge: null },
            { name: 'Status', href: '/status', badge: null },
            { name: 'Support', href: '/support', badge: null },
        ],
        Legal: [
            { name: 'Privacy Policy', href: '/privacy', badge: null },
            { name: 'Terms of Service', href: '/terms', badge: null },
            { name: 'Security', href: '/security', badge: null },
            { name: 'GDPR', href: '/gdpr', badge: null },
            { name: 'Cookie Policy', href: '/cookies', badge: null },
        ],
    };

    const socialLinks = [
        {
            name: 'Twitter',
            href: 'https://twitter.com',
            icon: (
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
        },
        {
            name: 'GitHub',
            href: 'https://github.com',
            icon: (
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
            ),
        },
        {
            name: 'LinkedIn',
            href: 'https://linkedin.com',
            icon: (
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
            ),
        },
        {
            name: 'Discord',
            href: 'https://discord.com',
            icon: (
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
            ),
        },
    ];

    return (
        <footer className="relative border-t border-gray-900 bg-black overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute bottom-0 left-0 h-[200px] w-[200px] sm:h-[300px] sm:w-[300px] rounded-full bg-primary/5 blur-[80px] sm:blur-[120px]" />
                <div className="absolute top-0 right-0 h-[200px] w-[200px] sm:h-[300px] sm:w-[300px] rounded-full bg-purple-600/5 blur-[80px] sm:blur-[120px]" />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Main Footer Content */}
                <div className="py-8 sm:py-12 lg:py-16">
                    {/* Mobile Layout - Centered */}
                    <div className="sm:hidden">
                        {/* Logo - Centered on Mobile */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center text-center mb-8"
                        >
                            <Link to="/" className="inline-flex items-center gap-2 group">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg group-hover:blur-xl transition-all duration-300" />
                                    <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light shadow-lg">
                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-base font-semibold text-white">
                                    Savlink
                                </span>
                            </Link>
                            <p className="mt-4 text-xs text-gray-400 max-w-xs">
                                Your personal library for the web. Save, organize, and access your important links from anywhere.
                            </p>

                            {/* Social Links - Centered on Mobile */}
                            <div className="mt-6 flex items-center justify-center gap-3">
                                {socialLinks.map((social) => (
                                    <motion.a
                                        key={social.name}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.1, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="group relative rounded-lg bg-gray-900/50 p-2 text-gray-400 transition-all hover:bg-gray-900 hover:text-white border border-gray-800 hover:border-gray-700"
                                        aria-label={social.name}
                                    >
                                        <span className="sr-only">{social.name}</span>
                                        {social.icon}
                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-purple-600/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                                    </motion.a>
                                ))}
                            </div>
                        </motion.div>

                        {/* Links Grid - Mobile */}
                        <div className="grid grid-cols-2 gap-8">
                            {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
                                <motion.div
                                    key={category}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                                >
                                    <h3 className="text-xs font-semibold text-white mb-3">
                                        {category}
                                    </h3>
                                    <ul className="space-y-2">
                                        {links.map((link) => (
                                            <li key={link.name}>
                                                <Link
                                                    to={link.href}
                                                    className="inline-flex items-center gap-2 text-[10px] text-gray-400 transition-all hover:text-white"
                                                >
                                                    <span className="relative">
                                                        {link.name}
                                                        {link.badge && (
                                                            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold text-primary border border-primary/20">
                                                                {link.badge}
                                                            </span>
                                                        )}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Layout - Original */}
                    <div className="hidden sm:grid gap-8 sm:gap-12 grid-cols-2 md:grid-cols-6">
                        {/* Brand Column - Desktop */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="col-span-2 md:col-span-2"
                        >
                            <Link to="/" className="inline-flex items-center gap-2 group">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg group-hover:blur-xl transition-all duration-300" />
                                    <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light shadow-lg">
                                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-base sm:text-lg lg:text-xl font-semibold text-white">
                                    Savlink
                                </span>
                            </Link>
                            <p className="mt-4 text-xs sm:text-sm text-gray-400 max-w-xs">
                                Your personal library for the web. Save, organize, and access your important links from anywhere.
                            </p>

                            {/* Social Links - Desktop */}
                            <div className="mt-6 flex items-center gap-3">
                                {socialLinks.map((social) => (
                                    <motion.a
                                        key={social.name}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.1, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="group relative rounded-lg bg-gray-900/50 p-2 text-gray-400 transition-all hover:bg-gray-900 hover:text-white border border-gray-800 hover:border-gray-700"
                                        aria-label={social.name}
                                    >
                                        <span className="sr-only">{social.name}</span>
                                        {social.icon}
                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-purple-600/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                                    </motion.a>
                                ))}
                            </div>
                        </motion.div>

                        {/* Links Columns - Desktop */}
                        {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
                            <motion.div
                                key={category}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                                className="col-span-1"
                            >
                                <h3 className="text-xs sm:text-sm font-semibold text-white mb-3 sm:mb-4">
                                    {category}
                                </h3>
                                <ul className="space-y-2 sm:space-y-3">
                                    {links.map((link) => (
                                        <li key={link.name}>
                                            <Link
                                                to={link.href}
                                                onMouseEnter={() => setHoveredLink(`${category}-${link.name}`)}
                                                onMouseLeave={() => setHoveredLink(null)}
                                                className="group relative inline-flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm text-gray-400 transition-all hover:text-white"
                                            >
                                                {hoveredLink === `${category}-${link.name}` && (
                                                    <motion.span
                                                        layoutId="footer-hover"
                                                        className="absolute -left-3 text-primary"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        →
                                                    </motion.span>
                                                )}
                                                <span className="relative">
                                                    {link.name}
                                                    {link.badge && (
                                                        <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold text-primary border border-primary/20">
                                                            {link.badge}
                                                        </span>
                                                    )}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-900 py-6 sm:py-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-[10px] sm:text-xs text-gray-400 text-center sm:text-left">
                            <span>© {new Date().getFullYear()} Savlink. All rights reserved.</span>
                            <span className="hidden sm:inline">•</span>
                            <span>Built with ❤️ for link savers</span>
                        </div>

                        {/* Quick Links */}
                        <div className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-xs">
                            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
                                Privacy
                            </Link>
                            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
                                Terms
                            </Link>
                            <Link to="/sitemap" className="text-gray-400 hover:text-white transition-colors">
                                Sitemap
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}