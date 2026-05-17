// İLK SES — First Phoneme (Level 3)
// Screen type: quiz
// Task: What SOUND does this word start with? (phoneme, not letter name)
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genIlkSes(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = opts?.targets ?? words
  const sounds = [...new Set(words.map(w => w.first))]
  return shuffle(primary).slice(0, 20).map((word, i) => {
    const correct = word.first
    const opts = shuffle([correct, ...shuffle(sounds.filter(s => s !== correct)).slice(0, 3)])
    return {
      id:      qid('is', i),
      word,
      options: opts,
      correct,
      prompt:  `"${word.word}" hangi sesle başlar?`,
    }
  })
}
