// src/dashboard/pages/home/components/QuickActions.jsx

import { motion } from 'framer-motion';

export default function QuickActions({ onAddLink, onOpenSearch, onImport }) {
  const actions = [
    {
      id: 'add',
      label: 'Add new link',
      keys: ['⌘', 'N'],
      onClick: onAddLink,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      id: 'search',
      label: 'Search links',
      keys: ['⌘', 'K'],
      onClick: onOpenSearch,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      id: 'import',
      label: 'Import bookmarks',
      keys: ['⌘', 'I'],
      onClick: onImport,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      ),
    },
    {
      id: 'close',
      label: 'Close dialog',
      keys: ['Esc'],
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  ];

  return (
    <section className="rounded-xl border border-gray-800/50 bg-gray-900/20 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/30">
        <h2 className="text-[13px] font-medium text-gray-300">Quick actions</h2>
      </div>

      <div className="p-2">
        {actions.map((action) => {
          const isClickable = !!action.onClick;
          const Wrapper = isClickable ? motion.button : 'div';
          const wrapperProps = isClickable ? { onClick: action.onClick, whileTap: { scale: 0.98 } } : {};

          return (
            <Wrapper
              key={action.id}
              {...wrapperProps}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isClickable ? 'hover:bg-white/[0.03] cursor-pointer group' : 'cursor-default'}`}
            >
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0">
                {action.icon}
              </span>
              <span className="flex-1 text-[13px] text-gray-400 text-left group-hover:text-gray-300 transition-colors">
                {action.label}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {action.keys.map((key, ki) => (
                  <kbd key={ki} className="min-w-[22px] h-[22px] flex items-center justify-center text-[10px] font-mono text-gray-500 bg-gray-800/40 border border-gray-700/40 rounded-[5px] px-1.5 leading-none">
                    {key}
                  </kbd>
                ))}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}