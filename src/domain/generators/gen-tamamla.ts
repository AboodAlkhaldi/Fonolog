// TAMAMLA — Complete the Word (Level 3)
// Screen type: quiz
// Task: First syllable shown → choose which word it completes
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genTamamla(words: Word[]): Question[] {
  const multi = words.filter(w => w.n >= 2)
  return shuffle(multi).slice(0, 20).map((word, i) => {
    const stem = word.syl[0]
    const correct = word.word
    const wrong = shuffle(multi.filter(w =>
      w.word !== word.word && !w.word.startsWith(stem)
    )).slice(0, 3).map(w => w.word)
    if (wrong.length < 3) return null
    return {
      id:      qid('tm', i),
      word,
      options: shuffle([correct, ...wrong]),
      correct,
      prompt:  `"${stem}___" — hangi kelime?`,
    }
  }).filter((q): q is NonNullable<typeof q> => q !== null) as Question[]
}
