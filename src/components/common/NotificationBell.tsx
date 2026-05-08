import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useNotifications } from '@/hooks/useNotifications';
import { theme, MIN_TOUCH_TARGET } from '@/theme';

interface Props {
  style?: ViewStyle;
  /** Tint of the bell icon. Defaults to text.primary. */
  color?: string;
}

/**
 * Notification bell icon with unread-count badge.
 * Tapping navigates to /notifications. Shows a red dot when there's any unread.
 */
export function NotificationBell({ style, color = theme.colors.text.primary }: Props) {
  const { unreadCount } = useNotifications();
  const showBadge = unreadCount > 0;
  const label = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Bildirimler${showBadge ? `, ${unreadCount} okunmamış` : ''}`}
      style={[styles.btn, style]}
    >
      <Ionicons name="notifications-outline" size={26} color={color} />
      {showBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 6, right: 4,
    minWidth: 18, height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: theme.colors.feedback.error,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: theme.typography.bodyMedium.fontFamily,
  },
});
