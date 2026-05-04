import type { Word } from './word.types'

export type ScreenType = 'quiz' | 'builder' | 'phoneme' | 'memory' | 'visual' | 'explore' | 'pronunciation'

export type SessionMode = 'free' | 'learn' | 'revision' | 'homework' | 'test'

export interface Question {
  id:       string
  word:     Word
  options?: string[]     // for quiz: 4 answer choices
  correct:  string       // the correct answer string
  prompt?:  string       // instruction text override
}

export interface ModuleDefinition {
  id:              string
  icon:            string
  title:           string
  description:     string
  science:         string     // academic explanation (for teachers)
  familyTip:       string     // tip for parents
  color:           string     // hex color for this module's theme
  level:           0 | 1 | 2 | 3 | 5
  screenType:      ScreenType
  generator:       (words: Word[]) => Question[]
  requiresPremium: boolean
  isNew?:          boolean
}
