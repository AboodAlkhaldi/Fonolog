import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Screen, Button, Badge } from '@/components';
import { CharacterRenderer } from '@/components/character/CharacterRenderer';
import { NotificationBell } from '@/components/common/NotificationBell';
import { useAuth } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { getAccessTier, trialDaysRemaining } from '@/lib/access-tier';
import {
  loadDayProgress,
  effectiveDay,
  getTodayGames,
  nextPendingGame,
  type DayProgress,
} from '@/lib/day-progress';
import { withPreviewPlaceholders } from '@/lib/preview-profile';
import { theme } from '@/theme';
import { t } from '@/i18n';

interface CharStats {
  total_xp: number;
  level: number;
  current_streak: number;
  base_character_id: string | null;
}

export default function HomeTab() {
  const realProfile   = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const profile       = withPreviewPlaceholders(realProfile, impersonating);
  const [stats, setStats] = useState<CharStats | null>(null);
  const [baseChar, setBaseChar] = useState<any>(null);
  const [dayProgress, setDayProgress] = useState<DayProgress | null>(null);

  useEffect(() => {
    // Skip live character fetch when impersonating — the preview uses placeholder stats.
    if (!realProfile || impersonating) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('student_character')
        .select('total_xp, level, current_streak, base_character_id')
        .eq('student_id', realProfile.id)
        .maybeSingle();
      if (alive && data) {
        setStats(data as any);
        if (data.base_character_id) {
          const { data: bc } = await supabase
            .from('characters_base').select('*').eq('id', data.base_character_id).maybeSingle();
          setBaseChar(bc);
        }
      }
      const progress = await loadDayProgress(realProfile.id);
      if (alive) setDayProgress(progress);
    })();
    return () => { alive = false; };
  }, [realProfile?.id, impersonating]);

  if (!profile) return null;

  const tier = getAccessTier(profile);
  const trialDays = trialDaysRemaining(profile);
  const childName = profile.full_name?.split(' ')[0] ?? '';
  const xp    = stats?.total_xp ?? 0;

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <NotificationBell />
      </View>

      {tier === 'trial' && trialDays !== null ? (
        <View style={styles.trialBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trialTitle}>
              {trialDays === 0
                ? t('home.trialEndingToday')
                : t('home.trialDaysLeft', { days: trialDays })}
            </Text>
          </View>
          <Button label={t('home.upgradeBtn')} variant="primary" size="md" onPress={() => router.push('/paywall')} />
        </View>
      ) : tier === 'free' ? (
        <View style={styles.trialBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trialTitle}>{t('home.freePlan')}</Text>
            <Text style={styles.trialSubtitle}>{t('home.limitedAccess')}</Text>
          </View>
          <Button label={t('home.upgradeBtn')} variant="primary" size="md" onPress={() => router.push('/paywall')} />
        </View>
      ) : null}

      <View style={styles.greetingRow}>
        <CharacterRenderer
          base={baseChar ? { id: baseChar.id, asset_url: baseChar.asset_url, asset_type: baseChar.asset_type } : null}
          size={64}
          fallbackEmoji={profile.child_avatar_emoji ?? '🦁'}
        />
        <View style={{ flex: 1, marginLeft: theme.spacing[4] }}>
          <Text style={styles.greeting}>{t('home.greeting', { name: childName })}</Text>
          <View style={styles.badgeRow}>
            <Badge label={`${xp} XP`} variant="success" />
            {stats?.current_streak ? (
              <>
                <View style={{ width: 8 }} />
                <Badge label={`🔥 ${stats.current_streak}`} variant="warning" />
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* Day-of-the-week curriculum card. Replaces the legacy "today's lesson"
          card. Shows current day, progress within day, and a CTA that jumps
          to the next unfinished game (or all-unlocked text if today is done). */}
      <DayCard profile={profile} dayProgress={dayProgress} impersonating={impersonating} />

      <View style={{ height: theme.spacing[3] }} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.allGames')}</Text>
        <Text style={styles.cardSubtitle}>{t('home.allGamesSubtitle')}</Text>
        <Button
          label={t('home.goToLearn')}
          variant="secondary" size="lg" fullWidth
          onPress={() => router.push('/(tabs)/learn')}
          style={{ marginTop: theme.spacing[4] }}
        />
      </View>
    </Screen>
  );
}

