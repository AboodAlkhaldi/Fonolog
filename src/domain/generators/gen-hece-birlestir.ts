// HECE BİRLEŞTİR — Syllable Blending (Level 2)
// Screen type: builder (draggable tiles)
// Task: Arrange syllable tiles to form the word
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genHeceBirlestir(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = (opts?.targets ?? words).filter(w => w.n >= 2)
  return shuffle(primary).slice(0, 20).map((word, i) => ({
    id:      qid('hb', i),
    word,
    options: shuffle(word.syl),  // shuffled syllable tiles
    correct: word.syl.join(''),  // correct concatenated answer
    prompt:  'Heceleri birleştirerek kelimeyi oluştur!',
  }))
}
