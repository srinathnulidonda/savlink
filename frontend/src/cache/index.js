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
  cache.drop(...HOME_KEYS);
  dispatch(HOME_KEYS);
}

export function invalidateLinks() {
  const keys = [KEYS.OVERVIEW, KEYS.HOME, KEYS.STATS, KEYS.RECENT];
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
  const keys = [KEYS.OVERVIEW, KEYS.FOLDERS, KEYS.HOME, KEYS.STATS];
  cache.drop(...keys);
  dispatch(keys);
}

export function invalidateTags() {
  const keys = [KEYS.OVERVIEW, KEYS.TAGS, KEYS.STATS];
  cache.drop(...keys);
  dispatch(keys);
}

export function invalidateAll() {
  cache.drop(...ALL_KEYS);
  dispatch(ALL_KEYS);
}