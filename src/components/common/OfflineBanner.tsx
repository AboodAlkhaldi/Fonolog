import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { isOnline } from '@/lib/online-status';
import { theme } from '@/theme';

const POLL_INTERVAL_MS = 15000;

/**
 * Compact banner that surfaces offline state.
 *
 * Probes connectivity every 15 s. Offline play is intentionally NOT counted
 * (no writes, no queue/replay — see session.finish), so the banner doubles as
 * a heads-up that progress played while offline won't be saved.
 *
 * Render this near the top of student-facing screens (e.g. the tabs layout).
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const up = await isOnline();
      if (alive) setOnline(up);
    };

    tick();
    timer = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  if (online) return null;

  return (
    <View style={[styles.bar, styles.offline]}>
      <Ionicons
        name="cloud-offline-outline"
        size={16}
        color={theme.colors.feedback.errorText}
      />
      <Text style={[styles.text, { color: theme.colors.feedback.errorText }]}>
        Çevrimdışısın · bu sırada oynanan oyunlar kaydedilmez
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  offline: { backgroundColor: theme.colors.feedback.errorSubtle },
  text:    { ...theme.typography.caption, fontWeight: '600' },
});
