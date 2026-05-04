/**
 * Root layout — Stage 11 final.
 *
 * Boot sequence:
 *   1. Load fonts
 *   2. Initialize auth (read stored session)
 *   3. Once authenticated: init audio mode, init RevenueCat, register push token
 *   4. useProtectedRoute redirects based on auth state
 */
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, SplashScreen, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  useFonts,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
} from '@expo-google-fonts/baloo-2';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';

import { useAuth, type AuthStatus } from '@/store/auth';
import { initAudio }                from '@/audio/audio.service';
import { initPurchases }            from '@/lib/purchases';
import { registerForPushNotifications } from '@/lib/notifications';
import { theme } from '@/theme';

// Keep splash up while we load.
SplashScreen.preventAutoHideAsync().catch(() => { /* already hidden */ });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

/**
 * Drives navigation in response to auth state changes.
 * Handles all non-tab routes (session, teacher, paywall, learn) as "in-app"
 * so authenticated users aren't bounced back to the tabs root.
 */
function useProtectedRoute(status: AuthStatus) {
  const segments = useSegments();

  useEffect(() => {
    const seg               = segments[0] as string;
    const inAuthGroup       = seg === '(auth)';
    const inOnboardingGroup = seg === '(onboarding)';
    const inTabsGroup       = seg === '(tabs)';
    const inTeacher         = seg === 'teacher';
    const inSession         = seg === 'session';
    const inPaywall         = seg === 'paywall';
    const inLearn           = seg === 'learn';
    const inApp             = inTabsGroup || inTeacher || inSession || inPaywall || inLearn;

    switch (status) {
      case 'unauthenticated':
      case 'awaitingEmailVerify':
        if (!inAuthGroup) router.replace('/(auth)/welcome');
        break;
      case 'needsOnboarding':
        if (!inOnboardingGroup) router.replace('/(onboarding)/child-age');
        break;
      case 'authenticated':
        if (!inApp) router.replace('/(tabs)');
        break;
      // 'loading' — do nothing; splash still up
    }
  }, [status, segments]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    SpaceMono_400Regular,
  });

  

  const status     = useAuth((s) => s.status);
  const user       = useAuth((s) => s.user);
  const initialize = useAuth((s) => s.initialize);

  // Auth + audio init on mount (audio doesn't need auth)
  useEffect(() => {
    initialize();
    initAudio();
  }, [initialize]);

  // After authentication: init RevenueCat + register push token
  useEffect(() => {
    if (status === 'authenticated' && user?.id) {
      initPurchases(user.id).catch((e) => console.warn('[boot] purchases', e));
      registerForPushNotifications().catch((e) => console.warn('[boot] push', e));
    }
  }, [status, user?.id]);

  useProtectedRoute(status);

  useEffect(() => {
    if (fontsLoaded && status !== 'loading') {
      SplashScreen.hideAsync().catch(() => { /* already hidden */ });
    }
  }, [fontsLoaded, status]);

  if (!fontsLoaded || status === 'loading') {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" backgroundColor={theme.colors.background.primary} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background.primary },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)"       options={{ animation: 'fade' }} />
            <Stack.Screen name="(onboarding)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)"       options={{ animation: 'fade' }} />
            <Stack.Screen name="session"      options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="learn"        />
            <Stack.Screen name="teacher"      />
            <Stack.Screen name="paywall"      options={{ presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
