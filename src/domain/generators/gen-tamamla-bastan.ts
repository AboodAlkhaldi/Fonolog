// TAMAMLA BAŞTAN — Complete from Start (Level 3)
// Screen type: quiz
// Task: Last syllable shown → choose which word ends with it
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genTamamlaBastan(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const multi   = words.filter(w => w.n >= 2)
  const primary = (opts?.targets ?? words).filter(w => w.n >= 2)
  return shuffle(primary).slice(0, 20).map((word, i) => {
    const ending = word.syl[word.syl.length - 1]
    const head   = word.syl.slice(0, -1).join('')   // e.g. "ka" for "kalem"
    const distractors = shuffle(
      multi.filter(w =>
        w.word !== word.word &&
        w.syl.slice(0, -1).join('') !== head
      )
    )
      .map(w => w.syl.slice(0, -1).join(''))
      .filter((h, idx, arr) => h.length > 0 && arr.indexOf(h) === idx)
      .slice(0, 3)
    if (distractors.length < 3) return null
    return {
      id:      qid('tb', i),
      word,
      options: shuffle([head, ...distractors]),
      correct: head,
      prompt:  `___${ending}`,
    }
  }).filter((q): q is NonNullable<typeof q> => q !== null) as Question[]
}
