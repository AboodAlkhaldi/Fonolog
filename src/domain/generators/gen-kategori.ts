// KATEGORİZE — Categorization (Level 0)
// Screen type: quiz
// Task: Word shown → which category does it belong to?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genKategori(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = opts?.targets ?? words
  const cats = [...new Set(words.map(w => w.kat))]
  return shuffle(primary).slice(0, 20).map((word, i) => ({
    id:      qid('kt', i),
    word,
    options: shuffle(cats).slice(0, 4).includes(word.kat)
      ? shuffle([word.kat, ...shuffle(cats.filter(c => c !== word.kat)).slice(0, 3)])
      : [word.kat, ...shuffle(cats.filter(c => c !== word.kat)).slice(0, 3)],
    correct: word.kat,
    prompt:  `"${word.word}" hangi kategoride?`,
  }))
}
