// UZUN KELİME — Long Word (Level 2)
// Screen type: audio-pair
// Task: Listen to both words, pick the one with MORE syllables.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genUzunKelime(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const pairs: Question[] = []
  // When `targets` is supplied, each pair must have at least one target word
  // so the practice focuses on the assigned set; the other half can come
  // from the broader pool for variety.
  const targets    = opts?.targets ?? []
  const useTargets = targets.length > 0
  const shuffled   = shuffle(words)
  const shuffledTg = useTargets ? shuffle(targets) : null

  if (useTargets && shuffledTg) {
    for (let i = 0; i < shuffledTg.length && pairs.length < 20; i++) {
      const a = shuffledTg[i]
      const candidate = shuffled.find(w => w.word !== a.word && w.n !== a.n)
      if (!candidate) continue
      const b = candidate
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
