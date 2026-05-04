export type AssignmentStatus = 'pending' | 'completed' | 'overdue'

export interface Assignment {
  id:           string
  teacher_id:   string
  student_id:   string
  title:        string
  instructions: string | null
  module_id:    string
  word_ids:     string[]
  category_ids: string[]
  due_date:     string | null
  status:       AssignmentStatus
  created_at:   string
  completed_at: string | null
}

export interface TestTemplate {
  id:                  string
  title:               string
  description:         string | null
  word_ids:            string[]
  word_count:          number
  milestone_threshold: number
  difficulty_level:    number
  is_active:           boolean
  created_by:          string
  created_at:          string
}

export interface StudentMilestone {
  id:               string
  student_id:       string
  test_template_id: string
  triggered_at:     string
  status:           'pending' | 'completed' | 'skipped'
  completed_at:     string | null
  score_percent:    number | null
  is_locked:        boolean
  teacher_override: boolean
}

export interface TeacherNote {
  id:             string
  teacher_id:     string
  student_id:     string
  note_date:      string
  content:        string
  include_report: boolean
  note_type:      'general' | 'observation' | 'recommendation' | 'goal'
  created_at:     string
  updated_at:     string
}

export interface Notification {
  id:                string
  recipient_id:      string
  sender_id:         string | null
  notification_type: string
  title:             string
  body:              string
  reference_id:      string | null
  reference_type:    string | null
  is_read:           boolean
  sent_at:           string
}
