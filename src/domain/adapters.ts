/**
 * Adapters between database row shapes (`*Row` from `lib/database.types`)
 * and domain shapes (`Word`, `Category`, etc. from `domain/types`).
 *
 * Why have these:
 *  - The 24 generators were written against the seed-data shape ({kat, syl, n, ...})
 *  - The DB has different column names ({category_id, syllables, syllable_count, ...})
 *  - Touching every generator to read DB columns would be brittle and noisy
 *  - This adapter file is the single seam — change once, all generators keep working
 */
import type {
  WordRow,
  CategoryRow,
  ProfileRow,
} from '@/lib/database.types';

import type {
  Word,
  Category,
  Profile,
} from './types';

// ─── Word ──────────────────────────────────────────────
/**
 * Convert a DB row + the matching category name into the domain Word shape
 * the generators expect.
 *
 * The `kat` field is the category NAME (e.g. "Hayvanlar"), not the UUID,
 * because generators sometimes filter by category for word selection.
 */
export function wordFromRow(row: WordRow, categoryName: string): Word {
  return {
    id:    row.id,
    kat:   categoryName,
    word:  row.word_text,
    emoji: row.emoji,
    syl:   row.syllables,
    n:     row.syllable_count,
    first: row.first_letter,
    last:  row.last_letter,
    rk:    row.rhyme_group,
    tts_url: row.audio_url ?? undefined,
  };
}

/** Bulk variant: takes rows + a category lookup map. */
export function wordsFromRows(
  rows: WordRow[],
  categoryById: Map<string, CategoryRow>,
): Word[] {
  return rows.map((r) => {
    const cat = categoryById.get(r.category_id);
    return wordFromRow(r, cat?.name ?? '');
  });
}

// ─── Category ──────────────────────────────────────────
export function categoryFromRow(row: CategoryRow): Category {
  return {
    id:         row.id,
    name:       row.name,
    level:      row.is_premium ? 1 : 0,   // free=0, premium=1
    color_hex:  '#FFC857',                  // default brand yellow; per-cat colors come later
    emoji:      row.emoji,
    sort_order: row.display_order,
    is_active:  row.is_active,
    is_seeded:  true,
  };
}

// ─── Profile ───────────────────────────────────────────
/**
 * `Profile` is now an alias for `ProfileRow` (see types/user.types.ts).
 * The row-to-domain conversion is a no-op identity now; kept as a function
 * because callers may still spread / re-shape via this entry point.
 */
export function profileFromRow(row: ProfileRow): Profile {
  return row;
}

// Character / student-character adapters removed in v2 — the slot-based
// model was retired in favor of a base + variant model. Components now read
// the row shape directly via supabase.from('student_character').
