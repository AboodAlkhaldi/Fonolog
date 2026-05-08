import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading } from '@/components';
import { useNotifications } from '@/hooks/useNotifications';
import { theme } from '@/theme';
import type { NotificationRow } from '@/lib/database.types';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  assignment_new:        'clipboard',
  assignment_completed:  'checkmark-done',
  assignment_due_soon:   'alarm',
  milestone_due:         'flag',
  milestone_completed:   'trophy',
  streak_reminder:       'flame',
  xp_milestone:          'star',
  subscription_expiring: 'warning',
  subscription_expired:  'lock-closed',
  teacher_note:          'document-text',
  teacher_message:       'chatbubble',
};

const TYPE_COLOR: Record<string, string> = {
  assignment_new:        theme.colors.brand.primary,
  assignment_completed:  theme.colors.feedback.success,
  streak_reminder:       theme.colors.feedback.warningText,
  subscription_expiring: theme.colors.feedback.warningText,
  subscription_expired:  theme.colors.feedback.errorText,
  teacher_message:       theme.colors.brand.secondaryHover,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1)   return 'Şimdi';
  if (m < 60)  return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} saat önce`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} gün önce`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const { notifications, loading, reload, markRead, markAllRead, unreadCount } = useNotifications();

  const handlePress = async (n: NotificationRow) => {
    if (!n.read_at) await markRead(n.id);
    const payload = (n.payload as any) ?? {};
    if (n.type === 'assignment_new' && payload.assignment_id) {
      router.push(`/learn/assignment/${payload.assignment_id}`);
      return;
    }
    if (payload.report_url) {
      Linking.openURL(payload.report_url).catch(() => {});
      return;
    }
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Bildirimler</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAll}>Tümünü oku</Text>
          </Pressable>
        ) : <View style={{ width: 60 }} />}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Bildirim yok</Text>
            <Text style={styles.emptyText}>
              Yeni ödevler, mesajlar ve hatırlatmalar burada görünecek.
            </Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: theme.spacing[4] }}
        renderItem={({ item }) => {
          const unread = !item.read_at;
          const icon = TYPE_ICON[item.type] ?? 'notifications';
          const tint = TYPE_COLOR[item.type] ?? theme.colors.text.primary;
          return (
            <Pressable
              style={[styles.row, unread && styles.rowUnread]}
              onPress={() => handlePress(item)}
            >
              <View style={[styles.iconWrap, { backgroundColor: tint + '20' }]}>
                <Ionicons name={icon} size={22} color={tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]}>
                  {item.title}
                </Text>
                <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.rowTime}>{formatTime(item.created_at)}</Text>
              </View>
              {unread ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[3], gap: theme.spacing[2] },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, flex: 1 },
  markAll: { ...theme.typography.bodyMedium, color: theme.colors.brand.primary },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[3],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[2],
  },
  rowUnread: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1, borderColor: theme.colors.brand.primary + '40',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { ...theme.typography.body, color: theme.colors.text.primary },
  rowTitleUnread: { fontFamily: theme.typography.bodyMedium.fontFamily },
  rowBody: { ...theme.typography.bodySmall, color: theme.colors.text.secondary, marginTop: 2 },
  rowTime: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 4 },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: theme.colors.brand.primary,
    marginTop: 6,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing[6] },
  emptyEmoji: { fontSize: 64, marginBottom: theme.spacing[3] },
  emptyTitle: { ...theme.typography.h3, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  emptyText:  { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center' },
});
