import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button } from '@/components';
import { useOnboarding } from '@/store/onboarding';
import { theme }         from '@/theme';
import { t }             from '@/i18n';

const AVATAR_OPTIONS = [
  '🦁', '🐶', '🐱', '🐰',
  '🦊', '🐼', '🐨', '🦄',
  '🐧', '🦉', '🦋', '🐢',
  '🐠', '🦕', '🐝', '🦖',
];

export default function ChildAvatarScreen() {
  const avatar    = useOnboarding((s) => s.avatarEmoji);
  const setAvatar = useOnboarding((s) => s.setAvatar);

  const randomize = () => {
    const next = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
    if (next) setAvatar(next);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.stepLabel}>2 / 3</Text>
        <Text style={styles.title}>{t('onboarding.childAvatar.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.childAvatar.subtitle')}</Text>
      </View>

      <View style={styles.preview}>
        <View style={styles.previewCircle}>
          <Text style={styles.previewEmoji}>{avatar}</Text>
        </View>
        <Pressable onPress={randomize} style={styles.randomizeBtn} hitSlop={6}>
          <Ionicons name="shuffle" size={18} color={theme.colors.text.link} />
          <Text style={styles.randomizeLabel}>{t('onboarding.childAvatar.randomize')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {AVATAR_OPTIONS.map((emoji) => {
          const selected = emoji === avatar;
          return (
            <Pressable
              key={emoji}
              onPress={() => setAvatar(emoji)}
              style={[styles.tile, selected && styles.tileSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={emoji}
            >
              <Text style={styles.tileEmoji}>{emoji}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Button
        label={t('app.continue')}
        variant="cta"
        size="lg"
        fullWidth
        onPress={() => router.push('/(onboarding)/welcome')}
        style={styles.cta}
      />
    </Screen>
  );
}

const TILE_SIZE = 64;

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing[5] },
  stepLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[1],
  },
  title:    { ...theme.typography.h2, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  preview: {
    alignItems: 'center',
    marginBottom: theme.spacing[5],
  },
  previewCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.md,
  },
  previewEmoji: { fontSize: 64 },
  randomizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[3],
    padding: theme.spacing[2],
  },
  randomizeLabel: {
    ...theme.typography.body,
    color: theme.colors.text.link,
    fontFamily: theme.typography.bodyLarge.fontFamily,
    marginLeft: theme.spacing[1],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    paddingBottom: theme.spacing[6],
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border.subtle,
    alignItems:     'center',
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.background.tertiary,
    ...theme.shadow.sm,
  },
  tileEmoji: { fontSize: 36 },
  cta: { marginTop: theme.spacing[2] },
});
