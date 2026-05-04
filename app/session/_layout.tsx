import { Stack } from 'expo-router';

export default function SessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,   // no swipe-back during a session
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="[moduleId]" />
      <Stack.Screen name="result" options={{ animation: 'fade' }} />
    </Stack>
  );
}
