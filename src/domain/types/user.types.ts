/**
 * Domain re-export of the user/profile types.
 *
 * The legacy domain `Profile` shape (`display_name`, `date_of_birth`,
 * `avatar_color`, `revenuecat_id`, ...) was from Stage 0 and no longer
 * matches the DB. The actual DB shape lives in `src/lib/database.types.ts`
 * as `ProfileRow`. We re-export it under the historical `Profile` name so
 * older imports (`import type { Profile } from '@/domain'`) keep working
 * without a codebase-wide rename.
 */
export type { ProfileRow as Profile } from '@/lib/database.types'
export type { UserRole, SubscriptionStatus } from '@/lib/database.types'

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

import type { SubscriptionStatus } from '@/lib/database.types'

export const SUBSCRIPTION_ENTITLEMENTS: Record<SubscriptionStatus, EntitlementKey[]> = {
  free: [],
  active: [
    'all_categories', 'all_modules', 'learn_mode', 'revision_mode',
    'milestone_tests', 'tts_all_words', 'microphone', 'full_character',
    'unlimited_history', 'unlimited_pdf',
  ],
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
  // 'coupon' = promo-code Pro: identical full student-grade entitlements, just a
  // shorter (30-day) window. Mirrors `student` exactly.
  coupon: [
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
