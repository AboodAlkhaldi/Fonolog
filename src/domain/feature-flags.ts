/**
 * Global feature flags.
 *
 * Single switch for cross-cutting features. Importing files should read these
 * as constants — never branch on `process.env` or runtime config so the
 * bundler can dead-code-eliminate disabled paths.
 */

// Mic/pronunciation system fully removed. The phoneme games (fonemSilme,
// ilkHeceSilme, sonHeceSilme) now use keyboard text input instead.
