import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, SectionList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Badge } from '@/components';
import { getModule, type ModuleDefinition } from '@/domain';
import { ALWAYS_OPEN_MODULES, DAY_CURRICULUM, DAY_COUNT, getDayForModule } from '@/domain/day-curriculum';
import { useAuth } from '@/store/auth';
import { getAccessTier } from '@/lib/access-tier';
import {
  loadDayProgress,
  effectiveDay,
  canPlayModule,
  getModuleLockReason,
  EMPTY_PROGRESS,
  todayDoneSet,
  type DayProgress,
} from '@/lib/day-progress';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

/** Returns daily curriculum modules starting from currentDay, cycling through all 7 days. Each module appears at most once. */
function orderedDailyModules(currentDay: number): ModuleDefinition[] {
  const seen   = new Set<string>();
  const result: ModuleDefinition[] = [];
  for (let i = 0; i < DAY_COUNT; i++) {
    const day = ((currentDay - 1 + i) % DAY_COUNT) + 1;
    for (const id of DAY_CURRICULUM[day]) {
      if (seen.has(id)) continue;
      const mod = getModule(id);
      if (mod) { seen.add(id); result.push(mod); }
    }
  }
  return result;
}

type Section = { key: 'alwaysOpen' | 'daily'; title: string; data: ModuleDefinition[] };

export default function LearnTab() {
  const realProfile   = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const tier          = getAccessTier(realProfile as any);
  const [dayProgress, setDayProgress] = useState<DayProgress | null>(null);

  useEffect(() => {
    if (!realProfile || impersonating) return;
    let alive = true;
    loadDayProgress(realProfile.id).then((p) => { if (alive) setDayProgress(p); });
    return () => { alive = false; };
  }, [realProfile?.id, impersonating]);

  const currentDay = dayProgress ? effectiveDay(tier, dayProgress) : 1;
  const doneSet    = dayProgress ? todayDoneSet(dayProgress, tier) : new Set<string>();

  const alwaysOpenMods = ALWAYS_OPEN_MODULES
    .map((id) => getModule(id))
    .filter(Boolean) as ModuleDefinition[];

  const sections: Section[] = [
    { key: 'alwaysOpen', title: t('learn.alwaysOpenSection'), data: alwaysOpenMods },
    { key: 'daily',      title: t('learn.dailySection'),      data: orderedDailyModules(currentDay) },
  ];

  /**
   * Teacher preview: determine playability from the teacher's own tier
   * without consulting student day-progress (which doesn't exist for teachers).
   * - admin / subscribed / trial → all modules open
   * - free → only Day 1 + always-open
   */
  const isPlayableInPreview = (m: ModuleDefinition): boolean => {
    if (ALWAYS_OPEN_MODULES.includes(m.id)) return true;
    if (tier === 'free') return getDayForModule(m.id) === 1;
    return true; // admin / subscribed / trial
  };

  const showLocked = (reason: 'plan' | 'day') => {
    // Free users (and teachers in free preview) cannot unlock by finishing —
    // they have to upgrade. Other tiers see the "finish today's games" copy.
    if (reason === 'plan') {
      showAlert(
        t('day.lockedProTitle'),
        t('day.lockedProMsg'),
        [
          { text: t('app.cancel'), style: 'cancel' },
          { text: t('day.upgradeBtn'), onPress: () => router.push('/paywall' as any) },
        ],
      );
    } else {
      showAlert(t('day.lockedTitle'), t('day.locked'), [{ text: t('app.ok'), style: 'cancel' }]);
    }
  };

  const launch = (m: ModuleDefinition) => {
    if (impersonating) {
      if (!isPlayableInPreview(m)) {
        showLocked('plan');
        return;
      }
      router.push({ pathname: '/session/intro', params: { moduleId: m.id } } as any);
      return;
    }
    if (ALWAYS_OPEN_MODULES.includes(m.id)) {
      router.push({ pathname: '/session/intro', params: { moduleId: m.id } } as any);
      return;
    }
    if (!dayProgress && tier !== 'free') return;
    const progress = dayProgress ?? EMPTY_PROGRESS;
    const lockReason = getModuleLockReason(realProfile as any, progress, m.id);
    if (lockReason) {
      showLocked(lockReason === 'plan' ? 'plan' : 'day');
      return;
    }
    router.push({ pathname: '/session/intro', params: { moduleId: m.id } } as any);
  };

  return (
    <Screen scroll={false}>
      <SectionList<ModuleDefinition, Section>
        sections={sections}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{t('learn.title')}</Text>
            <Text style={styles.subtitle}>{t('learn.subtitle')}</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.key === 'daily' && (
              <View style={styles.dayBadgeWrap}>
                <Text style={styles.dayBadgeText}>{`Gün ${currentDay}`}</Text>
              </View>
            )}
          </View>
        )}
        renderItem={({ item: m, section }) => {
          const isAlways = section.key === 'alwaysOpen';
          const playable = impersonating
            ? isPlayableInPreview(m)
            : isAlways
              ? true
              : dayProgress
                ? canPlayModule(realProfile as any, dayProgress, m.id)
                : false;
          const done     = doneSet.has(m.id);
          const locked   = !playable;
          const modDay   = getDayForModule(m.id);
          const isToday  = modDay === currentDay;

          return (
            <Pressable
              onPress={() => launch(m)}
              style={[styles.card, locked && styles.cardLocked]}
              accessibilityRole="button"
            >
              <Text style={styles.emoji}>{m.icon ?? '🎮'}</Text>
              <View style={styles.body}>
                <Text style={styles.cardTitle}>{m.title}</Text>
                {m.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{m.description}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  {done ? (
                    <Badge label={t('day.gameDone')} variant="success" />
                  ) : null}
                  {!isAlways && isToday && !done && !locked ? (
                    <Badge label={t('learn.todayBadge')} variant="info" />
                  ) : null}
                  {locked && modDay !== null ? (
                    <Badge label={`Gün ${modDay}`} variant="warning" />
                  ) : null}
                </View>
              </View>
              <Ionicons
                name={locked ? 'lock-closed' : done ? 'checkmark-circle' : 'chevron-forward'}
                size={20}
                color={done ? theme.colors.feedback.success : theme.colors.text.muted}
              />
            </Pressable>
          );
        }}
        SectionSeparatorComponent={() => <View style={{ height: theme.spacing[2] }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header:       { paddingBottom: theme.spacing[3] },
  title:        { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle:     { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  list:         { paddingBottom: theme.spacing[8] },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[2], marginTop: theme.spacing[1] },
  sectionTitle: { ...theme.typography.h4, color: theme.colors.text.primary, flex: 1 },
  dayBadgeWrap: {
    backgroundColor: theme.colors.brand.primary + '22',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: theme.radius.full ?? 999,
  },
  dayBadgeText: { ...theme.typography.caption, color: theme.colors.brand.primary, fontFamily: theme.typography.bodyMedium.fontFamily },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical:   theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
    ...theme.shadow.sm,
  },
  cardLocked:  { opacity: 0.6 },
  emoji:       { fontSize: 36, marginRight: theme.spacing[3] },
  body:        { flex: 1 },
  cardTitle:   { ...theme.typography.h4, color: theme.colors.text.primary, marginBottom: 2 },
  cardDesc:    { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginBottom: theme.spacing[2] },
  metaRow:     { flexDirection: 'row', gap: theme.spacing[2], flexWrap: 'wrap' },
});
