// HECE SAYACI — Syllable Counter (Level 2)
// Screen type: quiz
// Task: How many syllables does this word have?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genHeceC(words: Word[]): Question[] {
  return shuffle(words).slice(0, 20).map((word, i) => {
    const nums = ['1', '2', '3', '4', '5']
    const correct = String(word.n)
    const options = shuffle([correct, ...nums.filter(n => n !== correct).slice(0, 3)])
    return {
      id:      qid('hc', i),
      word,
      options,
      correct,
      prompt:  `"${word.word}" kaç heceli?`,
    }
  })
}
