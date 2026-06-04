/**
 * Database types — mirror the Stage 1 schema 1:1.
 *
 * In production you can regenerate this with:
 *   npx supabase gen types typescript --project-id YOUR-REF > src/lib/database.types.ts
 *
 * This hand-written version is correct for the Stage 1 migrations and lets
 * Stage 2 compile without an internet round-trip to Supabase.
 */

// ─── Enums ───────────────────────────────────────────────
export type UserRole           = 'student' | 'teacher' | 'admin';
export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'student' | 'expert';
export type HomeworkStatus     = 'assigned' | 'completed' | 'overdue';
export type MilestoneStatus    = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type ItemRarity         = 'common' | 'rare' | 'legendary';
export type NoteType           = 'observation' | 'progress' | 'concern' | 'recommendation' | 'parent_message';

export type XpReason =
  | 'wordCorrect' | 'wordCorrectPronounce'
  | 'sessionComplete' | 'sessionPerfect'
  | 'assignmentComplete' | 'assignmentPerfect'
  | 'milestoneTest' | 'milestoneTestPerfect'
  | 'dailyLogin' | 'streak3Days' | 'streak7Days' | 'streak30Days';

export type NotificationType =
  | 'homework_new' | 'homework_completed' | 'homework_overdue' | 'homework_due_soon'
  | 'milestone_due' | 'milestone_completed'
  | 'streak_reminder' | 'xp_milestone'
  | 'subscription_started' | 'subscription_renewed'
  | 'subscription_expiring' | 'subscription_expired' | 'subscription_cancelled'
  | 'new_user_signup' | 'admin_subscription_event' | 'admin_account_removed'
  | 'teacher_note' | 'teacher_message';

// ─── Row types ───────────────────────────────────────────
export interface ProfileRow {
  id:                     string;
  full_name:              string;
  email:                  string;
  role:                   UserRole;
  subscription_status:    SubscriptionStatus;
  subscription_expires:   string | null;
  child_age:              number | null;
  child_avatar_emoji:     string | null;
  device_push_token:      string | null;
  role_locked_at:         string | null;
  school_name:            string | null;
  planned_students:       number | null;
  teacher_age:            number | null;
  planned_plan:           'monthly' | 'yearly' | null;
  is_active:              boolean;
  expiry_warning_sent_at: string | null;
  welcome_email_sent_at:  string | null;
  created_at:             string;
  updated_at:             string;
}

export interface CategoryRow {
  id:            string;
  name:          string;
  emoji:         string;
  display_order: number;
  is_active:     boolean;
  created_at:    string;
}

export interface WordRow {
  id:             string;
  category_id:    string;
  word_text:      string;
  emoji:          string | null;
  syllables:      string[];
  syllable_count: number;
  first_letter:   string;
  last_letter:    string;
  rhyme_group:    string | null;
  has_svg:        boolean;
  audio_url:      string | null;
  image_url:      string | null;
  image_type:     'svg' | 'png' | null;
  is_active:      boolean;
  created_at:     string;
}

export interface StudentWordProgressRow {
  student_id:     string;
  word_id:        string;
  times_seen:     number;
  times_correct:  number;
  current_level:  number;
  last_seen_at:   string | null;
  mastered_at:    string | null;
}

export interface SessionLogRow {
  id:                string;
  student_id:        string;
  module_id:         string;
  questions_total:   number;
  questions_correct: number;
  duration_seconds:  number;
  xp_earned:         number;
  word_ids:          string[];
  assignment_id:     string | null;
  created_at:        string;
}

export interface CharacterBaseRow {
  id:            string;
  name:          string;
  description:   string | null;
  asset_url:     string;
  asset_type:    'svg' | 'png' | 'lottie';
  unlock_xp:     number;
  display_order: number;
  is_active:     boolean;
  created_at:    string;
}

export interface CharacterVariantRow {
  id:                  string;
  base_character_id:   string;
  name:                string;
  description:         string | null;
  asset_url:           string;
  asset_type:          'svg' | 'png' | 'lottie';
  unlock_xp:           number;
  rarity:              ItemRarity;
  display_order:       number;
  is_active:           boolean;
  created_at:          string;
}

export interface StudentCharacterRow {
  student_id:           string;
  total_xp:             number;
  level:                number;
  current_streak:       number;
  longest_streak:       number;
  last_activity_date:   string | null;
  base_character_id:    string | null;
  equipped_variant_id:  string | null;
  current_cycle:        number;
  current_day:          number;
  day_completion:       Record<string, string[]>;
  day_completed_at:     string | null;
  adaptive_levels:      Record<string, number>;
  updated_at:           string;
}

