import type { Word } from './word.types'

export type ScreenType = 'quiz' | 'builder' | 'phoneme' | 'memory' | 'visual' | 'explore' | 'pronunciation' | 'audio-pair' | 'sequence'

export type SessionMode = 'free' | 'learn' | 'revision' | 'homework' | 'test'

export interface Question {
  id:       string
  word:     Word
  options?: string[]     // for quiz: 4 answer choices
  correct:  string       // the correct answer string
  prompt?:  string       // instruction text override
  extra?:   Record<string, unknown>  // module-specific payload (e.g. wordA/wordB for audio-pair)
}

/**
 * Optional second arg to every generator. The session layer uses `targets` to
 * focus a teacher-assigned homework on a specific subset of words: the generator
 * iterates `targets` for the "subject" of each question while still drawing
 * distractors from the broader `words` pool. When `targets` is omitted the
 * generator behaves identically to before.
 */
export interface GeneratorOptions {
  targets?: Word[]
}

export interface ModuleDefinition {
  id:              string
  icon:            string
  title:           string
  description:     string
  science:         string     // academic explanation (for teachers)
  familyTip:       string     // tip for parents
  color:           string     // hex color for this module's theme
  level:           0 | 1 | 2 | 3 | 4 | 5
  screenType:      ScreenType
  generator:       (words: Word[], options?: GeneratorOptions) => Question[]
  requiresPremium: boolean
  /** Modules that need TTS / mic / pronunciation grading. Always blocked in trial. */
  usesPronunciation?: boolean
  isNew?:          boolean
}
