// UYAK ÜRETİM — Rhyme Production (Level 3)
// Screen type: quiz
// Task: MIRROR of Uyak Bul — the child READS the target word (shown as text)
// and picks the rhyming PICTURE from 4 image options. The Word objects backing
// each option ride along in `extra.optionWords` so the quiz screen can render
// them as images instead of text.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genUyakUretim(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const rhyming = words.filter(w => w.rk !== null)
  // Targets must drive which rhyme-groups become questions; rhymePool stays
  // global so each group can find a partner even if only one target is in it.
  const targetSet = opts?.targets ? new Set(opts.targets.map(t => t.word)) : null
  const groups    = new Map<string, Word[]>()
  for (const w of rhyming) {
    if (!groups.has(w.rk!)) groups.set(w.rk!, [])
    groups.get(w.rk!)!.push(w)
  }
  const questions: Question[] = []
  for (const [rk, group] of groups) {
    if (questions.length >= 20) break
    if (group.length < 2) continue
    // If targets are provided, the question's target word must be a target.
    const eligibleTargets = targetSet
      ? group.filter(w => targetSet.has(w.word))
      : group
    if (eligibleTargets.length === 0) continue
    const target  = shuffle(eligibleTargets)[0]
    const mate    = group.find(w => w.word !== target.word)!
    const wrongs  = shuffle(words.filter(w => w.rk !== rk && w.word !== target.word)).slice(0, 3)
    if (wrongs.length < 3) continue
    // Shuffle the Word objects ONCE so options (strings) and optionWords (the
    // images) stay in the same order.
    const optionWords = shuffle([mate, ...wrongs])
    questions.push({
      id:      qid('uu', questions.length),
      word:    target,
      options: optionWords.map(w => w.word),
      correct: mate.word,
      prompt:  `"${target.word}" ile uyaklı resmi seç!`,
      extra:   { optionWords },
    })
  }
  return questions
}
