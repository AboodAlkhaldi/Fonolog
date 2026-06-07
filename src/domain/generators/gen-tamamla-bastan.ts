// TAMAMLA BAŞTAN — Complete from Start (Level 3)
// Screen type: quiz
// Task: Last syllable shown → choose which word ends with it
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid, boundaryAfter, joinSyl } from './utils'

export function genTamamlaBastan(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const multi   = words.filter(w => w.n >= 2)
  const primary = (opts?.targets ?? words).filter(w => w.n >= 2)
  return shuffle(primary).slice(0, 20).map((word, i) => {
    const lastIdx = word.syl.length - 1
    const ending = word.syl[lastIdx]
    // Everything before the last syllable, keeping any word break so a two-word
    // phrase stays "bal kaba", not "balkaba".
    const head   = joinSyl(word, 0, lastIdx)
    // If the word breaks right before the ending (e.g. "kara kuş"), show the
    // space in the hint: "___ kuş".
    const endHint = (boundaryAfter(word).has(lastIdx - 1) ? ' ' : '') + ending
    const distractors = shuffle(
      multi.filter(w =>
        w.word !== word.word &&
        joinSyl(w, 0, w.syl.length - 1) !== head
      )
    )
      .map(w => joinSyl(w, 0, w.syl.length - 1))
      .filter((h, idx, arr) => h.length > 0 && arr.indexOf(h) === idx)
      .slice(0, 3)
    if (distractors.length < 3) return null
    return {
      id:      qid('tb', i),
      word,
      options: shuffle([head, ...distractors]),
      correct: head,
      prompt:  `___${endHint}`,
    }
  }).filter((q): q is NonNullable<typeof q> => q !== null) as Question[]
}
