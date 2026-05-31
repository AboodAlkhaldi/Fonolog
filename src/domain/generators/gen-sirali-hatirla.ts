// SIRALI HATIRLA — Sequential Recall (Level 2)
// Screen type: sequence — adaptive memory loop, image-recall mode
// Task: Watch images flash one by one → tap the SAME IMAGES in the same order.
//
// Same adaptive rules as gen-kelime-dizisi; see that file for the spec.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'

export function genSiraliHatirla(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const pool = opts?.targets && opts.targets.length > 0 ? opts.targets : words
  if (pool.length < 3) return []
  return [{
    id:      'sr-seed',
    word:    pool[0],
    correct: '__memory__',
    prompt:  '',
    extra:   { mode: 'image', pool, isMemory: true },
  }]
}
