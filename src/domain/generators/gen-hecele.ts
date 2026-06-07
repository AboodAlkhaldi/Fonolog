// HECELE — Syllabification (Level 2)
// Screen type: quiz
// Task: Which option shows correct syllable breakdown?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid, joinSyl, boundaryAfter } from './utils'

// Hyphen within a word, space at a word break: "bal ka-ba-ğı".
function formatSyl(word: Word): string { return joinSyl(word, 0, word.syl.length, '-') }

// Turkish vowels (both cases). Every Turkish syllable is built around exactly
// one vowel, so a segment with NO vowel can never look like a real syllable.
const VOWELS = new Set('aeıioöuüAEIİOÖUÜ'.split(''))
const hasVowel = (s: string): boolean => [...s].some(c => VOWELS.has(c))

/**
 * Plausible wrong syllabifications for a SINGLE word.
 *
 * Idea (per product call): a good distractor must *look* like a real attempt,
 * e.g. "lütf-en" for "lüt-fen", never "l-ütfen". The rule that guarantees this
 * is: **every segment must contain a vowel**. We only produce wrong splits two
 * ways, both of which keep that invariant:
 *
 *   - boundary shift — move one consonant across an existing syllable break
 *       lüt-fen → lütf-en / lü-tfen ;  dik-dört-gen → dik-dör-tgen …
 *   - merge — fuse two adjacent syllables (a natural "under-split")
 *       dik-dört-gen → dikdört-gen / dik-dörtgen
 *
 * Returns [] for very short words that can't yield enough plausible options;
 * the caller then falls back to the legacy logic, so nothing regresses.
 */
function plausibleWrong(word: Word, correctStr: string): string[] {
  const syl = word.syl
  if (syl.length < 2) return []

  const shifts: string[] = []
  const merges: string[] = []

  for (let i = 0; i < syl.length - 1; i++) {
    // shift RIGHT: last char of syl[i] moves onto the front of syl[i+1]
    if (syl[i].length >= 2) {
      const prev = syl[i].slice(0, -1)
      const next = syl[i].slice(-1) + syl[i + 1]
      if (hasVowel(prev) && hasVowel(next)) {
        shifts.push([...syl.slice(0, i), prev, next, ...syl.slice(i + 2)].join('-'))
      }
    }
    // shift LEFT: first char of syl[i+1] moves onto the end of syl[i]
    if (syl[i + 1].length >= 2) {
      const prev = syl[i] + syl[i + 1].slice(0, 1)
      const next = syl[i + 1].slice(1)
      if (hasVowel(prev) && hasVowel(next)) {
        shifts.push([...syl.slice(0, i), prev, next, ...syl.slice(i + 2)].join('-'))
      }
    }
    // merge syl[i] + syl[i+1] (both keep their vowels → still plausible)
    merges.push([...syl.slice(0, i), syl[i] + syl[i + 1], ...syl.slice(i + 2)].join('-'))
  }

  // Same-count shifts are the most deceptive, then merges, then the no-split
  // whole word as a last-resort filler. De-dupe and drop the correct answer.
  const out = new Set<string>()
  for (const s of [...shifts, ...merges, word.word]) {
    if (s !== correctStr) out.add(s)
  }
  return [...out]
}

// Legacy distractors — kept verbatim as the fallback for short words. Single
// (≥3 letter) words that the new engine can't satisfy still get something here;
// multi-word phrases ("bal kabağı") always use this path so their splits stay
// correct.
function legacyWrongSyl(word: Word, correctStr: string): string[] {
  const variants = new Set<string>()
  if (word.syl.length >= 2) {
    const merged = [...word.syl]
    merged[0] = merged[0] + merged[1]
    variants.add([merged[0], ...merged.slice(2)].join('-'))
  }
  if (word.word.length >= 3) {
    variants.add([word.word.slice(0, 1), word.word.slice(1)].join('-'))
    variants.add([word.word.slice(0, 3), word.word.slice(3)].filter(Boolean).join('-'))
  }
  variants.add(word.word) // whole-word "no-split" distractor
  variants.delete(correctStr)
  return [...variants].slice(0, 3)
}

function wrongSyl(word: Word, correctStr: string): string[] {
  // New plausible-distractor engine — single words only. Multi-word phrases keep
  // the legacy logic so word-break splits aren't disturbed. If the new engine
  // can't produce 3 strong options (typically very short words like "ada"), we
  // fall back rather than ship a weak split.
  if (boundaryAfter(word).size === 0) {
    const plausible = plausibleWrong(word, correctStr)
    if (plausible.length >= 3) return shuffle(plausible).slice(0, 3)
  }
  return legacyWrongSyl(word, correctStr)
}

export function genHecele(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = (opts?.targets ?? words).filter(w => w.n >= 2)
  return shuffle(primary).slice(0, 20).map((word, i) => {
    const correct = formatSyl(word)
    const wrongs  = wrongSyl(word, correct)
    if (wrongs.length < 3) return null
    return {
      id:      qid('hl', i),
      word,
      options: shuffle([correct, ...wrongs]),
      correct,
      prompt:  `"${word.word}" kelimesinin doğru hecelenmesi hangisi?`,
    }
  }).filter((q): q is NonNullable<typeof q> => q !== null) as Question[]
}
