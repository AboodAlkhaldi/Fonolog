// SON HECE SİLME — Last Syllable Deletion (Level 3)
// Screen type: phoneme (text input)
// Task: Say the word WITHOUT the last syllable. Type what's left.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genSonHeceSilme(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = (opts?.targets ?? words).filter(w => w.n >= 2)
  return shuffle(primary).slice(0, 20).map((word, i) => {
    const remaining = word.syl.slice(0, -1).join('')
    return {
      id:      qid('shs', i),
      word,
      correct: remaining,
      prompt:  `"${word.word}" kelimesinin son hecesini çıkar. Ne kalır?`,
      extra:   { inputMode: 'prefix' }, // user types the remaining prefix: [input]--
    }
  })
}
