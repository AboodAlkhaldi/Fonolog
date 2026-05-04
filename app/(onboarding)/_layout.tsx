import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,  // prevent swipe-back during onboarding
      }}
    >
      <Stack.Screen name="child-age" />
      <Stack.Screen name="child-avatar" />
      <Stack.Screen name="welcome" />
    </Stack>
  );
}
