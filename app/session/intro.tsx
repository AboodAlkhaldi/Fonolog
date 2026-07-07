import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components';
import { getModule } from '@/domain';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function SessionIntroScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId?: string }>();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  const moduleDef = moduleId ? getModule(moduleId) : null;
  const title = moduleDef?.title ?? t('session.loading');
  const description = moduleDef?.description ?? t('learn.subtitle');
  const icon = moduleDef?.icon ?? '🎮';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (!moduleId) {
        router.back();
        return;
      }
      router.replace(`/session/${moduleId}` as any);
    }, 3000);

    return () => clearTimeout(timer);
  }, [moduleId, opacity, scale]);

  if (!moduleId) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.title}>{t('session.error')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={styles.outer}>
      <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>Hazırlan</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{description}</Text>
        </View>
        <View style={styles.footer}>
          <Ionicons name="time-outline" size={18} color={theme.colors.text.muted} />
          <Text style={styles.footerText}>3 sn sonra başlıyor</Text>
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[4],
    ...theme.shadow.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 88,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary + '18',
  },
  icon: { fontSize: 44 },
  copy: { alignItems: 'center' },
  kicker: { ...theme.typography.caption, color: theme.colors.brand.primary, marginBottom: 4 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, textAlign: 'center' },
  subtitle: { ...theme.typography.bodyLarge, color: theme.colors.text.secondary, textAlign: 'center', marginTop: theme.spacing[2] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing[2] },
  footerText: { ...theme.typography.bodySmall, color: theme.colors.text.muted },
});