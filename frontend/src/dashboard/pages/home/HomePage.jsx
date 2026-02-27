// src/dashboard/pages/home/HomePage.jsx

import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/context/AuthContext';
import { useHomeData } from './hooks/useHomeData';
import StatsOverview from './components/StatsOverview';
import PinnedLinks from './components/PinnedLinks';
import RecentLinks from './components/RecentLinks';
import ActivityFeed from './components/ActivityFeed';
import CollectionsPreview from './components/CollectionsPreview';
import QuickActions from './components/QuickActions';
import SearchShortcut from './components/SearchShortcut';
import GettingStarted from './components/GettingStarted';
import HomePageSkeleton from './components/HomePageSkeleton';
import ErrorState from '../../components/common/ErrorState';

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useHomeData();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }, []);

  const dateLabel = useMemo(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), []);

  const firstName = user?.name?.split(' ')[0] || '';

  const openCommandPalette = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  }, []);

  const openAddLink = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', metaKey: true, bubbles: true }));
  }, []);

  const openImport = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', metaKey: true, bubbles: true }));
  }, []);

  if (loading) return <HomePageSkeleton />;

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <ErrorState title="Couldn't load dashboard" message={error} onRetry={refetch} />
      </div>
    );
  }

  const hasLinks = (data?.recentLinks?.length || 0) > 0;
  const hasPinned = (data?.pinnedLinks?.length || 0) > 0;
  const hasCollections = (data?.collections?.length || 0) > 0;
  const isNewUser = !hasLinks && !hasPinned && !hasCollections;

  return (
    <div className="h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
      <motion.div
        variants={stagger} initial="initial" animate="animate"
        className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24"
      >
        <motion.header variants={fadeSlide} className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-tight">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-[13px] text-gray-500 mt-1.5 flex items-center gap-1.5">
              <span>{dateLabel}</span>
              {hasLinks && (
                <>
                  <span className="text-gray-700">·</span>
                  <span>{data?.stats?.total || 0} total links</span>
                </>
              )}
            </p>
          </div>
          <SearchShortcut onOpen={openCommandPalette} />
        </motion.header>

        {isNewUser && (
          <motion.div variants={fadeSlide} className="mb-8">
            <GettingStarted onAddLink={openAddLink} onOpenSearch={openCommandPalette} onNavigate={navigate} />
          </motion.div>
        )}

        {!isNewUser && (
          <motion.div variants={fadeSlide}>
            <StatsOverview stats={data?.stats} />
          </motion.div>
        )}

        {hasPinned && (
          <motion.div variants={fadeSlide} className="mt-8">
            <PinnedLinks links={data.pinnedLinks} />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          <div className="lg:col-span-8 space-y-6">
            <motion.div variants={fadeSlide}>
              <RecentLinks links={data?.recentLinks} onAddLink={openAddLink} />
            </motion.div>
            {(hasCollections || hasLinks) && (
              <motion.div variants={fadeSlide}>
                <CollectionsPreview collections={data?.collections} />
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <motion.div variants={fadeSlide}>
              <QuickActions onAddLink={openAddLink} onOpenSearch={openCommandPalette} onImport={openImport} />
            </motion.div>
            <motion.div variants={fadeSlide}>
              <ActivityFeed activities={data?.activities} />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}