// RAN — Rapid Automatic Naming (Level 5)
// Screen type: quiz (4-option multiple choice — speed is just a side metric)
// Task: See the picture → tap the correct name as fast as possible.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, makeOptions, qid } from './utils'

export function genRan(words: Word[]): Question[] {
  // Prefer the same visually distinctive categories the HTML reference uses.
  const preferred = words.filter(w => ['Renkler', 'Rakamlar', 'Hayvanlar'].includes(w.kat))
  const pool      = preferred.length >= 10 ? preferred : words
  const picked    = shuffle(pool).slice(0, 20)
  const allWords  = picked.map(w => w.word)
  return picked.map((word, i) => ({
    id:      qid('ran', i),
    word,
    options: makeOptions(word.word, allWords),
    correct: word.word,
    prompt:  'Bu nesnenin adı nedir? Hızlı cevapla!',
  }))
}
