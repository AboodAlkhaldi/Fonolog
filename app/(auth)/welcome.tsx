import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Screen, Button } from '@/components';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function WelcomeScreen() {
  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🕵️‍♀️</Text>
        <Text style={styles.title}>{t('auth.welcome.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcome.subtitle')}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('auth.welcome.signUp')}
          variant="cta"
          size="lg"
          fullWidth
          onPress={() => router.push('/(auth)/register')}
        />
        <Button
          label={t('auth.welcome.signIn')}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => router.push('/(auth)/login')}
          style={styles.spacedButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[10],
  },
  hero: {
    alignItems:     'center',
    justifyContent: 'center',
    flex: 1,
  },
  emoji: {
    fontSize:    96,
    marginBottom: theme.spacing[6],
  },
  title: {
    ...theme.typography.h1,
    color:     theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color:     theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing[6],
  },
  actions: {
    paddingTop: theme.spacing[6],
  },
  spacedButton: {
    marginTop: theme.spacing[3],
  },
});
