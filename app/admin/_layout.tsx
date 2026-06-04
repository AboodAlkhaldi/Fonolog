import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme';
import { TEACHER_MODULE_ENABLED } from '@/domain/feature-flags';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.brand.secondaryHover,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarStyle: {
          backgroundColor: theme.colors.background.secondary,
          borderTopColor: theme.colors.border.subtle,
          borderTopWidth: 1,
          height: 56 + tabBarPaddingBottom,
          paddingTop: 6,
          paddingBottom: tabBarPaddingBottom,
        },
      }}
    >
      <Tabs.Screen name="index"        options={{
        title: 'Pano',
        tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline"   size={size} color={color} />,
      }} />
      <Tabs.Screen name="teacher-view" options={{
        // Teacher module disabled → hide the teacher-preview tab (file stays on
        // disk so it returns when TEACHER_MODULE_ENABLED is flipped back on).
        href: TEACHER_MODULE_ENABLED ? undefined : null,
        title: 'Öğretmen',
        tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="student-view" options={{
        title: 'Öğrenci',
        tabBarIcon: ({ color, size }) => <Ionicons name="happy-outline"  size={size} color={color} />,
      }} />
      <Tabs.Screen name="analytics"    options={{
        title: 'Analiz',
        tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="content"      options={{
        title: 'Veri Yönetimi',
        tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="settings"     options={{
        title: 'Ayarlar',
        tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
      }} />

      {/* Hidden detail screens — files exist on disk but should not appear as a tab. */}
      <Tabs.Screen name="user/[id]"   options={{ href: null }} />
      <Tabs.Screen name="users-list"  options={{ href: null }} />
    </Tabs>
  );
}
