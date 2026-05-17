// HARF BİRLEŞTİR — Letter Blending (Level 3)
// Screen type: builder (letter tiles → word)
// Task: Arrange individual letter tiles to spell the word
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genHarfBirlestir(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = (opts?.targets ?? words).filter(w => w.word.length <= 6)
  return shuffle(primary).slice(0, 20).map((word, i) => ({
    id:      qid('hrb', i),
    word,
    options: shuffle(word.word.split('')),  // shuffled letter tiles
    correct: word.word,
    prompt:  'Harfleri düzenleyerek kelimeyi yaz!',
  }))
}
