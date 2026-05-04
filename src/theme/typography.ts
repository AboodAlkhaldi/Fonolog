/**
 * Typography tokens.
 *
 * Two font families:
 *   - Baloo 2:   round, friendly display font for headings & big buttons
 *   - Nunito:    clean, very readable body font (excellent for dyslexia)
 *
 * Children with dyslexia read short lines best (40–60 chars); we use
 * a max line width on text-heavy screens, enforced in components.
 */

export const fontFamily = {
  display:        'Baloo2_700Bold',     // headings
  displayMedium:  'Baloo2_600SemiBold',
  body:           'Nunito_400Regular',
  bodyMedium:     'Nunito_600SemiBold',
  bodyBold:       'Nunito_700Bold',
  mono:           'SpaceMono_400Regular',
} as const;

// Sized for kid-readability + iOS/Android safe minimums.
// All values are RN unitless (≈ DIP/sp).
export const fontSize = {
  xs:   12,
  sm:   14,
  base: 16,   // body default
  md:   18,
  lg:   20,
  xl:   24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,  // hero numbers (XP, score)
  '5xl': 64,
} as const;

export const lineHeight = {
  tight:   1.15,   // headings
  snug:    1.30,
  normal:  1.50,   // body text
  relaxed: 1.70,   // long-form / instruction text
} as const;

export const letterSpacing = {
  tight:  -0.5,
  normal: 0,
  wide:    0.5,
  wider:   1,
} as const;

// Pre-baked text styles. Components use `typography.h1` instead of stitching.
export const typography = {
  // Display
  h1: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize['3xl'],
    lineHeight: fontSize['3xl'] * lineHeight.tight,
  },
  h2: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.tight,
  },
  h3: {
    fontFamily: fontFamily.displayMedium,
    fontSize:   fontSize.xl,
    lineHeight: fontSize.xl * lineHeight.snug,
  },
  h4: {
    fontFamily: fontFamily.displayMedium,
    fontSize:   fontSize.lg,
    lineHeight: fontSize.lg * lineHeight.snug,
  },

  // Body
  body: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodyMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.base,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodyLarge: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.md,
    lineHeight: fontSize.md * lineHeight.normal,
  },
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
  },

  // Specialty
  button: {
    fontFamily:    fontFamily.displayMedium,
    fontSize:      fontSize.md,
    lineHeight:    fontSize.md * lineHeight.tight,
    letterSpacing: letterSpacing.wide,
  },
  buttonLarge: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.lg,
    lineHeight:    fontSize.lg * lineHeight.tight,
    letterSpacing: letterSpacing.wide,
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    lineHeight: fontSize.xs * lineHeight.normal,
  },
  numberHero: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize['5xl'],
    lineHeight: fontSize['5xl'] * lineHeight.tight,
  },
} as const;

export type Typography = typeof typography;
