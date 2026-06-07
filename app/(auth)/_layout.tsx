import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome"        />
      <Stack.Screen name="register"       />
      <Stack.Screen name="login"          />
      <Stack.Screen name="verify-email"   />
      <Stack.Screen name="role-choice"    options={{ gestureEnabled: false }} />
      <Stack.Screen name="teacher-signup" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
