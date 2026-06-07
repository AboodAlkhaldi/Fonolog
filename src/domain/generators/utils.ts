// Utility functions shared by all generators
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

export function makeOptions(correct: string, pool: string[]): string[] {
  const distractors = shuffle(pool.filter(p => p !== correct)).slice(0, 3)
  return shuffle([correct, ...distractors])
}

export function qid(prefix: string, index: number): string {
  return `${prefix}_${index}_${Date.now()}`
}

// ── Multi-word phrase helpers ────────────────────────────────────────────────
// The stored syllable array is flat and carries no word boundary
// (e.g. ['bal','ka','ba','ğı']), but the word text keeps the space
// ("bal kabağı"). Aligning the syllable letters against the word text recovers
// where the space falls, so games can render / rebuild two-word phrases
// correctly without storing the boundary separately.

type WordLike = { word: string; syl: string[] }

/** Flat-array indices AFTER which a word break (space) occurs. */
export function boundaryAfter(w: WordLike): Set<number> {
  const breaks = new Set<number>()
  const text = w.word
  let pos = 0
  for (let i = 0; i < w.syl.length; i++) {
    pos += w.syl[i].length
    if (text[pos] === ' ') {
      breaks.add(i)
      pos += 1 // step over the space
    }
  }
  return breaks
}

/**
 * Join `syl[start..end)` back into a string, inserting a space at word breaks
 * and `sep` (default '') between syllables of the same word.
 *   joinSyl(bal-kabağı, 1)        → "kabağı"
 *   joinSyl(araba-vapuru, 1)      → "raba vapuru"
 *   joinSyl(bal-kabağı, 0, n, '-')→ "bal ka-ba-ğı"
 */
export function joinSyl(w: WordLike, start = 0, end = w.syl.length, sep = ''): string {
  const breaks = boundaryAfter(w)
  let out = ''
  for (let i = start; i < end; i++) {
    out += w.syl[i]
    if (i < end - 1) out += breaks.has(i) ? ' ' : sep
  }
  return out
}