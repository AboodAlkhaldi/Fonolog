import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  PressableProps,
  AccessibilityRole,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme, MIN_TOUCH_TARGET } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'cta';
export type ButtonSize    = 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label:        string;
  onPress:      () => void;
  variant?:     ButtonVariant;
  size?:        ButtonSize;
  loading?:     boolean;
  disabled?:    boolean;
  fullWidth?:   boolean;
  style?:       ViewStyle;
  hapticImpact?:'light' | 'medium' | 'heavy' | 'none';
  accessibilityRole?: AccessibilityRole;
}

/** Reusable button. Defaults to primary, medium size, light haptic. */
export function Button({
  label,
  onPress,
  variant      = 'primary',
  size         = 'md',
  loading      = false,
  disabled     = false,
  fullWidth    = false,
  style,
  hapticImpact = 'light',
  accessibilityRole = 'button',
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    if (hapticImpact !== 'none') {
      const map = {
        light:  Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy:  Haptics.ImpactFeedbackStyle.Heavy,
      } as const;
      Haptics.impactAsync(map[hapticImpact]).catch(() => { /* ignore on web */ });
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        baseStyles.base,
        sizeStyles[size],
        variantStyles[variant].container,
        fullWidth && baseStyles.fullWidth,
        pressed && !isDisabled && variantStyles[variant].pressed,
        isDisabled && baseStyles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color} />
      ) : (
        <Text style={[baseStyles.text, sizeStyles[size === 'lg' ? 'textLg' : 'textMd'], variantStyles[variant].text]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  base: {
    minHeight:      MIN_TOUCH_TARGET,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[6],
    borderRadius:   theme.radius.lg,
    ...theme.shadow.sm,
  },
  text: {
    ...theme.typography.button,
    textAlign: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
});

const sizeStyles = StyleSheet.create({
  md: {
    paddingVertical: theme.spacing[3],
    minHeight:       MIN_TOUCH_TARGET,
  },
  lg: {
    paddingVertical:   theme.spacing[4],
    paddingHorizontal: theme.spacing[8],
    minHeight:         60,
  },
  textMd: {
    fontSize: theme.typography.button.fontSize,
  },
  textLg: {
    fontSize: theme.typography.buttonLarge.fontSize,
  },
});

const variantStyles = {
  primary: {
    container: { backgroundColor: theme.colors.brand.primary },
    pressed:   { backgroundColor: theme.colors.brand.primaryPressed },
    text:      { color: theme.colors.text.primary },
  },
  secondary: {
    container: {
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 2,
      borderColor: theme.colors.border.default,
    },
    pressed:   { backgroundColor: theme.colors.background.tertiary },
    text:      { color: theme.colors.text.primary },
  },
  ghost: {
    container: { backgroundColor: theme.colors.transparent, shadowOpacity: 0, elevation: 0 },
    pressed:   { backgroundColor: theme.colors.background.tertiary },
    text:      { color: theme.colors.text.link },
  },
  cta: {
    container: { backgroundColor: theme.colors.action.cta },
    pressed:   { backgroundColor: theme.colors.action.ctaHover },
    text:      { color: theme.colors.text.inverse },
  },
} as const;
