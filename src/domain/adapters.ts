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
  CharacterItemRow,
  StudentCharacterRow,
} from '@/lib/database.types';

import type {
  Word,
  Category,
  Profile,
  CharacterItem,
  StudentCharacter,
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
 * Note: this domain Profile is the legacy spec shape from Stage 0.
 * The DB row uses fewer fields. We fill in defaults for the rest.
 */
export function profileFromRow(row: ProfileRow): Profile {
  return {
    id:                  row.id,
    role:                row.role,
    full_name:           row.full_name,
    display_name:        null,
    date_of_birth:       null,
    avatar_color:        '#FFC857',
    device_push_token:   null,
    subscription_status: row.subscription_status,
    subscription_expires: row.subscription_expires,
    revenuecat_id:       null,
    email_verified:      true,   // if we have a profile row, signup completed
    streak_count:        0,
    last_active_date:    null,
    created_at:          row.created_at,
    updated_at:          row.updated_at,
  };
}

// ─── Character item ────────────────────────────────────
export function characterItemFromRow(row: CharacterItemRow): CharacterItem {
  return {
    id:          row.id,
    item_type:   row.slot,
    name:        row.name,
    description: row.description,
    image_url:   row.asset_path,
    unlock_xp:   row.unlock_xp,
    rarity:      row.rarity,
    is_premium:  false,           // catalog-wide premium gating not in MVP
    sort_order:  row.display_order,
  };
}

// ─── Student character ─────────────────────────────────
export function studentCharacterFromRow(row: StudentCharacterRow): StudentCharacter {
  return {
    id:             row.student_id,    // 1:1 mapping; PK is student_id
    student_id:     row.student_id,
    total_xp:       row.total_xp,
    level:          row.level,
    unlocked_items: [],                // computed from total_xp + items.unlock_xp on read
    equipped_hat:   row.equipped_hat,
    equipped_shirt: row.equipped_shirt,
    equipped_shoes: row.equipped_shoes,
    equipped_acc:   row.equipped_acc,
    equipped_bg:    row.equipped_bg,
    updated_at:     row.updated_at,
  };
}
