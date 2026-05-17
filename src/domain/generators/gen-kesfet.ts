// KEŞFET — Explore (Level 0)
// Screen type: explore (rich word-info cards with audio + syllable breakdown)
// Task: Child browses word cards — no scoring, always advances as correct.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genKesfet(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = opts?.targets ?? words
  return shuffle(primary).slice(0, 20).map((word, i) => ({
    id:      qid('kf', i),
    word,
    correct: '__explore__',   // always "correct" — no scoring in explore mode
    prompt:  'Dinle ve keşfet!',
    extra: {
      syllables:     word.syl ?? [],
      syllableCount: word.n   ?? 1,
      firstLetter:   word.word[0] ?? '',
      lastLetter:    word.word[word.word.length - 1] ?? '',
    },
  }))
}
