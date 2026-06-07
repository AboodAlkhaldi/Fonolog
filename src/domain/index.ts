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
  // 'harf' is NOT hidden: its prompt is "Bu kelimede 'X' harfi var mıydı?" which
  // doesn't spell out the word — the word itself stays hidden behind the image.
  'heceC',   // "kaç heceli?" — the prompt printed the word verbatim, letting a
             // reader count syllables by sight. Hidden so the child must LISTEN
             // (image + speaker only); the number tiles stay as the answer.
  'hecele',
  'sonHece',
  'uzunKelime',
  'uyak',
  'ilkSes',
  'sonSes',
  'fonemSilme',
  // 'uyakUretim' is NOT hidden: it's the mirror of uyak — the child must READ
  // the target word (yazı) and pick the rhyming picture, so the word is shown.
  'ilkHeceSilme',
  'sonHeceSilme',
  // Tamamla and Baştan Tamamla render the syllable hint below the image
  // via QuestionPrompt — the prompt text is redundant on top of that.
  'tamamla',
  'tamamlaBastan',
]);

/**
 * Modules that advance to the next item the instant the student answers — no
 * "revealed" verdict step, no extra "Devam" tap.
 *   - ran    → rapid automatic naming: tapping a name jumps straight on, so the
 *              child keeps a fast naming rhythm.
 *   - kesfet → explore mode has no scoring; the single "Devam et" button should
 *              move to the next word directly instead of revealing then asking
 *              the child to press "Devam" a second time.
 */
export const AUTO_ADVANCE_MODULES = new Set<string>([
  'ran',
  'kesfet',
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

// ── Multi-word phrase helpers (used by session components) ──
export { boundaryAfter, joinSyl } from './generators/utils';

// ── Adapters (rarely needed outside domain, but exposed for tests) ──
export {
  wordFromRow,
  wordsFromRows,
  categoryFromRow,
  profileFromRow,
} from './adapters';
