// TAMAMLA — Complete the Word (Level 3)
// Screen type: quiz
// Task: First syllable shown → choose which word it completes
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid, boundaryAfter, joinSyl } from './utils'

export function genTamamla(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const multi   = words.filter(w => w.n >= 2)
  const primary = (opts?.targets ?? words).filter(w => w.n >= 2)
  return shuffle(primary).slice(0, 20).map((word, i) => {
    const stem    = word.syl[0]
    // Rest of the word after the first syllable, keeping any word break so a
    // two-word phrase stays "raba vapuru", not "rabavapuru".
    const tail    = joinSyl(word, 1)
    // If the word breaks right after the stem (e.g. "bal kabağı"), show the
    // space in the hint so it reads as two words: "bal ___".
    const stemHint = stem + (boundaryAfter(word).has(0) ? ' ' : '')
    // Distractors: tails of OTHER words that aren't equal to ours
    const distractors = shuffle(
      multi.filter(w =>
        w.word !== word.word &&
        joinSyl(w, 1) !== tail
      )
    )
      .map(w => joinSyl(w, 1))
      .filter((t, idx, arr) => t.length > 0 && arr.indexOf(t) === idx)  // unique
      .slice(0, 3)
    if (distractors.length < 3) return null
    return {
      id:      qid('tm', i),
      word,
      options: shuffle([tail, ...distractors]),
      correct: tail,
      prompt:  `"${stemHint}___" — eksik parçayı seç!`,
    }
  }).filter((q): q is NonNullable<typeof q> => q !== null) as Question[]
}
