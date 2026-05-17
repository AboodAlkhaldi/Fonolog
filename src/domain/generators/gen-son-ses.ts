// SON SES — Last Phoneme (Level 3)
// Screen type: quiz
// Task: What sound does this word END with?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genSonSes(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = opts?.targets ?? words
  const sounds = [...new Set(words.map(w => w.last))]
  return shuffle(primary).slice(0, 20).map((word, i) => {
    const correct = word.last
    const opts = shuffle([correct, ...shuffle(sounds.filter(s => s !== correct)).slice(0, 3)])
    return {
      id:      qid('ss', i),
      word,
      options: opts,
      correct,
      prompt:  `"${word.word}" hangi sesle biter?`,
    }
  })
}
