// src/cache/store.js

const MEMORY = new Map();
const TIMESTAMPS = new Map();
const PREFIX = 'sl:';
const MAX_ENTRIES = 100;

function now() {
  return Date.now();
}

function persist(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ d: data, t: now() }));
  } catch {}
}

function hydrate(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { d, t } = JSON.parse(raw);
    MEMORY.set(key, d);
    TIMESTAMPS.set(key, t);
    return d;
  } catch {
    return null;
  }
}

function evict() {
  if (MEMORY.size <= MAX_ENTRIES) return;
  const sorted = [...TIMESTAMPS.entries()].sort((a, b) => a[1] - b[1]);
  sorted.slice(0, Math.floor(MAX_ENTRIES / 4)).forEach(([k]) => {
    MEMORY.delete(k);
    TIMESTAMPS.delete(k);
    try { localStorage.removeItem(PREFIX + k); } catch {}
  });
}

export const cache = {
  get(key) {
    if (MEMORY.has(key)) return MEMORY.get(key);
    return hydrate(key);
  },

  set(key, data) {
    evict();
    MEMORY.set(key, data);
    TIMESTAMPS.set(key, now());
    persist(key, data);
  },

  has(key) {
    return MEMORY.has(key) || !!hydrate(key);
  },

  isStale(key, maxAgeMs) {
    let ts = TIMESTAMPS.get(key);
    if (!ts) {
      hydrate(key);
      ts = TIMESTAMPS.get(key);
    }
    if (!ts) return true;
    return now() - ts > maxAgeMs;
  },

  drop(...keys) {
    keys.forEach(k => {
      MEMORY.delete(k);
      TIMESTAMPS.delete(k);
      try { localStorage.removeItem(PREFIX + k); } catch {}
    });
  },

  clear() {
    MEMORY.clear();
    TIMESTAMPS.clear();
    try {
      const remove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) remove.push(k);
      }
      remove.forEach(k => localStorage.removeItem(k));
    } catch {}
  },
};