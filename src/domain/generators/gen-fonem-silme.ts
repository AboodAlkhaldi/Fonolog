// FONEM SİLME — Phoneme Deletion (Level 3)
// Screen type: phoneme (text input)
// Task: Say the word WITHOUT the first sound. Type what's left.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genFonemSilme(words: Word[]): Question[] {
  return shuffle(words.filter(w => w.word.length >= 3)).slice(0, 20).map((word, i) => {
    const withoutFirst = word.word.slice(1)  // remove first character
    return {
      id:      qid('fs', i),
      word,
      correct: withoutFirst,
      prompt:  `"${word.word}" kelimesinin ilk sesini çıkar. Ne kalır?`,
    }
  })
}
