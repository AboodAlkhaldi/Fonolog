/**
 * Pre-login intro screen.
 *
 * Shown once per cold-start before /(auth)/welcome. We re-use splash.png as
 * the intro image so the transition from the system Expo splash → JS-rendered
 * intro is seamless (same asset, no visible jump).
 *
 * After 2.5 s the user is auto-forwarded to welcome. Tapping anywhere on the
 * screen skips ahead immediately.
 *
 * Authenticated users never hit this route (app/index.tsx routes them
 * straight to their home). The `introShownThisSession` flag prevents the
 * intro from re-appearing if the user navigates back to /(auth)/welcome.
 */
import React, { useEffect } from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/theme';

export let introShownThisSession = false;

const AUTO_DISMISS_MS = 2500;

export default function Intro() {
  useEffect(() => {
    const timer = setTimeout(() => {
      introShownThisSession = true;
      router.replace('/(auth)/welcome');
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  const skip = () => {
    introShownThisSession = true;
    router.replace('/(auth)/welcome');
  };

  return (
    <Pressable style={styles.root} onPress={skip} accessibilityRole="button">
      <Image
        source={require('../assets/images/splash.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  image: {
    width: '80%',
    height: '60%',
  },
});
