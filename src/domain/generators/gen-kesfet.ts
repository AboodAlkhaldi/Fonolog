// KEŞFET — Explore (Level 0)
// Screen type: explore (word card carousel with audio)
// Task: Child flips through cards, hears word, sees image
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genKesfet(words: Word[]): Question[] {
  return shuffle(words).slice(0, 20).map((word, i) => ({
    id:      qid('kf', i),
    word,
    correct: word.word,
    prompt:  'Dinle ve keşfet!',
  }))
}
