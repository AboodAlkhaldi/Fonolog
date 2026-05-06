// UYAK ÜRETİM — Rhyme Production (Level 3)
// Screen type: quiz
// Task: From a list, pick ALL words that rhyme with the target
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genUyakUretim(words: Word[]): Question[] {
  const rhyming = words.filter(w => w.rk !== null)
  const groups  = new Map<string, Word[]>()
  for (const w of rhyming) {
    if (!groups.has(w.rk!)) groups.set(w.rk!, [])
    groups.get(w.rk!)!.push(w)
  }
  const questions: Question[] = []
  for (const [rk, group] of groups) {
    if (questions.length >= 20) break
    if (group.length < 2) continue
    const target  = shuffle(group)[0]
    const mate    = group.find(w => w.word !== target.word)!
    const wrongs  = shuffle(words.filter(w => w.rk !== rk && w.word !== target.word))
                      .slice(0, 3).map(w => w.word)
    if (wrongs.length < 3) continue
    questions.push({
      id:      qid('uu', questions.length),
      word:    target,
      options: shuffle([mate.word, ...wrongs]),
      correct: mate.word,
      prompt:  `"${target.word}" ile uyaklı kelimeyi seç!`,
    })
  }
  return questions
}
