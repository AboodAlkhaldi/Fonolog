// UZUN KELİME — Long Word (Level 2)
// Screen type: quiz
// Task: Which word has MORE syllables?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genUzunKelime(words: Word[]): Question[] {
  const pairs: Question[] = []
  const shuffled = shuffle(words)
  for (let i = 0; i < shuffled.length - 1 && pairs.length < 20; i++) {
    const a = shuffled[i], b = shuffled[i + 1]
    if (a.n === b.n) continue
    const correct = a.n > b.n ? a.word : b.word
    pairs.push({
      id:      qid('uk', i),
      word:    a.n > b.n ? a : b,
      options: shuffle([a.word, b.word]),
      correct,
      prompt:  'Hangisi daha uzun (daha çok heceli)?',
    })
  }
  return pairs
}
