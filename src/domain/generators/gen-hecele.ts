// HECELE — Syllabification (Level 2)
// Screen type: quiz
// Task: Which option shows correct syllable breakdown?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

function formatSyl(syl: string[]): string { return syl.join('-') }

function wrongSyl(word: Word, correctStr: string): string[] {
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

export function genHecele(words: Word[]): Question[] {
  return shuffle(words.filter(w => w.n >= 2)).slice(0, 20).map((word, i) => {
    const correct = formatSyl(word.syl)
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
