/**
 * Root index — when the user opens the app, they land here briefly before
 * useProtectedRoute redirects them to the correct group. We render nothing
 * to avoid a flash; the splash screen / status spinner covers it.
 */
import { Redirect } from 'expo-router';
import { useAuth } from '@/store/auth';

export default function Index() {
  const status = useAuth((s) => s.status);

  if (status === 'unauthenticated' || status === 'awaitingEmailVerify') {
    return <Redirect href="/(auth)/welcome" />;
  }
  if (status === 'needsOnboarding') {
    return <Redirect href="/(onboarding)/child-age" />;
  }
  if (status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }
  // 'loading' — splash still up
  return null;
}
