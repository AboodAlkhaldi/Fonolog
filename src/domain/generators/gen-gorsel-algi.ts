// GÖRSEL ALGI — Visual Perception (Level 0)
// Single-correct: "Which of these belongs to category X?"
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genGorselAlgi(words: Word[], opts?: { targets?: Word[] }): Question[] {
  // When targets are given (homework), drive questions from the categories
  // those targets sit in, and pick the correct word from the targets themselves.
  const primary    = opts?.targets ?? words
  const categories = [...new Set(primary.map(w => w.kat))]
  const out: Question[] = []
  for (const cat of shuffle(categories)) {
    if (out.length >= 20) break
    const inCat  = shuffle(primary.filter(w => w.kat === cat))
    const outCat = shuffle(words.filter(w => w.kat !== cat))
    if (inCat.length < 1 || outCat.length < 3) continue
    const correctW    = inCat[0]
    const distractors = outCat.slice(0, 3).map(w => w.word)
    out.push({
      id:      qid('ga', out.length),
      word:    correctW,
      options: shuffle([correctW.word, ...distractors]),
      correct: correctW.word,
      prompt:  `Bunlardan hangisi "${cat}" kategorisinde?`,
    })
  }
  return out
}
