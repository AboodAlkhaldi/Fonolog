/**
 * Character store — single source of truth for the student's equipped
 * character (base + variant) and their XP/streak/level.
 *
 * Lifted out of per-screen useEffect fetches so that equipping a new base or
 * variant on the Karakter tab is instantly reflected on the home tab without
 * a re-login or app restart.
 *
 * Flow: DB write (via `equip_item` RPC) → store update → every subscriber
 * re-renders. Optimistic local update + rollback on RPC error keeps the UI
 * snappy.
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface BaseCharacter {
  id: string;
  name: string;
  description: string | null;
  asset_url: string;
  asset_type: 'svg' | 'png' | 'lottie';
  unlock_xp: number;
}

export interface VariantCharacter {
  id: string;
  base_character_id: string;
  name: string;
  description: string | null;
  asset_url: string;
  asset_type: 'svg' | 'png' | 'lottie';
  rarity: 'common' | 'rare' | 'legendary';
  unlock_xp: number;
}

export interface CharacterStats {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  base_character_id: string | null;
  equipped_variant_id: string | null;
}

interface CharacterState {
  /** Which student this state belongs to. null until first load. */
  studentId: string | null;
  stats:     CharacterStats | null;
  bases:     BaseCharacter[];
  variants:  VariantCharacter[];
  loading:   boolean;
  error:     string | null;

  /** Equipped objects derived from stats — convenience for renderers. */
  equippedBase:    BaseCharacter    | null;
  equippedVariant: VariantCharacter | null;

  load:    (studentId: string) => Promise<void>;
  reload:  () => Promise<void>;
  equip:   (itemId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Local-only patch, e.g. after a session awards XP. Does NOT write to DB. */
  applyStatsPatch: (patch: Partial<CharacterStats>) => void;
  clear:   () => void;
}

function deriveEquipped(
  stats: CharacterStats | null,
  bases: BaseCharacter[],
  variants: VariantCharacter[],
): { equippedBase: BaseCharacter | null; equippedVariant: VariantCharacter | null } {
  if (!stats) return { equippedBase: null, equippedVariant: null };
  return {
    equippedBase:    bases.find((b) => b.id === stats.base_character_id) ?? null,
    equippedVariant: variants.find((v) => v.id === stats.equipped_variant_id) ?? null,
  };
}

export const useCharacter = create<CharacterState>((set, get) => ({
  studentId: null,
  stats:     null,
  bases:     [],
  variants:  [],
  loading:   false,
  error:     null,
  equippedBase:    null,
  equippedVariant: null,

  load: async (studentId) => {
    if (!studentId) return;
    set({ loading: true, error: null, studentId });
    try {
      const [b, x, ch] = await Promise.all([
        supabase.from('characters_base').select('*').eq('is_active', true).order('display_order'),
        supabase.from('character_extras').select('*').eq('is_active', true).order('display_order'),
        supabase.from('student_character').select('*').eq('student_id', studentId).maybeSingle(),
      ]);
      const firstErr = b.error || x.error || ch.error;
      if (firstErr) {
        set({ loading: false, error: firstErr.message });
        return;
      }

      let charData: any = ch.data;
      if (!charData) {
        const upsert = await supabase
          .from('student_character')
          .upsert({ student_id: studentId } as any, { onConflict: 'student_id' })
          .select()
          .maybeSingle();
        if (upsert.error) {
          set({ loading: false, error: upsert.error.message });
          return;
        }
        charData = upsert.data;
      }

      const bases    = (b.data ?? []) as BaseCharacter[];
      const variants = (x.data ?? []) as VariantCharacter[];
      const stats    = charData as CharacterStats;
      const { equippedBase, equippedVariant } = deriveEquipped(stats, bases, variants);
      set({ bases, variants, stats, equippedBase, equippedVariant, loading: false, error: null });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'character load failed' });
    }
  },

  reload: async () => {
    const id = get().studentId;
    if (id) await get().load(id);
  },

  equip: async (itemId) => {
    const { stats, bases, variants } = get();
    if (!stats) return { ok: false, error: 'character not loaded' };

    const isBase = bases.some((b) => b.id === itemId);
    const prevStats = stats;

    const nextStats: CharacterStats = isBase
      ? { ...stats, base_character_id: itemId, equipped_variant_id: null }
      : {
          ...stats,
          equipped_variant_id: itemId,
          base_character_id:
            variants.find((v) => v.id === itemId)?.base_character_id ?? stats.base_character_id,
        };

    // Optimistic
    const { equippedBase, equippedVariant } = deriveEquipped(nextStats, bases, variants);
    set({ stats: nextStats, equippedBase, equippedVariant });

    const { error } = await supabase.rpc('equip_item', { p_item_id: itemId } as any);
    if (error) {
      const rolled = deriveEquipped(prevStats, bases, variants);
      set({ stats: prevStats, equippedBase: rolled.equippedBase, equippedVariant: rolled.equippedVariant });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },

  applyStatsPatch: (patch) => {
    const { stats, bases, variants } = get();
    if (!stats) return;
    const nextStats = { ...stats, ...patch };
    const { equippedBase, equippedVariant } = deriveEquipped(nextStats, bases, variants);
    set({ stats: nextStats, equippedBase, equippedVariant });
  },

  clear: () => set({
    studentId: null, stats: null, bases: [], variants: [],
    equippedBase: null, equippedVariant: null, loading: false, error: null,
  }),
}));
