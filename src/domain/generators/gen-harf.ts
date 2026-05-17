// HARF AVCISI — Letter Hunter (Level 1)
// Screen type: quiz
// Task: Which letter does this word start with?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genHarf(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = opts?.targets ?? words
  const letters = [...new Set(words.map(w => w.first))]
  return shuffle(primary).slice(0, 20).map((word, i) => {
    const opts = shuffle([word.first, ...shuffle(letters.filter(l => l !== word.first)).slice(0,3)])
    return {
      id:      qid('hf', i),
      word,
      options: opts,
      correct: word.first,
      prompt:  `"${word.word}" hangi harfle başlar?`,
    }
  })
}
