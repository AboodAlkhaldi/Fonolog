// KELİME DİZİSİ — Word Series Memory (Level 2)
// Screen type: sequence — word-recall mode (text-only option buttons)
// Task: Watch emojis flash one by one → tap their NAMES back in the same order.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

const GROUP_SIZE = 3

export function genKelimeDizisi(words: Word[], opts?: { targets?: Word[] }): Question[] {
  // Pull sequence groups from targets when provided so the assigned words are
  // what the student has to hold in memory; pad distractors from the broad pool.
  const pool = shuffle(opts?.targets ?? words)
  const questions: Question[] = []
  for (let i = 0; i + GROUP_SIZE <= pool.length && questions.length < 12; i += GROUP_SIZE) {
    const seq        = pool.slice(i, i + GROUP_SIZE)
    const distractors = shuffle(words.filter(w => !seq.find(s => s.word === w.word))).slice(0, 3)
    const options    = shuffle([...seq, ...distractors])
    questions.push({
      id:      qid('kd', questions.length),
      word:    seq[0],
      correct: seq.map(w => w.word).join(','),
      prompt:  'Gördüğün resimleri sırayla seç!',
      extra:   { mode: 'word', sequence: seq, options },
    })
  }
  return questions
}
