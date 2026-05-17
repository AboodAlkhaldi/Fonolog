import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { isOnline } from '@/lib/online-status';
import { queueSize, flushQueue } from '@/lib/offline-queue';
import { theme } from '@/theme';

const POLL_INTERVAL_MS = 15000;

/**
 * Compact banner that surfaces offline state + pending queued writes.
 *
 * Probes connectivity every 15 s. When the device comes back online and there
 * are queued writes, it flushes them transparently and updates the count.
 *
 * Render this near the top of student-facing screens (e.g. the tabs layout).
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const up = await isOnline();
      if (!alive) return;
      setOnline(up);
      const size = queueSize();
      setPending(size);
      if (up && size > 0) {
        const drained = await flushQueue();
        if (alive && drained > 0) setPending(queueSize());
      }
    };

    tick();
    timer = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  if (online && pending === 0) return null;

  const offline = !online;
  return (
    <View style={[styles.bar, offline ? styles.offline : styles.syncing]}>
      <Ionicons
        name={offline ? 'cloud-offline-outline' : 'sync-outline'}
        size={16}
        color={offline ? theme.colors.feedback.errorText : theme.colors.feedback.warningText}
      />
      <Text style={[styles.text, { color: offline ? theme.colors.feedback.errorText : theme.colors.feedback.warningText }]}>
        {offline
          ? `Çevrimdışısın${pending > 0 ? ` · ${pending} bekleyen` : ''}`
          : `${pending} kayıt senkronize ediliyor…`}
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
  syncing: { backgroundColor: theme.colors.feedback.warningSubtle },
  text:    { ...theme.typography.caption, fontWeight: '600' },
});
