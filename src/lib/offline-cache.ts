/**
 * Offline cache — MMKV-backed (synchronous, works with new arch + old arch).
 * Falls back to in-memory map when MMKV native module is unavailable (e.g. Expo Go).
 * 24h TTL, stale-while-revalidate.
 *
 * Word cap: we persist at most OFFLINE_WORD_LIMIT words to disk. The in-memory
 * cache in content.repository.ts still holds the full list during an online
 * session — this limit only bounds what survives across app restarts (i.e.
 * what's available offline). 100 words is the same cap regardless of tier.
 */
import { MMKV } from 'react-native-mmkv';
import type { Category, Word } from '@/domain';
import type { ProfileRow as Profile } from '@/lib/database.types';

const TTL_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_WORD_LIMIT = 100;

interface CacheEntry<T> { data: T; cachedAt: number }

// MMKV requires a native build. In Expo Go the module is absent, so we fall
// back to a plain in-memory map (no persistence, but no crash either).
let mmkv: MMKV | null = null;
try { mmkv = new MMKV(); } catch { /* Expo Go — native module not available */ }

const mem = new Map<string, string>();

function sGet(key: string)              { return mmkv ? mmkv.getString(key) : mem.get(key); }
function sSet(key: string, val: string) { mmkv ? mmkv.set(key, val) : mem.set(key, val); }
function sDel(key: string)              { mmkv ? mmkv.delete(key)   : mem.delete(key); }

function get<T>(key: string): T | null {
  try {
    const raw = sGet(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.cachedAt > TTL_MS) return null;
    return parsed.data;
  } catch { return null; }
}

function set<T>(key: string, data: T): void {
  try {
    sSet(key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch { /* ignore */ }
}

// Profile cache: longer TTL than content (7 days) so an offline login can still
// resolve a profile. We key by user id so the cache survives across users on
// the same device without leaking.
const PROFILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getProfile(userId: string): Profile | null {
  try {
    const raw = sGet(`profile:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<Profile>;
    if (Date.now() - parsed.cachedAt > PROFILE_TTL_MS) return null;
    return parsed.data;
  } catch { return null; }
}

function setProfile(p: Profile): void {
  if (!p?.id) return;
  sSet(`profile:${p.id}`, JSON.stringify({ data: p, cachedAt: Date.now() }));
}

export const offlineCache = {
  getCategories: () => get<Category[]>('categories'),
  setCategories: (c: Category[]) => set('categories', c),
  getWords:      () => get<Word[]>('words'),
  // Persist only the first OFFLINE_WORD_LIMIT words. Order is whatever the
  // repository hands us (currently `word_text` ASC), which keeps the offline
  // pool deterministic across cold starts.
  setWords:      (w: Word[]) => set('words', w.slice(0, OFFLINE_WORD_LIMIT)),
  getProfile,
  setProfile,
  clear:         () => { sDel('categories'); sDel('words'); },
};
