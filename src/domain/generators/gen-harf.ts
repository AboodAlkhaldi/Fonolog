// HARF AVCISI — Letter Hunter (Level 1)
// Screen type: quiz
// Task: The child sees the picture (+ can listen via the speaker) and answers
//   "Bu kelimede 'X' harfi var mıydı?" with Var / Yok.
// Across the ~20 questions the correct answer is balanced ~50/50 Var/Yok.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

// Turkish lowercase alphabet — used both to filter "real" letters out of a word
// and to draw a letter that is NOT in the word (for the "Yok" questions).
const TR_ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz'.split('')

export function genHarf(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const primary = opts?.targets ?? words
  const pool    = shuffle(primary).slice(0, 20)

  // Pre-decide which questions should be "Var" vs "Yok" so the set stays
  // balanced (~half each) instead of leaning one way by chance.
  const half      = Math.floor(pool.length / 2)
  const wantVarAt = shuffle(pool.map((_, idx) => idx < half))

  return pool.map((word, i) => {
    const lower   = word.word.toLocaleLowerCase('tr')
    const present = [...new Set(lower.split('').filter(ch => TR_ALPHABET.includes(ch)))]
    const absent  = TR_ALPHABET.filter(ch => !present.includes(ch))

    // Pick a letter that makes the intended answer true. Fall back to the other
    // bucket only in the (practically impossible) case that one is empty.
    const wantVar = wantVarAt[i]
    let letter: string
    let correct: 'Var' | 'Yok'
    if (wantVar && present.length > 0) {
      letter = shuffle(present)[0]; correct = 'Var'
    } else if (!wantVar && absent.length > 0) {
      letter = shuffle(absent)[0];  correct = 'Yok'
    } else if (present.length > 0) {
      letter = shuffle(present)[0]; correct = 'Var'
    } else {
      letter = shuffle(absent)[0];  correct = 'Yok'
    }

    return {
      id:      qid('hf', i),
      word,
      options: ['Var', 'Yok'],
      correct,
      prompt:  `Bu kelimede "${letter.toLocaleUpperCase('tr')}" harfi var mıydı?`,
    }
  })
}
