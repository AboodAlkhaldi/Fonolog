import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Screen, Button } from '@/components';
import { theme } from '@/theme';
import { t } from '@/i18n';

// Logo / hero illustration. Swap this require for a dedicated welcome
// illustration (drop a PNG in assets/images and point here) if a richer hero
// is available — the layout already sizes around it.
const LOGO = require('../../assets/images/icon.png');

export default function WelcomeScreen() {
  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoCard}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>
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

const LOGO_SIZE = 168;

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
  logoCard: {
    width:  LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[6],
    ...theme.shadow.md,
  },
  logo: {
    width:  LOGO_SIZE - theme.spacing[5],
    height: LOGO_SIZE - theme.spacing[5],
    borderRadius: theme.radius.lg,
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
