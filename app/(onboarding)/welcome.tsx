import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, ErrorBanner } from '@/components';
import { useAuth }       from '@/store/auth';
import { useOnboarding } from '@/store/onboarding';
import { theme }         from '@/theme';
import { t }             from '@/i18n';

export default function OnboardingWelcomeScreen() {
  const profile     = useAuth((s) => s.profile);
  const saveChild   = useAuth((s) => s.saveChildInfo);
  const reset       = useOnboarding((s) => s.reset);
  const age         = useOnboarding((s) => s.age);
  const avatar      = useOnboarding((s) => s.avatarEmoji);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const handleStart = async () => {
    if (age === null) {
      setError(t('forms.required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await saveChild(age, avatar);
      reset();
      // useProtectedRoute redirects to (tabs).
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  const childName = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.avatarRing}>
          <Text style={styles.avatar}>{avatar}</Text>
        </View>
        <Text style={styles.title}>
          {t('onboarding.welcome.title', { name: childName })}
        </Text>
        <Text style={styles.subtitle}>{t('onboarding.welcome.subtitle')}</Text>
      </View>

      <View style={styles.list}>
        {(['item1', 'item2', 'item3'] as const).map((key) => (
          <View key={key} style={styles.row}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.feedback.success} />
            <Text style={styles.rowText}>
              {t(`onboarding.welcome.whatYouGet.${key}`)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.bottom}>
        <ErrorBanner message={error} />
        <Button
          label={t('onboarding.welcome.cta')}
          variant="cta"
          size="lg"
          fullWidth
          loading={submitting}
          onPress={handleStart}
          hapticImpact="medium"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:    theme.spacing[8],
    paddingBottom: theme.spacing[6],
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
  },
  avatarRing: {
    width: 140, height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[5],
    ...theme.shadow.md,
  },
  avatar: { fontSize: 72 },
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
    paddingHorizontal: theme.spacing[4],
  },
  list: {
    paddingVertical: theme.spacing[6],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
  },
  rowText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  bottom: {},
});
