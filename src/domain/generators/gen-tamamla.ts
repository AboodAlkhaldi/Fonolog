// TAMAMLA — Complete the Word (Level 3)
// Screen type: quiz
// Task: First syllable shown → choose which word it completes
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genTamamla(words: Word[]): Question[] {
  const multi = words.filter(w => w.n >= 2)
  return shuffle(multi).slice(0, 20).map((word, i) => {
    const stem    = word.syl[0]
    const tail    = word.syl.slice(1).join('')      // e.g. "lem" for "kalem"
    // Distractors: tails of OTHER words that aren't equal to ours
    const distractors = shuffle(
      multi.filter(w =>
        w.word !== word.word &&
        w.syl.slice(1).join('') !== tail
      )
    )
      .map(w => w.syl.slice(1).join(''))
      .filter((t, idx, arr) => t.length > 0 && arr.indexOf(t) === idx)  // unique
      .slice(0, 3)
    if (distractors.length < 3) return null
    return {
      id:      qid('tm', i),
      word,
      options: shuffle([tail, ...distractors]),
      correct: tail,
      prompt:  `"${stem}___" — eksik parçayı seç!`,
    }
  }).filter((q): q is NonNullable<typeof q> => q !== null) as Question[]
}
