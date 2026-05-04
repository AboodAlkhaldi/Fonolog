// RAN — Rapid Automatic Naming (Level 5)
// Screen type: quiz (timed — response time is the key metric)
// Task: See image/emoji → name it as fast as possible
// Response time is measured in milliseconds per question
import type { Word } from '../types/word.types'
import type { Question } from '../types/module.types'
import { shuffle, qid } from './utils'

export function genRan(words: Word[]): Question[] {
  // For RAN, we want visually distinctive words with good images
  // Prefer words with SVG illustrations
  const withSvg = words.filter(w => w.svg)
  const pool    = withSvg.length >= 10 ? withSvg : words
  return shuffle(pool).slice(0, 20).map((word, i) => ({
    id:      qid('ran', i),
    word,
    correct: word.word,
    prompt:  'Ne kadar hızlı söyleyebilirsin?',
    // RAN sessions measure avg_response_ms
    // QuizSession component handles timing when module.id === 'ran'
  }))
}
