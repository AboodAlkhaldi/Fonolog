// UYAK ÜRETİM — Rhyme Production (Level 3)
// Screen type: quiz
// Task: From a list, pick ALL words that rhyme with the target
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genUyakUretim(words: Word[]): Question[] {
  const groups = new Map<string, Word[]>()
  for (const w of words) {
    if (w.rk) {
      if (!groups.has(w.rk)) groups.set(w.rk, [])
      groups.get(w.rk)!.push(w)
    }
  }
  const questions: Question[] = []
  for (const [rk, group] of groups) {
    if (group.length < 2 || questions.length >= 20) continue
    const target  = shuffle(group)[0]
    const mates   = group.filter(w => w.word !== target.word).slice(0, 2)
    const wrong   = shuffle(words.filter(w => w.rk !== rk)).slice(0, 2)
    const all     = shuffle([...mates, ...wrong])
    questions.push({
      id:      qid('uu', questions.length),
      word:    target,
      options: all.map(w => w.word),
      correct: mates.map(w => w.word).join(','),
      prompt:  `"${target.word}" ile uyaklı kelimeleri seç!`,
    })
  }
  return questions
}
