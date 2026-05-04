import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

/** Centered loading spinner. */
export function Loading({ message }: { message?: string }) {
  return (
    <View style={loadingStyles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      {message ? <Text style={loadingStyles.message}>{message}</Text> : null}
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        theme.spacing[6],
  },
  message: {
    ...theme.typography.body,
    color:    theme.colors.text.muted,
    marginTop: theme.spacing[3],
  },
});

/** Inline error banner (for form submission failures). */
export function ErrorBanner({
  message,
  style,
}: { message: string; style?: ViewStyle }) {
  if (!message) return null;
  return (
    <View style={[bannerStyles.container, style]} accessibilityRole="alert">
      <Ionicons
        name="warning-outline"
        size={20}
        color={theme.colors.feedback.errorText}
        style={bannerStyles.icon}
      />
      <Text style={bannerStyles.text}>{message}</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  theme.colors.feedback.errorSubtle,
    padding:          theme.spacing[3],
    borderRadius:     theme.radius.md,
    marginBottom:     theme.spacing[4],
  },
  icon: {
    marginRight: theme.spacing[2],
  },
  text: {
    ...theme.typography.bodySmall,
    color: theme.colors.feedback.errorText,
    flex:  1,
  },
});

/** Pill / chip / badge. */
export function Badge({
  label,
  variant = 'default',
}: { label: string; variant?: 'default' | 'success' | 'warning' | 'info' }) {
  const variantStyle = badgeVariants[variant];
  return (
    <View style={[badgeStyles.base, variantStyle.bg]}>
      <Text style={[badgeStyles.text, variantStyle.text]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical:   theme.spacing[1],
    borderRadius:      theme.radius.full,
    alignSelf:         'flex-start',
  },
  text: {
    ...theme.typography.caption,
    fontFamily: theme.typography.bodyLarge.fontFamily,
  },
});

const badgeVariants = {
  default: { bg: { backgroundColor: theme.colors.background.tertiary }, text: { color: theme.colors.text.secondary } },
  success: { bg: { backgroundColor: theme.colors.feedback.successSubtle }, text: { color: theme.colors.feedback.successText } },
  warning: { bg: { backgroundColor: theme.colors.feedback.warningSubtle }, text: { color: theme.colors.text.primary } },
  info:    { bg: { backgroundColor: theme.colors.feedback.infoSubtle }, text: { color: theme.colors.brand.secondaryHover } },
} as const;
