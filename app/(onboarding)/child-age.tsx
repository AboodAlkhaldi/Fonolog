import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';

import { Screen, Button } from '@/components';
import { useOnboarding } from '@/store/onboarding';
import { theme }         from '@/theme';
import { t }             from '@/i18n';

const AGES = Array.from({ length: 9 }, (_, i) => i + 5);  // 5..13

export default function ChildAgeScreen() {
  const age    = useOnboarding((s) => s.age);
  const setAge = useOnboarding((s) => s.setAge);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.stepLabel}>1 / 3</Text>
        <Text style={styles.title}>{t('onboarding.childAge.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.childAge.subtitle')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {AGES.map((a) => {
          const selected = a === age;
          return (
            <Pressable
              key={a}
              onPress={() => setAge(a)}
              style={[styles.tile, selected && styles.tileSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t('onboarding.childAge.yearsOld', { age: a })}
            >
              <Text style={[styles.tileNumber, selected && styles.tileNumberSelected]}>
                {a}
              </Text>
              <Text style={[styles.tileUnit, selected && styles.tileUnitSelected]}>yaş</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Button
        label={t('app.continue')}
        variant="cta"
        size="lg"
        fullWidth
        disabled={age === null}
        onPress={() => router.push('/(onboarding)/child-avatar')}
        style={styles.cta}
      />
    </Screen>
  );
}

const TILE_SIZE = 72;

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing[5],
  },
  stepLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[1],
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[1],
  },
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    justifyContent:'flex-start',
    gap:           theme.spacing[3],
    paddingVertical: theme.spacing[2],
    paddingBottom:   theme.spacing[6],
  },
  tile: {
    width:  TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border.subtle,
    alignItems:     'center',
    justifyContent: 'center',
  },
  tileSelected: {
    backgroundColor: theme.colors.brand.primary,
    borderColor:     theme.colors.brand.primaryHover,
    ...theme.shadow.sm,
  },
  tileNumber: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  tileNumberSelected: {
    color: theme.colors.text.primary,
  },
  tileUnit: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  tileUnitSelected: {
    color: theme.colors.text.primary,
  },
  cta: {
    marginTop: theme.spacing[2],
  },
});
