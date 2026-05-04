export type UserRole = 'student' | 'admin'

export type SubscriptionStatus = 'free' | 'trial' | 'student' | 'expert'

export interface Profile {
  id:                  string
  role:                UserRole
  full_name:           string
  display_name:        string | null
  date_of_birth:       string | null
  avatar_color:        string
  device_push_token:   string | null
  subscription_status: SubscriptionStatus
  subscription_expires: string | null
  revenuecat_id:       string | null
  email_verified:      boolean
  streak_count:        number
  last_active_date:    string | null
  created_at:          string
  updated_at:          string
}

export interface TeacherStudent {
  id:           string
  teacher_id:   string
  student_id:   string | null
  manual_name:  string | null
  manual_email: string | null
  status:       'unregistered' | 'linked'
  notes:        string | null
  linked_at:    string | null
  created_at:   string
}

export type EntitlementKey =
  | 'all_categories'
  | 'all_modules'
  | 'learn_mode'
  | 'revision_mode'
  | 'milestone_tests'
  | 'tts_all_words'
  | 'microphone'
  | 'full_character'
  | 'unlimited_history'
  | 'unlimited_pdf'
  | 'teacher_dashboard'
  | 'homework_system'
  | 'word_management'
  | 'teacher_pdf'

export const SUBSCRIPTION_ENTITLEMENTS: Record<SubscriptionStatus, EntitlementKey[]> = {
  free: [],
  trial: [
    'all_categories', 'all_modules', 'learn_mode', 'revision_mode',
    'milestone_tests', 'tts_all_words', 'microphone', 'full_character',
    'unlimited_history', 'unlimited_pdf',
  ],
  student: [
    'all_categories', 'all_modules', 'learn_mode', 'revision_mode',
    'milestone_tests', 'tts_all_words', 'microphone', 'full_character',
    'unlimited_history', 'unlimited_pdf',
  ],
  expert: [
    'all_categories', 'all_modules', 'learn_mode', 'revision_mode',
    'milestone_tests', 'tts_all_words', 'microphone', 'full_character',
    'unlimited_history', 'unlimited_pdf', 'teacher_dashboard',
    'homework_system', 'word_management', 'teacher_pdf',
  ],
}
