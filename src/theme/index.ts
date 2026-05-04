/**
 * Theme barrel.
 *
 * Usage:
 *   import { theme } from '@/theme';
 *   const styles = StyleSheet.create({
 *     box: {
 *       backgroundColor: theme.colors.brand.primary,
 *       padding: theme.spacing[4],
 *       borderRadius: theme.radius.lg,
 *     },
 *   });
 */
export { colors, palette }   from './colors';
export type { Colors }       from './colors';
export {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  typography,
}                            from './typography';
export type { Typography }   from './typography';
export {
  spacing,
  radius,
  shadow,
  duration,
  MIN_TOUCH_TARGET,
}                            from './spacing';
export type { Spacing }      from './spacing';

import { colors }     from './colors';
import { typography } from './typography';
import { spacing, radius, shadow, duration } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadow,
  duration,
} as const;

export type Theme = typeof theme;
