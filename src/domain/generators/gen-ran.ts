// RAN — Rapid Automatic Naming (Level 5)
// Screen type: quiz (4-option multiple choice — speed is just a side metric)
// Task: See the picture → tap the correct name as fast as possible.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, makeOptions, qid } from './utils'

export function genRan(words: Word[], opts?: { targets?: Word[] }): Question[] {
  // Homework: drive primary words from targets; otherwise prefer the
  // visually distinctive categories the HTML reference uses.
  const primaryRaw = opts?.targets ?? words
  const preferred  = primaryRaw.filter(w => ['Renkler', 'Rakamlar', 'Hayvanlar'].includes(w.kat))
  const pool       = preferred.length >= 10 ? preferred : primaryRaw
  const picked     = shuffle(pool).slice(0, 20)
  // Distractors should always come from the broad pool so single-target
  // assignments still get realistic option sets.
  const allWords   = words.map(w => w.word)
  return picked.map((word, i) => ({
    id:      qid('ran', i),
    word,
    options: makeOptions(word.word, allWords),
    correct: word.word,
    prompt:  'Bu nesnenin adı nedir? Hızlı cevapla!',
  }))
}
