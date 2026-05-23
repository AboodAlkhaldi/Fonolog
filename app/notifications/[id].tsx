/**
 * Notification detail subpage.
 *
 * Opens when the user taps a row in the inbox. Shows the full title + body
 * and a context-appropriate action button per notification type.
 *
 * Mark-as-read happens here on mount — only when the user explicitly opens
 * the notification — so the inbox stays accurate while they skim.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Loading } from '@/components';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';
import { t } from '@/i18n';
import type { NotificationRow } from '@/lib/database.types';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  homework_new:             'clipboard',
  homework_completed:       'checkmark-done',
  homework_overdue:         'alarm',
  homework_due_soon:        'alarm',
  milestone_due:            'flag',
  milestone_completed:      'trophy',
  streak_reminder:          'flame',
  xp_milestone:             'star',
  subscription_started:     'rocket',
  subscription_renewed:     'refresh',
  subscription_expiring:    'warning',
  subscription_expired:     'lock-closed',
  subscription_cancelled:   'close-circle',
  new_user_signup:          'person-add',
  admin_subscription_event: 'card',
  admin_account_removed:    'trash',
  teacher_note:             'document-text',
  teacher_message:          'chatbubble',
};

interface Action {
  label: string;
  /** Where to send the user, as a route string. */
  href: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

function actionFor(notif: NotificationRow, role: string | undefined): Action | null {
  const payload = (notif.payload as any) ?? {};
  const homeworkId = payload.homework_id ?? payload.assignment_id;
  const studentId  = payload.student_id;
  const userId     = payload.subscriber_id ?? payload.user_id;

  switch (notif.type) {
    case 'homework_new':
    case 'homework_due_soon':
    case 'homework_overdue':
      // Student → open the special-words homework game.
      if (homeworkId && role === 'student') {
        return { label: t('notifDetail.openHomework'), href: `/learn/assignment/${homeworkId}`, icon: 'play-circle' };
      }
      // Teacher view of an overdue homework → see the student.
      if (studentId && role === 'teacher') {
        return { label: t('notifDetail.viewStudent'), href: `/teacher/student/${studentId}`, icon: 'person-circle' };
      }
      return null;

    case 'homework_completed':
      if (studentId && role === 'teacher') {
        return { label: t('notifDetail.viewStudent'), href: `/teacher/student/${studentId}`, icon: 'person-circle' };
      }
      return null;

    case 'subscription_expiring':
    case 'subscription_expired':
    case 'subscription_cancelled':
      return { label: t('notifDetail.renewNow'), href: '/paywall', icon: 'card' };

    case 'subscription_started':
    case 'subscription_renewed':
      return { label: t('notifDetail.viewPlan'), href: '/settings/plan-details', icon: 'document-text' };

    case 'streak_reminder':
    case 'xp_milestone':
    case 'milestone_due':
    case 'milestone_completed':
      return { label: t('notifDetail.openHome'), href: '/(tabs)', icon: 'home' };

    case 'new_user_signup':
      if (userId && role === 'admin') {
        return { label: t('notifDetail.viewUser'), href: `/admin/user/${userId}`, icon: 'person' };
      }
      return null;

    case 'admin_subscription_event':
      if (userId && role === 'admin') {
        return { label: t('notifDetail.viewUser'), href: `/admin/user/${userId}`, icon: 'person' };
      }
      return null;

    default:
      return null;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function NotificationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notifications, markRead, loading } = useNotifications();
  const role = useAuth((s) => s.profile?.role);

  const notif = useMemo<NotificationRow | null>(() => {
    return notifications.find((n) => n.id === id) ?? null;
  }, [notifications, id]);

  const [markedRead, setMarkedRead] = useState(false);

  // Mark-as-read on open — only once. The user explicitly tapped this row;
  // no need to wait for an action button press.
  useEffect(() => {
    if (!notif || markedRead) return;
    if (notif.read_at) { setMarkedRead(true); return; }
    void markRead(notif.id);
    setMarkedRead(true);
  }, [notif, markedRead, markRead]);

  if (loading) return <Screen><Loading /></Screen>;
  if (!notif) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>{t('notifDetail.notFoundTitle')}</Text>
        <Text style={styles.body}>{t('notifDetail.notFoundBody')}</Text>
      </Screen>
    );
  }

  const action = actionFor(notif, role);
  const icon   = TYPE_ICON[notif.type] ?? 'notifications';
  const tint   = theme.colors.brand.primary;

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[6] }}>
        <View style={styles.iconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: tint + '20' }]}>
            <Ionicons name={icon} size={36} color={tint} />
          </View>
        </View>

        <Text style={styles.title}>{notif.title}</Text>
        <Text style={styles.timestamp}>{formatDateTime(notif.created_at)}</Text>

        <View style={styles.card}>
          <Text style={styles.body}>{notif.body}</Text>
        </View>

        {action ? (
          <Button
            label={action.label}
            variant="cta"
            size="lg"
            fullWidth
            onPress={() => router.push(action.href as any)}
            style={{ marginTop: theme.spacing[4] }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back:      { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  iconWrap:  { alignItems: 'center', marginTop: theme.spacing[3], marginBottom: theme.spacing[3] },
  iconCircle:{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  title:     { ...theme.typography.h2, color: theme.colors.text.primary, textAlign: 'center' },
  timestamp: { ...theme.typography.caption, color: theme.colors.text.muted, textAlign: 'center', marginTop: 4, marginBottom: theme.spacing[4] },
  card:      {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[4],
    borderRadius: theme.radius.lg,
  },
  body:      { ...theme.typography.body, color: theme.colors.text.primary, lineHeight: 22 },
});
