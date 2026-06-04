// İLK HECE SİLME — First Syllable Deletion (Level 3)
// Screen type: phoneme (text input)
// Task: Say the word WITHOUT the first syllable. Type what's left.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genIlkHeceSilme(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = (opts?.targets ?? words).filter(w => w.n >= 2)
  return shuffle(primary).slice(0, 20).map((word, i) => {
    // Derive the remainder from the original word text (NOT syl.join('')) so the
    // space in a multi-word phrase survives: "yürüyen merdiven" → "rüyen
    // merdiven", not "rüyenmerdiven". The first syllable is anchored at the
    // start, so stripping its char-length from the front is exact; trim cleans
    // up a leading space if the first word was single-syllable.
    const firstSyl  = word.syl[0] ?? ''
    const remaining = word.word.slice(firstSyl.length).trim()
    return {
      id:      qid('ihs', i),
      word,
      correct: remaining,
      prompt:  `"${word.word}" kelimesinin ilk hecesini çıkar. Ne kalır?`,
      extra:   { inputMode: 'suffix' }, // user types the remaining suffix: --[input]
    }
  })
}
