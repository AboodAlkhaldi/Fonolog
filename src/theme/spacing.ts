/**
 * Spacing — 8-point grid.
 * Touch targets: minimum 48dp height for any tappable area (Material) /
 * 44dp on iOS — we use 48 as the universal floor.
 */
export const spacing = {
  '0':   0,
  '0.5': 2,
  '1':   4,
  '2':   8,
  '3':   12,
  '4':   16,
  '5':   20,
  '6':   24,
  '7':   28,
  '8':   32,
  '10':  40,
  '12':  48,   // minimum touch target
  '14':  56,
  '16':  64,
  '20':  80,
  '24':  96,
  '32':  128,
} as const;

export type Spacing = typeof spacing;

/** Touch target floor — use this constant in components. */
export const MIN_TOUCH_TARGET = 48;

/** Border radii — kid-friendly = generous rounding. */
export const radius = {
  none: 0,
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
  '2xl': 32,
  full:  999,
} as const;

/** Shadows — soft, low-contrast. */
import type { ViewStyle } from 'react-native';

export const shadow: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', ViewStyle> = {
  none: {},
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius:  2,
    elevation:     1,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius:  6,
    elevation:     3,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius:  12,
    elevation:     6,
  },
  xl: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius:  24,
    elevation:     10,
  },
};

/** Standard animation durations (ms). */
export const duration = {
  fast:    150,
  normal:  250,
  slow:    400,
  celebration: 800,  // big success animations
} as const;
