// SIRALI HATIRLA — Sequential Recall (Level 2)
// Screen type: sequence — image-recall mode (emoji option buttons)
// Task: Watch emojis flash one by one → tap the same emojis back in the same order.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

const GROUP_SIZE = 3

export function genSiraliHatirla(words: Word[]): Question[] {
  const pool = shuffle(words)
  const questions: Question[] = []
  for (let i = 0; i + GROUP_SIZE <= pool.length && questions.length < 12; i += GROUP_SIZE) {
    const seq        = pool.slice(i, i + GROUP_SIZE)
    const distractors = shuffle(words.filter(w => !seq.find(s => s.word === w.word))).slice(0, 3)
    const options    = shuffle([...seq, ...distractors])
    questions.push({
      id:      qid('sr', questions.length),
      word:    seq[0],
      correct: seq.map(w => w.word).join(','),
      prompt:  'Gördüğün resimleri sırayla seç!',
      extra:   { mode: 'image', sequence: seq, options },
    })
  }
  return questions
}
