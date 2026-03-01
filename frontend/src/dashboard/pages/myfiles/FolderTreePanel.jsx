// src/dashboard/pages/myfiles/FolderTreePanel.jsx
import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOverview } from '../../../hooks/useOverview';
import FoldersService from '../../../services/folders.service';

function displayIcon(icon) {
  if (!icon) return '📁';
  return icon.length <= 2 ? icon : '📁';
}

export default function FolderTreePanel({ isOpen, onClose }) {
  const { folders } = useOverview();
  const navigate = useNavigate();
  const location = useLocation();

  const tree = useMemo(() => {
    if (!folders?.length) return [];
    const map = {};
    folders.forEach(f => { map[f.id] = { ...f, children: [] }; });
    const roots = [];
    folders.forEach(f => {
      if (f.parent_id && map[f.parent_id]) {
        map[f.parent_id].children.push(map[f.id]);
      } else {
        roots.push(map[f.id]);
      }
    });
    return roots;
  }, [folders]);

  const isRootActive = location.pathname === '/dashboard/myfiles';

  if (!isOpen) return null;

  return (
    <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.15 }}
      className="flex-shrink-0 border-r border-white/[0.05] bg-[#09090b] overflow-hidden hidden lg:block">
      <div className="w-[220px] h-full flex flex-col">
        <div className="flex items-center justify-between px-3 h-10 border-b border-white/[0.04] flex-shrink-0">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Folders</span>
          <button onClick={onClose}
            className="p-1 text-gray-600 hover:text-gray-400 rounded transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1 px-1.5">
          <button onClick={() => navigate('/dashboard/myfiles')}
            className={`w-full flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[12px] font-medium transition-colors mb-0.5
              ${isRootActive ? 'bg-white/[0.06] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'}`}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            My Files
          </button>

          {tree.map(f => (
            <TreeNode key={f.id} folder={f} depth={0} currentPath={location.pathname} navigate={navigate} />
          ))}
        </div>
      </div>
    </motion.aside>
  );
}

function TreeNode({ folder, depth, currentPath, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const prefetchTimer = useRef(null);
  const path = `/dashboard/myfiles/${folder.slug}`;
  const isActive = currentPath === path;
  const hasChildren = folder.children?.length > 0;

  const handleMouseEnter = useCallback(() => {
    prefetchTimer.current = setTimeout(() => {
      FoldersService.prefetchFolder(folder.slug);
    }, 200);
  }, [folder.slug]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(prefetchTimer.current);
  }, []);

  return (
    <div>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex items-center gap-1 rounded-md transition-colors group
          ${isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1 text-gray-600 hover:text-gray-400 rounded transition-colors flex-shrink-0">
            <motion.svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </motion.svg>
          </button>
        ) : (
          <div className="w-5 flex-shrink-0" />
        )}
        <button onClick={() => navigate(path)}
          className={`flex-1 flex items-center gap-1.5 py-[5px] pr-2 text-[12px] font-medium truncate
            ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
          <span className="text-xs flex-shrink-0">
            {displayIcon(folder.icon || folder.emoji)}
          </span>
          <span className="truncate">{folder.name}</span>
          {folder.link_count > 0 && (
            <span className="text-[10px] text-gray-700 tabular-nums ml-auto flex-shrink-0">{folder.link_count}</span>
          )}
        </button>
      </div>
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.1 }}
            className="overflow-hidden">
            {folder.children.map(child => (
              <TreeNode key={child.id} folder={child} depth={depth + 1}
                currentPath={currentPath} navigate={navigate} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}