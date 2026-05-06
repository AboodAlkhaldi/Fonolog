/**
 * Root layout — Stage 12+ final.
 *
 * Routes by status:
 *   loading              → null
 *   unauthenticated      → /(auth)/welcome
 *   awaitingEmailVerify  → /(auth)/verify-email
 *   needsRoleChoice      → /(auth)/role-choice
 *   needsTeacherSignup   → /(auth)/teacher-signup
 *   needsOnboarding      → /(onboarding)/child-age
 *   authenticated:
 *     student → /(tabs)
 *     teacher → /teacher  (no nested tabs; standalone)
 *     admin   → /admin    (no nested tabs; standalone)
 *
 * Admin impersonation:
 *   When admin enters preview mode, useProtectedRoute lets them roam.
 *   AdminPreviewBanner overlays at the top while impersonating.
 */
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, SplashScreen, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query';

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
import { initAudio } from '@/audio/audio.service';
import { initPurchases } from '@/lib/purchases';
import { registerForPushNotifications } from '@/lib/notifications';
import { AlertModal } from '@/components/common/AlertModal';
import { theme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});


function useProtectedRoute(status: AuthStatus, role: string | null, impersonating: 'student' | 'teacher' | null) {
  const segments = useSegments();

  useEffect(() => {
    const root = segments[0];

    switch (status) {
      case 'unauthenticated':
        if (root !== '(auth)') router.replace('/(auth)/welcome');
        return;

      case 'awaitingEmailVerify':
        if (segments[1] !== 'verify-email') router.replace('/(auth)/verify-email');
        return;

      case 'needsRoleChoice':
        if (segments[1] !== 'role-choice') router.replace('/(auth)/role-choice');
        return;

      case 'needsTeacherSignup':
        if (segments[1] !== 'teacher-signup') router.replace('/(auth)/teacher-signup');
        return;

      case 'needsOnboarding':
        if (root !== '(onboarding)') router.replace('/(onboarding)/child-age');
        return;

      case 'authenticated':
        if (role === 'admin' && !impersonating) {
          // Pure admin mode — keep inside admin
          if (root !== 'admin' && root !== 'paywall') router.replace('/admin');
        } else if (role === 'teacher' && !impersonating) {
          // Pure teacher mode
          if (root !== 'teacher' && root !== 'paywall') router.replace('/teacher');
        } else if (impersonating === 'teacher') {
          // Admin previewing teacher view — allow admin root briefly during transition
          const validRoots = ['teacher', 'admin', 'paywall'];
          if (!validRoots.includes(root ?? '')) router.replace('/teacher');
        } else {
          // Student OR admin/teacher impersonating student
          const validRoots = ['(tabs)', 'session', 'learn', 'paywall', 'admin'];
          if (!validRoots.includes(root ?? '')) router.replace('/(tabs)');
        }
        return;

      default: return;
    }
  }, [status, segments, role, impersonating]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_600SemiBold, Baloo2_700Bold,
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold,
    SpaceMono_400Regular,
  });

  const status        = useAuth((s) => s.status);
  const user          = useAuth((s) => s.user);
  const role          = useAuth((s) => s.profile?.role ?? null);
  const impersonating = useAuth((s) => s.impersonating);
  const initialize    = useAuth((s) => s.initialize);

  useEffect(() => {
    initialize();
    initAudio();
  }, [initialize]);

  useEffect(() => {
    if (status === 'authenticated' && user?.id) {
      initPurchases(user.id).catch((e) => console.warn('[boot] purchases', e));
      registerForPushNotifications().catch((e) => console.warn('[boot] push', e));
    }
  }, [status, user?.id]);

  useProtectedRoute(status, role, impersonating);

  useEffect(() => {
    if (fontsLoaded && status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, status]);

  if (!fontsLoaded || status === 'loading') return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AlertModal />
          <StatusBar style="dark" backgroundColor={theme.colors.background.primary} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background.primary },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)"        options={{ animation: 'fade' }} />
            <Stack.Screen name="(onboarding)"  options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)"        options={{ animation: 'fade' }} />
            <Stack.Screen name="teacher"       options={{ animation: 'fade' }} />
            <Stack.Screen name="admin"         options={{ animation: 'fade' }} />
            <Stack.Screen name="session"       options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="learn"         />
            <Stack.Screen name="paywall"       options={{ presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
