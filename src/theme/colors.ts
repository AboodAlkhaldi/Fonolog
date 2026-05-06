/**
 * Color tokens.
 *
 * ─ Architecture ─────────────────────────────────────────
 * Two layers:
 *   1. PALETTE (raw): the actual colors. Never reference these in components.
 *   2. SEMANTIC tokens: meaning-based names that components import.
 *
 * To add dark mode later: add a `dark` semantic map and switch via theme provider.
 * Components don't change — they import `colors.text.primary`, not `colors.gray[900]`.
 *
 * ─ Style ────────────────────────────────────────────────
 * Warm, child-friendly. Cream background (#FFF8E7) instead of stark white.
 * High contrast for accessibility (WCAG AA tested).
 */

// ─── 1. PALETTE (raw) ──────────────────────────────────────
const palette = {
  // Yellows — primary brand
  yellow: {
    50:  '#FFFBEA',
    100: '#FFF8E7',  // app background
    200: '#FFEFC4',
    300: '#FFE08A',
    400: '#FFC857',  // primary accent (Detective hat)
    500: '#FFB627',
    600: '#E69510',
    700: '#B5760D',
  },
  // Teals — secondary
  teal: {
    100: '#D8F3EE',
    300: '#7FC8B9',
    500: '#3FA796',  // secondary accent
    700: '#246B5F',
  },
  // Coral — call-to-action / errors
  coral: {
    100: '#FFE4DE',
    300: '#FFA590',
    500: '#FF6B4A',
    700: '#C24226',
  },
  // Greens — success / correct answers
  green: {
    100: '#DEF7DE',
    300: '#88D88A',
    500: '#3DB14B',
    700: '#226B2A',
  },
  // Reds — wrong answers (used sparingly to avoid shame)
  red: {
    100: '#FBE0E0',
    300: '#F08080',
    500: '#E14444',
    700: '#9C2020',
  },
  // Neutral grays
  gray: {
    50:  '#FAFAFA',
    100: '#F2F2F2',
    200: '#E2E2E2',
    300: '#C8C8C8',
    400: '#A0A0A0',
    500: '#787878',
    600: '#5A5A5A',
    700: '#3F3F3F',
    800: '#2A2A2A',
    900: '#1A1A1A',
  },
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
} as const;

// ─── 2. SEMANTIC tokens ────────────────────────────────────
// Components ONLY use this map.
export const colors = {
  // ── Surfaces (backgrounds) ──
  background: {
    primary:   palette.yellow[100],   // main app background
    secondary: palette.white,         // cards, sheets
    tertiary:  palette.yellow[50],    // subtle inset blocks
    inverse:   palette.gray[800],
  },

  // ── Text ──
  text: {
    primary:   palette.gray[900],
    secondary: palette.gray[700],
    muted:     palette.gray[500],
    inverse:   palette.white,
    link:      palette.teal[700],
    error:     palette.red[700],
  },

  // ── Borders / dividers ──
  border: {
    subtle:   palette.gray[200],
    default:  palette.gray[300],
    strong:   palette.gray[500],
    focus:    palette.yellow[500],
  },

  // ── Brand ──
  brand: {
    primary:        palette.yellow[400],   // Detective hat yellow
    primaryHover:   palette.yellow[500],
    primaryPressed: palette.yellow[600],
    secondary:      palette.teal[500],
    secondaryHover: palette.teal[700],
  },

  // ── Status / feedback ──
  feedback: {
    success:        palette.green[500],
    successSubtle:  palette.green[100],
    successText:    palette.green[700],

    warning:        palette.yellow[600],
    warningSubtle:  palette.yellow[200],
    warningText:    palette.yellow[700],

    error:          palette.red[500],
    errorSubtle:    palette.red[100],
    errorText:      palette.red[700],

    info:           palette.teal[500],
    infoSubtle:     palette.teal[100],
  },

  // ── Action ──
  action: {
    cta:        palette.coral[500],     // big "Hadi başla!" buttons
    ctaHover:   palette.coral[700],
    ctaSubtle:  palette.coral[100],
  },

  // ── Overlay ──
  overlay: 'rgba(26, 26, 26, 0.55)',

  // ── Special: gamification ──
  xp:    palette.yellow[400],
  star:  palette.yellow[500],
  level: palette.teal[500],
  streak: palette.coral[500],

  transparent: palette.transparent,
} as const;

export type Colors = typeof colors;

// Re-export the raw palette for special cases (gradients, shadows).
export { palette };
