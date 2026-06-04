// SON HECE SİLME — Last Syllable Deletion (Level 3)
// Screen type: phoneme (text input)
// Task: Say the word WITHOUT the last syllable. Type what's left.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genSonHeceSilme(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = (opts?.targets ?? words).filter(w => w.n >= 2)
  return shuffle(primary).slice(0, 20).map((word, i) => {
    // Derive the remainder from the original word text (NOT syl.join('')) so the
    // space in a multi-word phrase survives: "yürüyen merdiven" → "yürüyen
    // merdi", not "yürüyenmerdi". The last syllable is anchored at the end, so
    // stripping its char-length from the back is exact; trim cleans up a
    // trailing space if the last word was single-syllable.
    const lastSyl   = word.syl[word.syl.length - 1] ?? ''
    const remaining = word.word.slice(0, word.word.length - lastSyl.length).trim()
    return {
      id:      qid('shs', i),
      word,
      correct: remaining,
      prompt:  `"${word.word}" kelimesinin son hecesini çıkar. Ne kalır?`,
      extra:   { inputMode: 'prefix' }, // user types the remaining prefix: [input]--
    }
  })
}
