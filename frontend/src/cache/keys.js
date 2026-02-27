// src/cache/keys.js

export const KEYS = {
  OVERVIEW: 'overview',
  HOME: 'home',
  STATS: 'stats',
  PINNED: 'pinned',
  STARRED: 'starred',
  RECENT: 'recent',
  FOLDERS: 'folders',
  TAGS: 'tags',
};

export const STALE_TIMES = {
  OVERVIEW: 60_000,
  HOME: 60_000,
  STATS: 120_000,
  FOLDERS: 300_000,
  TAGS: 300_000,
};

export const HOME_KEYS = [
  KEYS.OVERVIEW, KEYS.HOME, KEYS.STATS, KEYS.PINNED,
  KEYS.STARRED, KEYS.RECENT,
];

export const ALL_KEYS = [...HOME_KEYS, KEYS.FOLDERS, KEYS.TAGS];