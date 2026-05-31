/**
 * Public domain API.
 *
 * Other layers ONLY import from `@/domain` (this barrel), never from
 * `@/domain/generators/...` directly. The barrel hides:
 *   - the row→domain adapter mapping
 *   - the cache strategy in the content repository
 *   - which generators implement which modules
 *
 * That means we can refactor inside `domain/` freely as long as the
 * public surface stays the same.
 */

// ── Types (re-exported from `./types/index.ts`) ──
export type {
  Word, Category, WordStatus, StudentWordProgress, WordWithProgress,
  ScreenType, SessionMode, Question, ModuleDefinition,
  SessionResult, SessionLog, MemorySessionState,
  UserRole, SubscriptionStatus, Profile, TeacherStudent, EntitlementKey,
  ItemType, ItemRarity, CharacterItem, EquippedItems, StudentCharacter, XPSource,
  AssignmentStatus, Assignment, TestTemplate, StudentMilestone, TeacherNote, Notification,
} from './types';
export { SUBSCRIPTION_ENTITLEMENTS } from './types';

// ── Module registry + session generator ──
export { MODULES_REGISTRY } from './modules.registry';
export {
  getModule,
  listModules,
  generateSession,
  type SessionOptions,
} from './session';

/**
 * Modules where the on-screen prompt text should be hidden. For these games,
 * the student should only see the word image and the answer choices — no
 * "kalem hangi harfle başlar?" line at the top spelling out the target.
 * Per product call: prevent the text from being a free hint.
 */
export const HIDE_PROMPT_TEXT_MODULES = new Set<string>([
  'ayirtEtme',
  'hecele',
  'sonHece',
  'uzunKelime',
  'uyak',
  'ilkSes',
  'sonSes',
  'fonemSilme',
  'uyakUretim',
  'ilkHeceSilme',
  'sonHeceSilme',
  // Tamamla and Baştan Tamamla render the syllable hint below the image
  // via QuestionPrompt — the prompt text is redundant on top of that.
  'tamamla',
  'tamamlaBastan',
]);

// ── Repositories ──
export { contentRepository } from './repositories/content.repository';

// ── Repository interfaces (for tests / DI) ──
export type { IContentRepository }      from './interfaces/content-repository.interface';
export type { IProgressRepository }     from './interfaces/progress-repository.interface';
export type { ICharacterRepository }    from './interfaces/character-repository.interface';
export type { IAssignmentRepository }   from './interfaces/assignment-repository.interface';
export type { ITeacherRepository }      from './interfaces/teacher-repository.interface';
export type { ISpeechRecognizer }       from './interfaces/speech-recognizer.interface';
export type { ISubscriptionService }    from './interfaces/subscription-service.interface';
export type { INotificationService }    from './interfaces/notification-service.interface';

// ── Adapters (rarely needed outside domain, but exposed for tests) ──
export {
  wordFromRow,
  wordsFromRows,
  categoryFromRow,
  profileFromRow,
} from './adapters';
