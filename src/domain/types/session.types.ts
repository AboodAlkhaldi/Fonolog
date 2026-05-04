export interface SessionResult {
  moduleId:        string
  moduleName:      string
  moduleLevel:     number
  sessionMode:     import('./module.types').SessionMode
  correctCount:    number
  wrongCount:      number
  totalCount:      number
  scorePercent:    number
  avgResponseMs:   number | null
  maxMemoryLevel:  number | null
  xpEarned:        number
  durationSec:     number
  assignmentId?:   string
}

export interface SessionLog extends SessionResult {
  id:           string
  student_id:   string
  session_date: string
  created_at:   string
}

export interface MemorySessionState {
  level:       number
  ardisik:     number
  hataSonrasi: boolean
  maxLevel:    number
  totalCount:  number
}
