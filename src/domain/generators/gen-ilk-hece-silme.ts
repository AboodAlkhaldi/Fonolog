// İLK HECE SİLME — First Syllable Deletion (Level 3)
// Screen type: phoneme (text input)
// Task: Say the word WITHOUT the first syllable. Type what's left.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genIlkHeceSilme(words: Word[]): Question[] {
  return shuffle(words.filter(w => w.n >= 2)).slice(0, 20).map((word, i) => {
    const remaining = word.syl.slice(1).join('')
    return {
      id:      qid('ihs', i),
      word,
      correct: remaining,
      prompt:  `"${word.word}" kelimesinin ilk hecesini çıkar. Ne kalır?`,
      extra:   { inputMode: 'suffix' }, // user types the remaining suffix: --[input]
    }
  })
}
