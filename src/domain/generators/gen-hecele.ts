// HECELE — Syllabification (Level 2)
// Screen type: quiz
// Task: Which option shows correct syllable breakdown?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

function formatSyl(syl: string[]): string { return syl.join('-') }

function wrongSyl(word: Word): string[] {
  // Generate plausible wrong syllabifications
  const variants: string[][] = []
  if (word.syl.length >= 2) {
    const merged = [...word.syl]
    merged[0] = merged[0] + merged[1]
    variants.push([merged[0], ...merged.slice(2)])
  }
  variants.push(word.word.split('').slice(0, 2).join('') !== word.syl[0]
    ? [word.word.slice(0, 1), word.word.slice(1)]
    : [word.word.slice(0, 3), word.word.slice(3)].filter(s => s.length > 0))
  variants.push([word.word])
  return variants.map(formatSyl).filter(v => v !== formatSyl(word.syl)).slice(0, 3)
}

export function genHecele(words: Word[]): Question[] {
  return shuffle(words.filter(w => w.n >= 2)).slice(0, 20).map((word, i) => {
    const correct = formatSyl(word.syl)
    const wrongs  = wrongSyl(word)
    return {
      id:      qid('hl', i),
      word,
      options: shuffle([correct, ...wrongs]),
      correct,
      prompt:  `"${word.word}" kelimesinin doğru hecelenmesi hangisi?`,
    }
  })
}
