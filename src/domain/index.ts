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
  characterItemFromRow,
  studentCharacterFromRow,
} from './adapters';
