// GÖRSEL ALGI — Visual Perception (Level 0)
// Screen type: visual — live 3×3 grid, tap items matching the target category.
//
// Spec (matches fonoloji-atölyesi (2).html):
//   - Pick one random target category for the whole session
//   - 9 cells, each holds a random word
//   - Every 700ms one non-flashing cell rotates to a fresh random word
//   - Tap → 380ms green/red flash → cell rotates to a new word
//   - Bias: 40% of refreshed cells come from the target category until 7
//     correct found; 25% after (gets harder)
//   - End the session at 15 correct
//
// The component GorselAlgiQuestion owns the live loop; the generator just
// hands over the full word pool + the chosen category.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'

const TARGET_CATEGORIES = [
  'Hayvanlar', 'Meyveler', 'Sebzeler', 'Araçlar',
  'Giysiler', 'Yiyecekler', 'Doğa',
] as const

const CATEGORY_LABELS: Record<string, { emoji: string; suffix: string }> = {
  'Hayvanlar':  { emoji: '🐾',  suffix: 'hayvanı' },
  'Meyveler':   { emoji: '🍎',  suffix: 'meyveyi' },
  'Sebzeler':   { emoji: '🥦',  suffix: 'sebzeyi' },
  'Araçlar':    { emoji: '🚗',  suffix: 'aracı' },
  'Giysiler':   { emoji: '👕',  suffix: 'giysiyi' },
  'Yiyecekler': { emoji: '🍽️', suffix: 'yiyeceği' },
  'Doğa':       { emoji: '🌿',  suffix: 'doğa nesnesini' },
}

export function genGorselAlgi(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const pool = opts?.targets && opts.targets.length > 0 ? opts.targets : words
  if (pool.length < 9) return []

  // Only pick a category that actually has at least one matching word in the
  // pool; otherwise the round can never produce target hits. Falls back to the
  // first category that has words if no eligible standard category is found.
  const eligible = TARGET_CATEGORIES.filter((cat) => pool.some((w) => w.kat === cat))
  const target = eligible.length > 0
    ? eligible[Math.floor(Math.random() * eligible.length)]
    : pool[0].kat

  const label = CATEGORY_LABELS[target] ?? { emoji: '🎯', suffix: 'nesneyi' }

  return [{
    id:      'ga-seed',
    word:    pool[0],
    correct: '__visual__',
    prompt:  `${label.emoji} ${target} — ${label.suffix} dokun!`,
    extra:   {
      isVisual:        true,
      pool,
      targetCategory:  target,
      targetEmoji:     label.emoji,
      targetSuffix:    label.suffix,
    },
  }]
}
