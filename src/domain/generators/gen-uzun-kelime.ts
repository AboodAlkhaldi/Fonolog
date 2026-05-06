// UZUN KELİME — Long Word (Level 2)
// Screen type: audio-pair
// Task: Listen to both words, pick the one with MORE syllables.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genUzunKelime(words: Word[]): Question[] {
  const pairs: Question[] = []
  const shuffled = shuffle(words)
  for (let i = 0; i + 1 < shuffled.length && pairs.length < 20; i += 2) {
    const a = shuffled[i], b = shuffled[i + 1]
    if (a.n === b.n) continue
    const correct = a.n > b.n ? a.word : b.word
    const longer  = a.n > b.n ? a : b
    pairs.push({
      id:      qid('uk', pairs.length),
      word:    longer,
      options: shuffle([a.word, b.word]),
      correct,
      prompt:  'Hangisi daha uzun (daha çok heceli)?',
      extra:   { wordA: a, wordB: b },
    })
  }
  return pairs
}
