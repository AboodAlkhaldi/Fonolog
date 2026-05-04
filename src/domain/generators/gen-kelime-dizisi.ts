// KELİME DİZİSİ — Word Series Memory (Level 2)
// Screen type: memory (adaptive flash + recall)
// Task: Listen to word sequence → tap in correct order
// Uses adaptive difficulty (see APPENDIX B in agent prompt)
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genKelimeDizisi(words: Word[]): Question[] {
  // Returns question pool; actual adaptive logic is in MemorySession component
  return shuffle(words).slice(0, 30).map((word, i) => ({
    id:      qid('kd', i),
    word,
    correct: word.word,
    prompt:  'Kelimeleri sırayla hatırla!',
  }))
}
