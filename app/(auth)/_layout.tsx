import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome"       options={{ animation: 'fade' }} />
      <Stack.Screen name="register"      options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="login"         options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="verify-email"  options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="forgot"        options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
