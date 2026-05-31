// KELİME DİZİSİ — Word Series Memory (Level 2)
// Screen type: sequence — adaptive memory loop, word-recall mode
// Task: Watch images flash one by one → tap the matching word NAMES in order.
//
// Rules (per fonoloji reference):
//   - Start at level 3 (3 items per round)
//   - +1 every 3 correct in a row (or 2 after an error)
//   - -1 on a wrong round
//   - Range: 2..7
//   - 30 rounds total per session
//
// The component MemoryAdaptiveQuestion owns the adaptive loop and reports the
// final summary back via useSession.completeMemorySession. The generator just
// hands over the seed pool of words to draw rounds from.
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'

export function genKelimeDizisi(words: Word[], opts?: { targets?: Word[] }): Question[] {
  const pool = opts?.targets && opts.targets.length > 0 ? opts.targets : words
  if (pool.length < 3) return []
  return [{
    id:      'kd-seed',
    word:    pool[0],
    correct: '__memory__',
    prompt:  '',
    extra:   { mode: 'word', pool, isMemory: true },
  }]
}
