import { Stack } from 'expo-router';

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="students" />
      <Stack.Screen name="student/[id]" />
      <Stack.Screen name="words"    />
      <Stack.Screen name="word/[id]" />
      <Stack.Screen name="assignments/new" />
    </Stack>
  );
}
