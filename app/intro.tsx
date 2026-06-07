/**
 * Pre-login intro / brand splash screen.
 *
 * Shown once per cold-start before /(auth)/welcome. Presents the app logo with
 * the wordmark + tagline so the first thing the user sees feels intentional and
 * on-brand (it used to just stretch the raw splash.png). The system Expo splash
 * (assets/images/splash.png, same #FFF8E7 background) hands off into this, then
 * this hands off into welcome — all on the same brand background, no visible jump.
 *
 * After 2.5 s the user is auto-forwarded to welcome. Tapping anywhere skips ahead.
 *
 * Authenticated users never hit this route (app/index.tsx routes them straight
 * to their home). `introShownThisSession` prevents the intro from re-appearing
 * if the user navigates back to /(auth)/welcome.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/theme';
import { t } from '@/i18n';

export let introShownThisSession = false;

const AUTO_DISMISS_MS = 2500;
const LOGO = require('../assets/images/icon.png');

export default function Intro() {
  const fade  = useRef(new Animated.Value(0)).current;
  const rise  = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      introShownThisSession = true;
      router.replace('/(auth)/welcome');
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [fade, rise]);

  const skip = () => {
    introShownThisSession = true;
    router.replace('/(auth)/welcome');
  };

  return (
    <Pressable style={styles.root} onPress={skip} accessibilityRole="button">
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <View style={styles.logoCard}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.wordmark}>Fonolog</Text>
        <Text style={styles.tagline}>{t('auth.welcome.subtitle')}</Text>
      </Animated.View>
    </Pressable>
  );
}

const LOGO_SIZE = 156;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing[6],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
  wordmark: {
    ...theme.typography.h1,
    color: theme.colors.brand.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  tagline: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});
