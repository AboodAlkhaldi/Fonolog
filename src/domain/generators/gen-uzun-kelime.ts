// UZUN KELİME — Long Word (Level 2)
// Screen type: audio-pair
// Task: Listen to both words, pick the one with MORE letters.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

// "Longer" is measured by letter count — the longest word is the one with the
// most letters, not the most syllables (a 2-syllable word can have more letters
// than a 3-syllable one). Spaces in multi-word phrases don't count as letters.
const letterCount = (w: Word): number => w.word.replace(/\s+/g, '').length

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
      const candidate = shuffled.find(w => w.word !== a.word && letterCount(w) !== letterCount(a))
      if (!candidate) continue
      const b = candidate
      const correct = letterCount(a) > letterCount(b) ? a.word : b.word
      const longer  = letterCount(a) > letterCount(b) ? a : b
      pairs.push({
        id:      qid('uk', pairs.length),
        word:    longer,
        options: shuffle([a.word, b.word]),
        correct,
        prompt:  'Hangisi daha uzun (daha çok harfli)?',
        extra:   { wordA: a, wordB: b },
      })
    }
    return pairs
  }

  for (let i = 0; i + 1 < shuffled.length && pairs.length < 20; i += 2) {
    const a = shuffled[i], b = shuffled[i + 1]
    if (letterCount(a) === letterCount(b)) continue
    const correct = letterCount(a) > letterCount(b) ? a.word : b.word
    const longer  = letterCount(a) > letterCount(b) ? a : b
    pairs.push({
      id:      qid('uk', pairs.length),
      word:    longer,
      options: shuffle([a.word, b.word]),
      correct,
      prompt:  'Hangisi daha uzun (daha çok harfli)?',
      extra:   { wordA: a, wordB: b },
    })
  }
  return pairs
}
