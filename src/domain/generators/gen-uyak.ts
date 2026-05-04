// UYAK — Rhyme (Level 3)
// Screen type: quiz
// Task: Which word rhymes with the shown word?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genUyak(words: Word[]): Question[] {
  const rhyming = words.filter(w => w.rk !== null)
  const questions: Question[] = []
  for (const word of shuffle(rhyming)) {
    if (questions.length >= 20) break
    const mates = rhyming.filter(w => w.rk === word.rk && w.word !== word.word)
    if (mates.length < 1) continue
    const correct = shuffle(mates)[0]
    const wrong   = shuffle(words.filter(w => w.rk !== word.rk && w.word !== word.word)).slice(0, 3)
    if (wrong.length < 3) continue
    questions.push({
      id:      qid('uy', questions.length),
      word,
      options: shuffle([correct.word, ...wrong.map(w => w.word)]),
      correct: correct.word,
      prompt:  `"${word.word}" ile uyaklı kelime hangisi?`,
    })
  }
  return questions
}
