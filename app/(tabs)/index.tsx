import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { differenceInCalendarDays } from 'date-fns';

import { Screen, Button, Badge } from '@/components';
import { useAuth } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';
import { t }     from '@/i18n';

interface CharacterStats {
  total_xp: number;
  level:    number;
}

export default function HomeTab() {
  const profile = useAuth((s) => s.profile);
  const [stats, setStats] = useState<CharacterStats | null>(null);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('student_character')
        .select('total_xp, level')
        .eq('student_id', profile.id)
        .maybeSingle();
      if (alive && data) setStats({ total_xp: data.total_xp, level: data.level });
    })();
    return () => { alive = false; };
  }, [profile?.id]);

  if (!profile) return <Screen scroll={false}><Text>{t('app.loading')}</Text></Screen>;

  const childName = profile.full_name?.split(' ')[0] ?? '';
  const expires   = profile.subscription_expires ? new Date(profile.subscription_expires) : null;
  const trialDays = expires ? differenceInCalendarDays(expires, new Date()) : null;

  const xp    = stats?.total_xp ?? 0;
  const level = stats?.level    ?? 1;

  return (
    <Screen>
      {/* Trial banner */}
      {profile.subscription_status === 'trial' && trialDays !== null && trialDays >= 0 ? (
        <View style={styles.trialBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trialTitle}>
              {trialDays === 0
                ? t('home.trial.bannerLastDay')
                : t('home.trial.banner', { days: trialDays })}
            </Text>
          </View>
          <Button
            label={t('home.trial.cta')}
            variant="primary"
            size="md"
            onPress={() => { /* Stage 9 paywall */ }}
          />
        </View>
      ) : null}

      {/* Greeting */}
      <View style={styles.greetingRow}>
        <View style={styles.avatarBubble}>
          <Text style={styles.avatarEmoji}>{profile.child_avatar_emoji ?? '🦁'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {t('home.welcomeBack', { name: childName })}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={t('home.level', { level })} variant="info" />
            <View style={{ width: 8 }} />
            <Badge label={t('home.xp', { count: xp })} variant="success" />
          </View>
        </View>
      </View>

      {/* Today's lesson — launches "tani" with all categories (warm-up) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.todaysLesson')}</Text>
        <Text style={styles.cardSubtitle}>
          Hazır mısın? Hızlı bir tanıma turu başlayalım.
        </Text>
        <Button
          label={t('home.keepGoing')}
          variant="cta"
          size="lg"
          fullWidth
          onPress={() => router.push('/session/tani')}
          style={{ marginTop: theme.spacing[4] }}
        />
      </View>

      <View style={{ height: theme.spacing[3] }} />

      {/* All categories button */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tüm kategoriler</Text>
        <Text style={styles.cardSubtitle}>
          Bir konu seçip kelimeleri keşfet.
        </Text>
        <Button
          label="Öğren'e git"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => router.push('/(tabs)/learn')}
          style={{ marginTop: theme.spacing[4] }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  trialBanner: {
    flexDirection: 'row',
    alignItems:    'center',
    backgroundColor: theme.colors.feedback.warningSubtle,
    padding:      theme.spacing[3],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[5],
  },
  trialTitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bodyLarge.fontFamily,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  theme.spacing[6],
  },
  avatarBubble: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[4],
    ...theme.shadow.sm,
  },
  avatarEmoji: { fontSize: 36 },
  greeting:    { ...theme.typography.h3, color: theme.colors.text.primary },
  badgeRow: {
    flexDirection: 'row',
    marginTop: theme.spacing[2],
  },
  card: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[5],
    borderRadius: theme.radius.xl,
    ...theme.shadow.md,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  cardSubtitle: {
    ...theme.typography.body,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[2],
  },
});
