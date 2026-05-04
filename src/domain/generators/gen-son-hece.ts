// SON HECE — Last Syllable (Level 2)
// Screen type: quiz
// Task: What is the last syllable of this word?
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genSonHece(words: Word[]): Question[] {
  const multi = words.filter(w => w.n >= 2)
  const sylPool = [...new Set(multi.flatMap(w => w.syl))]
  return shuffle(multi).slice(0, 20).map((word, i) => {
    const correct = word.syl[word.syl.length - 1]
    const opts = shuffle([correct, ...shuffle(sylPool.filter(s => s !== correct)).slice(0, 3)])
    return {
      id:      qid('sh', i),
      word,
      options: opts,
      correct,
      prompt:  `"${word.word}" kelimesinin son hecesi nedir?`,
    }
  })
}
