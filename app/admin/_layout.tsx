import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme';

export default function AdminLayout() {
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
          height: 64,
          paddingTop: 6, paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen name="index"        options={{
        title: 'Pano',
        tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline"   size={size} color={color} />,
      }} />
      <Tabs.Screen name="teacher-view" options={{
        title: 'Öğretmen',
        tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="student-view" options={{
        title: 'Öğrenci',
        tabBarIcon: ({ color, size }) => <Ionicons name="happy-outline"  size={size} color={color} />,
      }} />
      <Tabs.Screen name="content"      options={{
        title: 'İçerik',
        tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="analytics"    options={{
        title: 'Analiz',
        tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="settings"     options={{
        title: 'Ayarlar',
        tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
      }} />

      {/* Hidden detail screens — files exist on disk but should not appear as a tab. */}
      <Tabs.Screen name="content/words"                       options={{ href: null }} />
      <Tabs.Screen name="content/categories"                  options={{ href: null }} />
      <Tabs.Screen name="content/characters"                  options={{ href: null }} />
      <Tabs.Screen name="content/word/[id]"                   options={{ href: null }} />
      <Tabs.Screen name="content/category/[id]"               options={{ href: null }} />
      <Tabs.Screen name="content/character-edit/[type]/[id]"  options={{ href: null }} />
      <Tabs.Screen name="user/[id]"                           options={{ href: null }} />
    </Tabs>
  );
}
