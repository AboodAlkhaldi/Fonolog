/**
 * Offline cache — MMKV-backed (synchronous, works with new arch + old arch).
 * Falls back to in-memory map when MMKV native module is unavailable (e.g. Expo Go).
 * 24h TTL, stale-while-revalidate.
 */
import { MMKV } from 'react-native-mmkv';
import type { Category, Word } from '@/domain';

const TTL_MS = 24 * 60 * 60 * 1000;

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

export const offlineCache = {
  getCategories: () => get<Category[]>('categories'),
  setCategories: (c: Category[]) => set('categories', c),
  getWords:      () => get<Word[]>('words'),
  setWords:      (w: Word[]) => set('words', w),
  clear:         () => { sDel('categories'); sDel('words'); },
};
