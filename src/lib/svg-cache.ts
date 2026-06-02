/**
 * SVG markup cache — MMKV-backed (synchronous), with an in-memory mirror.
 *
 * Word illustrations are SVGs served from Supabase Storage. react-native-svg
 * needs the raw markup, so WordImage must `fetch()` each SVG. Without a cache
 * that fetch ran on every mount — and games like Görsel Algı rotate a 3×3 grid
 * every 700ms, re-fetching the SAME files dozens of times (latency + a
 * placeholder→image flicker), and failing entirely offline.
 *
 * This module fetches each URL once, validates it, and persists the markup so:
 *   - repeat renders are instant (no flicker, no Storage spam),
 *   - prewarmed words render with no latency mid-game,
 *   - cached SVGs work fully offline across app restarts.
 *
 * Falls back to in-memory only when MMKV's native module is unavailable
 * (Expo Go), mirroring offline-cache.ts.
 */
import { MMKV } from 'react-native-mmkv';

const INVALID = '__invalid__';
const keyFor = (url: string) => `svg:${url}`;

let mmkv: MMKV | null = null;
try { mmkv = new MMKV({ id: 'svg-cache' }); } catch { /* Expo Go */ }

// url → markup | INVALID. Mirrors MMKV so repeat peeks never touch disk.
const mem = new Map<string, string>();

/** Cheap structural check that fetched text is actually an SVG document. */
function looksLikeSvg(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.includes('<svg') && t.includes('</svg>');
}

/**
 * Synchronous lookup. Returns the markup, `'invalid'` for a known-bad file, or
 * `undefined` when the URL has never been fetched (caller should `loadSvg`).
 */
export function peekSvg(url: string): string | 'invalid' | undefined {
  const inMem = mem.get(url);
  if (inMem !== undefined) return inMem === INVALID ? 'invalid' : inMem;
  const raw = mmkv?.getString(keyFor(url));
  if (raw == null) return undefined;
  mem.set(url, raw);
  return raw === INVALID ? 'invalid' : raw;
}

function store(url: string, val: string): void {
  mem.set(url, val);
  try { mmkv?.set(keyFor(url), val); } catch { /* ignore */ }
}

/**
 * Return cached markup, or fetch + validate + cache it. A malformed file is
 * cached as invalid (it won't get better); a network/fetch failure is NOT
 * cached, so it can be retried once connectivity returns.
 */
export async function loadSvg(url: string): Promise<string | 'invalid'> {
  const cached = peekSvg(url);
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (looksLikeSvg(text)) { store(url, text); return text; }
    store(url, INVALID);
    return 'invalid';
  } catch {
    // Offline / fetch error — don't poison the cache; report invalid for now.
    return 'invalid';
  }
}

/**
 * Prewarm a batch of SVG urls with bounded concurrency, skipping any already
 * cached. Fire-and-forget from content load so the offline word pool's images
 * are ready before the first game (and available offline).
 */
export async function prewarmSvgs(urls: string[], concurrency = 6): Promise<void> {
  const todo = Array.from(new Set(urls)).filter((u) => peekSvg(u) === undefined);
  if (todo.length === 0) return;
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const u = todo[i++];
      await loadSvg(u);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, todo.length) }, worker),
  );
}
