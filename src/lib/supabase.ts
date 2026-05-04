/**
 * Supabase client.
 *
 * Session persistence: expo-secure-store (encrypted on iOS keychain / Android keystore).
 * - tokens are sensitive; never use AsyncStorage for them
 * - SecureStore has a 2KB per-key limit — Supabase tokens fit (~1.2KB), but if
 *   you ever store custom large blobs in the session, split keys
 *
 * Usage:
 *   import { supabase } from '@/lib/supabase';
 *   const { data, error } = await supabase.from('words').select('*');
 */

import 'react-native-url-polyfill/auto';   // required for Supabase on RN < 0.74
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from './database.types';

// ─── Env ──────────────────────────────────────────────────
const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Don't throw at module load (tests/storybook would crash). Throw on first use.
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing. ' +
    'Copy .env.example → .env and fill in.',
  );
}

// ─── Storage adapter ──────────────────────────────────────
// Supabase calls these methods to read/write the session token.
// We forward to expo-secure-store on native, localStorage on web.
const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const WebStorageAdapter = {
  getItem:    async (key: string) => globalThis.localStorage?.getItem(key)    ?? null,
  setItem:    async (key: string, value: string) => { globalThis.localStorage?.setItem(key, value); },
  removeItem: async (key: string) => { globalThis.localStorage?.removeItem(key); },
};

const storage = Platform.OS === 'web' ? WebStorageAdapter : ExpoSecureStoreAdapter;

// ─── Client ───────────────────────────────────────────────
export const supabase = createClient<Database>(
  SUPABASE_URL ?? 'https://invalid.supabase.co',
  SUPABASE_ANON_KEY ?? 'invalid',
  {
    auth: {
      storage,
      autoRefreshToken:  true,
      persistSession:    true,
      detectSessionInUrl: false,
    },
  },
);

/** True when env vars are configured and the client can really connect. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
