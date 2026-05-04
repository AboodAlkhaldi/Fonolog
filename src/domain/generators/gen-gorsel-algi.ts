// GÖRSEL ALGI — Visual Perception (Level 0)
// Screen type: visual (3×3 tap grid)
// Task: Tap all items that belong to a category
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genGorselAlgi(words: Word[]): Question[] {
  const categories = [...new Set(words.map(w => w.kat))]
  return shuffle(categories).slice(0, 20).map((cat, i) => {
    const correct = shuffle(words.filter(w => w.kat === cat)).slice(0, 3)
    const distractors = shuffle(words.filter(w => w.kat !== cat)).slice(0, 6)
    return {
      id:      qid('ga', i),
      word:    correct[0],
      options: shuffle([...correct, ...distractors]).map(w => w.word),
      correct: correct.map(w => w.word).join(','),
      prompt:  `"${cat}" kategorisinden olanları bul!`,
    }
  })
}