export interface XpTransactionRow {
  id:            string;
  student_id:    string;
  amount:        number;
  reason:        XpReason;
  session_id:    string | null;
  word_id:       string | null;
  assignment_id: string | null;
  created_at:    string;
}

export interface HomeworkRow {
  id:                string;
  teacher_id:        string;
  student_id:        string;
  module_id:         string;
  word_ids:          string[];
  title:             string;
  instructions:      string | null;
  status:            HomeworkStatus;
  score:             number | null;
  teacher_note:      string | null;
  session_id:        string | null;
  created_at:        string;
  due_at:            string;
  completed_at:      string | null;
  overdue_at:        string | null;
  reminder_sent_at:  string | null;
}

export interface NotificationRow {
  id:        string;
  user_id:   string;
  type:      NotificationType;
  title:     string;
  body:      string;
  payload:   Record<string, unknown> | null;
  read_at:   string | null;
  created_at:string;
}

export interface TeacherNoteRow {
  id:                string;
  teacher_id:        string;
  student_id:        string;
  note_type:         NoteType;
  body:              string;
  include_in_report: boolean;
  created_at:        string;
  updated_at:        string;
}

// ─── Top-level Database type (Supabase client generic) ───
//
// Each table needs: Row, Insert, Update, Relationships.
// `Relationships: []` is a literal empty array tuple — required by postgrest-js's
// GenericTable shape, even when the table has no FK relationships we want
// to expose for embedded selects.
//
// Even read-only-ish tables (xp_transactions, session_logs) declare
// Insert/Update as Partial<Row> — RLS gates writes at the DB level, the type
// is just about what the client _can attempt_.
export interface Database {
  public: {
    Tables: {
      profiles:                { Row: ProfileRow;                Insert: Partial<ProfileRow>;                Update: Partial<ProfileRow>;                Relationships: [] };
      teacher_students:        { Row: { teacher_id: string; student_id: string; created_at: string }; Insert: { teacher_id: string; student_id: string }; Update: { teacher_id?: string; student_id?: string }; Relationships: [] };
      categories:              { Row: CategoryRow;               Insert: Partial<CategoryRow>;               Update: Partial<CategoryRow>;               Relationships: [] };
      words:                   { Row: WordRow;                   Insert: Partial<WordRow>;                   Update: Partial<WordRow>;                   Relationships: [] };
      student_word_progress:   { Row: StudentWordProgressRow;    Insert: Partial<StudentWordProgressRow>;    Update: Partial<StudentWordProgressRow>;    Relationships: [] };
      session_logs:            { Row: SessionLogRow;             Insert: Omit<SessionLogRow, 'id' | 'created_at'>; Update: Partial<SessionLogRow>;          Relationships: [] };
      characters_base:         { Row: CharacterBaseRow;          Insert: Partial<CharacterBaseRow>;          Update: Partial<CharacterBaseRow>;          Relationships: [] };
      character_extras:        { Row: CharacterVariantRow;       Insert: Partial<CharacterVariantRow>;       Update: Partial<CharacterVariantRow>;       Relationships: [] };
      student_character:       { Row: StudentCharacterRow;       Insert: Partial<StudentCharacterRow>;       Update: Partial<StudentCharacterRow>;       Relationships: [] };
      xp_transactions:         { Row: XpTransactionRow;          Insert: Partial<XpTransactionRow>;          Update: Partial<XpTransactionRow>;          Relationships: [] };
      homeworks:               { Row: HomeworkRow;               Insert: Partial<HomeworkRow>;               Update: Partial<HomeworkRow>;               Relationships: [] };
      notifications:           { Row: NotificationRow;           Insert: Partial<NotificationRow>;           Update: Partial<NotificationRow>;           Relationships: [] };
      teacher_notes:           { Row: TeacherNoteRow;            Insert: Partial<TeacherNoteRow>;            Update: Partial<TeacherNoteRow>;            Relationships: [] };
    };
    Views:     Record<string, never>;
    Functions: {
      award_xp: {
        Args:    { p_amount: number; p_reason: XpReason; p_session_id?: string; p_word_id?: string };
        Returns: { new_total_xp: number; new_level: number };
      };
      is_admin: {
        Args:    Record<string, never>;
        Returns: boolean;
      };
      is_teacher_of: {
        Args:    { target_student_id: string };
        Returns: boolean;
      };
      update_streak: {
        Args:    Record<string, never>;
        Returns: { current_streak: number; longest_streak: number };
      };
      equip_item: {
        Args:    { p_item_id: string };
        Returns: void;
      };
    };
    Enums:     { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
