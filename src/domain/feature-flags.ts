/**
 * Global feature flags.
 *
 * Single switch for cross-cutting features. Importing files should read these
 * as constants — never branch on `process.env` or runtime config so the
 * bundler can dead-code-eliminate disabled paths.
 */

// Mic/pronunciation system fully removed. The phoneme games (fonemSilme,
// ilkHeceSilme, sonHeceSilme) now use keyboard text input instead.

/**
 * Master switch for the teacher module.
 *
 * When `false` the app is student-only:
 *   - new users are auto-assigned the `student` role (no role choice screen)
 *   - existing teacher-role accounts are blocked from signing in
 *   - teacher linking, homework, the teacher tab/dashboard, teacher RevenueCat
 *     offerings, and teacher-only UI are all hidden
 *
 * NOTHING teacher-related is deleted — every teacher screen, table and edge
 * function stays in place. Flip this back to `true` to fully re-enable the
 * teacher module with no code changes elsewhere.
 */
export const TEACHER_MODULE_ENABLED = false;
