import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button } from '@/components';
import { useSession } from '@/store/session';
import { useAuth }    from '@/store/auth';
import { showAlert }  from '@/store/alert';
import { getAccessTier } from '@/lib/access-tier';
import { theme } from '@/theme';
import { t }     from '@/i18n';

export default function SessionResultScreen() {
  const moduleId   = useSession((s) => s.moduleId);
  const questions  = useSession((s) => s.questions);
  const answers    = useSession((s) => s.answers);
  const startedAt  = useSession((s) => s.startedAt);
  const xpEarned   = useSession((s) => s.xpEarned);
  const finish     = useSession((s) => s.finish);
  const reset      = useSession((s) => s.reset);
  const refreshProfile = useAuth((s) => s.refreshProfile);

  const correctCount = answers.filter((a) => a.wasCorrect).length;
  const total        = questions.length;
  const isPerfect    = total > 0 && correctCount === total;
  const isGood       = total > 0 && correctCount / total >= 0.7;
  const durationS    = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

  const [persisted, setPersisted] = useState(false);

  // Persist the session ONCE on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      await finish();
      await refreshProfile();
      if (!alive) return;
      setPersisted(true);

      // Day-completion celebration. finish() sets extra.dayJustCompleted when
      // this session was the one that closed today's curriculum.
      const justFinished = useSession.getState().extra.dayJustCompleted;
      if (justFinished) {
        const profile = useAuth.getState().profile;
        const tier    = getAccessTier(profile as any);
        const msg = tier === 'free'  ? t('day.completeMsgFree')
                  : tier === 'trial' ? t('day.completeMsgTrial')
                  :                    t('day.completeMsgPro');
        showAlert(t('day.completeTitle'), msg, [{ text: t('day.closeBtn') }]);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title  = isPerfect ? t('results.perfect')
              : isGood    ? t('results.great')
              :              t('results.keepGoing');

  const playAgain = () => {
    if (!moduleId) {
      router.replace('/(tabs)/learn');
      return;
    }
    const mid = moduleId;
    reset();
    router.replace(`/session/${mid}`);
  };

  return (
    <Screen scroll={false} contentStyle={styles.outer}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>{isPerfect ? '🌟' : isGood ? '🎉' : '💪'}</Text>
        <Text style={styles.title}>{t('results.title')}</Text>
        <Text style={styles.subtitle}>{title}</Text>
      </View>

      {/* Score card */}
      <View style={styles.statRow}>
        <Stat
          icon="checkmark-circle-outline"
          label={t('results.score')}
          value={`${correctCount} / ${total}`}
        />
        <Stat
          icon="flash-outline"
          label="XP"
          value={`+${xpEarned}`}
          highlight
        />
        <Stat
          icon="time-outline"
          label={t('results.time')}
          value={t('results.duration', { seconds: durationS })}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={t('results.playAgain')}
          variant="cta"
          size="lg"
          fullWidth
          onPress={playAgain}
          loading={!persisted}
          style={{ marginBottom: theme.spacing[3] }}
        />
        <Button
          label={t('results.backToLearn')}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => { reset(); router.replace('/(tabs)/learn'); }}
        />
      </View>
    </Screen>
  );
}

function Stat({
  icon, label, value, highlight,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[statStyles.container, highlight && statStyles.highlight]}>
      <Ionicons
        name={icon}
        size={26}
        color={highlight ? theme.colors.text.primary : theme.colors.text.muted}
      />
      <Text style={[statStyles.value, highlight && statStyles.highlightText]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: theme.spacing[10],
    paddingBottom: theme.spacing[6],
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emoji: { fontSize: 96, marginBottom: theme.spacing[4] },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing[2],
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[6],
    gap: theme.spacing[3],
  },
  actions: { paddingTop: theme.spacing[2] },
});

const statStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  highlight: {
    backgroundColor: theme.colors.brand.primary,
  },
  value: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[1],
  },
  highlightText: {
    color: theme.colors.text.primary,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
});
