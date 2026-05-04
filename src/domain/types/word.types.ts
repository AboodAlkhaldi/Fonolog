export interface Word {
  id?:          string     // UUID when from DB, undefined in seed data
  kat:          string     // category name e.g. 'Hayvanlar'
  word:         string     // Turkish word e.g. 'kalem'
  emoji:        string     // fallback emoji e.g. '✏️'
  syl:          string[]   // syllables e.g. ['ka','lem']
  n:            number     // syllable count
  first:        string     // first phoneme/letter
  last:         string     // last phoneme/letter
  rk:           string | null  // rhyme group key e.g. 'em' or null
  svg?:         string     // inline SVG content if available
  tts_url?:     string     // audio URL from Storage
}

export interface Category {
  id:         string
  name:       string
  level:      number
  color_hex:  string
  emoji:      string
  sort_order: number
  is_active:  boolean
  is_seeded:  boolean
}

export type WordStatus = 'unseen' | 'learned' | 'needs_review'

export interface StudentWordProgress {
  id:            string
  student_id:    string
  word_id:       string
  status:        WordStatus
  times_seen:    number
  times_correct: number
  learned_at:    string | null
  last_seen_at:  string
}

export interface WordWithProgress extends Word {
  progress?: StudentWordProgress
}
