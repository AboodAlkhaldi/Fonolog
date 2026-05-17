// AYIRT ETME — Phoneme Discrimination (Level 1)
// Screen type: quiz
// Task: Which word starts with the SAME sound as the shown word?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genAyirtEtme(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = opts?.targets ?? words
  return shuffle(primary).slice(0, 20).map((target, i) => {
    const sameFirst = words.filter(w => w.first === target.first && w.word !== target.word)
    const diffFirst = words.filter(w => w.first !== target.first)
    if (sameFirst.length < 1 || diffFirst.length < 3) {
      return { id: qid('ae', i), word: target, correct: target.word, prompt: '' }
    }
    const correct  = shuffle(sameFirst)[0]
    const wrongs   = shuffle(diffFirst).slice(0, 3)
    return {
      id:      qid('ae', i),
      word:    target,
      options: shuffle([correct.word, ...wrongs.map(w => w.word)]),
      correct: correct.word,
      prompt:  `"${target.word}" ile aynı sesle başlayan hangisi?`,
    }
  }).filter(q => q.options && q.options.length === 4)
}
