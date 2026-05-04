// SIRALI HATIRLA — Sequential Recall (Level 2)
// Screen type: memory (same adaptive system as kelimeDizisi)
// Task: See images flash → tap them in the same order
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genSiraliHatirla(words: Word[]): Question[] {
  return shuffle(words).slice(0, 30).map((word, i) => ({
    id:      qid('sr', i),
    word,
    correct: word.word,
    prompt:  'Gördüklerini sırayla hatırla!',
  }))
}
