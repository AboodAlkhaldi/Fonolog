/**
 * When admin/teacher is in preview (impersonation) mode, profile fields
 * fetched from the DB get masked with neutral placeholder strings so the
 * preview shows a generic shell rather than the actual user's data.
 */
import type { Profile } from '@/store/auth';

export const PREVIEW_PLACEHOLDER_AVATAR = '🦁';

export function withPreviewPlaceholders(
  profile: Profile | null,
  impersonating: 'student' | 'teacher' | null,
): Profile | null {
  if (!profile || !impersonating) return profile;
  return {
    ...profile,
    full_name:           'Öğrenci Adı',
    email:               'ornek@okumadedektifi.com',
    child_age:           null,
    child_avatar_emoji:  PREVIEW_PLACEHOLDER_AVATAR,
    school_name:         '-',
    planned_students:    null,
    teacher_age:         null,
    planned_plan:        null,
  };
}
