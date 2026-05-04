// TAMAMLA BAŞTAN — Complete from Start (Level 3)
// Screen type: quiz
// Task: Last syllable shown → choose which word ends with it
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genTamamlaBastan(words: Word[]): Question[] {
  const multi = words.filter(w => w.n >= 2)
  return shuffle(multi).slice(0, 20).map((word, i) => {
    const ending = word.syl[word.syl.length - 1]
    const correct = word.word
    const wrong = shuffle(multi.filter(w =>
      w.word !== word.word &&
      w.syl[w.syl.length - 1] !== ending
    )).slice(0, 3).map(w => w.word)
    if (wrong.length < 3) return null
    return {
      id:      qid('tb', i),
      word,
      options: shuffle([correct, ...wrong]),
      correct,
      prompt:  `"___${ending}" — hangi kelime?`,
    }
  }).filter((q): q is NonNullable<typeof q> => q !== null) as Question[]
}