function DayCard({
  profile,
  dayProgress,
  impersonating,
}: {
  profile: ReturnType<typeof withPreviewPlaceholders>;
  dayProgress: DayProgress | null;
  impersonating: 'student' | 'teacher' | null;
}) {
  if (!profile) return null;

  // Teacher/admin in preview mode: show a static placeholder — never load real student data
  if (impersonating) {
    return (
      <View style={styles.card}>
        <View style={styles.dayHeader}>
          <Text style={styles.cardTitle}>{t('day.label', { day: '—' })}</Text>
          <Badge label="— / —" variant="info" />
        </View>
        <Text style={styles.cardSubtitle}>{t('teacher.preview.dayCardPlaceholder')}</Text>
        <Button
          label={t('learn.title')}
          variant="cta" size="lg" fullWidth
          onPress={() => router.push('/(tabs)/learn')}
          style={{ marginTop: theme.spacing[4] }}
        />
      </View>
    );
  }

  if (!dayProgress) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.todaysLesson')}</Text>
        <Text style={styles.cardSubtitle}>{t('app.loading')}</Text>
      </View>
    );
  }

  const tier = getAccessTier(profile as any);
  const day = effectiveDay(tier, dayProgress);
  const todayGames = getTodayGames(profile as any, dayProgress);
  const done = new Set(dayProgress.completion[String(day)] ?? []);
  const doneCount = todayGames.filter((m) => done.has(m)).length;
  const total = todayGames.length;
  const allDone = total > 0 && doneCount === total;
  const pending = nextPendingGame(profile as any, dayProgress);

  return (
    <View style={styles.card}>
      <View style={styles.dayHeader}>
        <Text style={styles.cardTitle}>{t('day.label', { day })}</Text>
        <Badge label={`${doneCount}/${total}`} variant={allDone ? 'success' : 'info'} />
      </View>
      <Text style={styles.cardSubtitle}>
        {allDone ? t('day.todayAllDoneSub') : t('day.progress', { done: doneCount, total })}
      </Text>
      <Button
        label={allDone ? t('day.todayAllDone') : (doneCount === 0 ? t('day.startTodayCta') : t('day.continueCta'))}
        variant="cta" size="lg" fullWidth
        disabled={!pending && !allDone}
        onPress={() => {
          // If everything's done, route to learn so the user picks freely.
          // Otherwise jump straight to the next undone game.
          if (pending) router.push(`/session/${pending}` as any);
          else         router.push('/(tabs)/learn');
        }}
        style={{ marginTop: theme.spacing[4] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[2] },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trialBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.feedback.warningSubtle,
    padding: theme.spacing[3], borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[5], gap: theme.spacing[2],
  },
  trialTitle: { ...theme.typography.bodyLarge, fontFamily: theme.typography.bodyLarge.fontFamily, color: theme.colors.text.primary },
  trialSubtitle: { ...theme.typography.bodySmall, color: theme.colors.text.secondary },
  greetingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing[6] },
  greeting:    { ...theme.typography.h3, color: theme.colors.text.primary },
  badgeRow: { flexDirection: 'row', marginTop: theme.spacing[2], flexWrap: 'wrap' },
  card: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[5], borderRadius: theme.radius.xl,
    ...theme.shadow.md,
  },
  cardTitle: { ...theme.typography.h3, color: theme.colors.text.primary },
  cardSubtitle: { ...theme.typography.body, color: theme.colors.text.muted, marginTop: theme.spacing[2] },
});
