// KELİME TANIMI — Word Recognition (Level 0)
// Screen type: quiz
// Task: See image/emoji → choose correct word from 4 options
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, makeOptions, qid } from './utils'

export function genTani(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = opts?.targets ?? words
  const pool    = words.map(w => w.word)
  return shuffle(primary).slice(0, 20).map((word, i) => ({
    id:      qid('tn', i),
    word,
    options: makeOptions(word.word, pool),
    correct: word.word,
    prompt:  'Bu nedir?',
  }))
}
