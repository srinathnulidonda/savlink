// src/cache/index.js

export { cache } from './store';
export { KEYS, STALE_TIMES, HOME_KEYS, ALL_KEYS } from './keys';
export { useCachedData } from './hooks';

import { cache } from './store';
import { KEYS, HOME_KEYS, ALL_KEYS } from './keys';

function dispatch(keys) {
  window.dispatchEvent(new CustomEvent('cache:invalidate', { detail: { keys } }));
}

export function invalidateHome() {
  const keys = [...HOME_KEYS, KEYS.ROOT_ITEMS];
  cache.drop(...keys);
  dispatch(keys);
}

export function invalidateLinks() {
  const keys = [KEYS.OVERVIEW, KEYS.HOME, KEYS.STATS, KEYS.RECENT, KEYS.ROOT_ITEMS];
  cache.drop(...keys);
  dispatch(keys);
}

export function invalidatePinned() {
  const keys = [KEYS.OVERVIEW, KEYS.HOME, KEYS.PINNED];
  cache.drop(...keys);
  dispatch(keys);
}

export function invalidateStarred() {
  const keys = [KEYS.OVERVIEW, KEYS.HOME, KEYS.STARRED, KEYS.STATS];
  cache.drop(...keys);
  dispatch(keys);
}

export function invalidateFolders() {
  const keys = [KEYS.OVERVIEW, KEYS.FOLDERS, KEYS.HOME, KEYS.STATS, KEYS.ROOT_ITEMS];
  cache.drop(...keys);
  cache.dropByPrefix(KEYS.FOLDER_DETAIL);
  cache.dropByPrefix(KEYS.FOLDER_LINKS);
  dispatch(keys);
}

export function invalidateTags() {
  const keys = [KEYS.OVERVIEW, KEYS.TAGS, KEYS.STATS];
  cache.drop(...keys);
  dispatch(keys);
}

export function invalidateAll() {
  cache.drop(...ALL_KEYS);
  cache.dropByPrefix(KEYS.FOLDER_DETAIL);
  cache.dropByPrefix(KEYS.FOLDER_LINKS);
  dispatch(ALL_KEYS);
}

export function invalidateFolderBySlug(slug) {
  if (!slug) return;
  cache.dropByPrefix(KEYS.FOLDER_DETAIL + slug);
  cache.dropByPrefix(KEYS.FOLDER_LINKS + slug);
}

export function invalidateFolderCaches() {
  cache.dropByPrefix(KEYS.FOLDER_DETAIL);
  cache.dropByPrefix(KEYS.FOLDER_LINKS);
}