import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AdminPreviewBanner } from '@/components/common/AdminPreviewBanner';
import { theme } from '@/theme';

export default function TeacherLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AdminPreviewBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:   theme.colors.brand.secondaryHover,
          tabBarInactiveTintColor: theme.colors.text.muted,
          tabBarLabelStyle: {
            fontFamily: theme.typography.bodyMedium.fontFamily,
            fontSize: 12,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.background.secondary,
            borderTopColor: theme.colors.border.subtle,
            borderTopWidth: 1,
            height: 64,
            paddingTop: 6,
            paddingBottom: 8,
          },
        }}
      >
        <Tabs.Screen name="index"   options={{
          title: 'Öğrenciler',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }} />
        <Tabs.Screen name="preview" options={{
          title: 'Öğrenci Görünümü',
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" size={size} color={color} />,
        }} />
        <Tabs.Screen name="settings" options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }} />

        {/* Hidden routes — files exist on disk but should not appear as a tab. */}
        <Tabs.Screen name="student/[id]"     options={{ href: null }} />
        <Tabs.Screen name="invite"           options={{ href: null }} />
        <Tabs.Screen name="words"            options={{ href: null }} />
        <Tabs.Screen name="students"         options={{ href: null }} />
        <Tabs.Screen name="word/[id]"        options={{ href: null }} />
        <Tabs.Screen name="assignments/new"  options={{ href: null }} />
      </Tabs>
    </View>
  );
}
