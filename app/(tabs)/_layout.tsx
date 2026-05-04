import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/store/auth';
import { theme } from '@/theme';
import { t }     from '@/i18n';

export default function TabsLayout() {
  const isAdmin = useAuth((s) => s.profile?.role === 'admin');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   theme.colors.brand.secondaryHover,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarLabelStyle: {
          fontFamily: theme.typography.bodyMedium.fontFamily,
          fontSize:   12,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background.secondary,
          borderTopColor:  theme.colors.border.subtle,
          borderTopWidth:  1,
          height:          64,
          paddingTop:      6,
          paddingBottom:   8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline"      size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t('tabs.learn'),
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline"   size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: t('tabs.character'),
          tabBarIcon: ({ color, size }) => <Ionicons name="happy-outline"     size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Yönetici',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
          href: isAdmin ? ('/(tabs)/teacher' as any) : null,  // hidden for non-admins
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline"    size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
