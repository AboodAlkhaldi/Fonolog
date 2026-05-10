import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Badge } from '@/components';
import { listModules, type ModuleDefinition } from '@/domain';
import { useAuth } from '@/store/auth';
import { getAccessTier, isModuleLocked, isModuleLevelLocked } from '@/lib/access-tier';
import { showAlert } from '@/store/alert';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function LearnTab() {
  const realProfile   = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const tier    = getAccessTier(realProfile);
  const modules = listModules();
  const [studentLevel, setStudentLevel] = useState(0);

  useEffect(() => {
    if (!realProfile || impersonating) return;
    supabase
      .from('student_character')
      .select('level')
      .eq('student_id', realProfile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.level != null) setStudentLevel(data.level);
      });
  }, [realProfile?.id, impersonating]);

  const launch = (m: ModuleDefinition) => {
    if (isModuleLocked(tier, m)) {
      router.push('/paywall');
      return;
    }
    if (isModuleLevelLocked(tier, m, studentLevel)) {
      showAlert(
        t('levelLock.title'),
        t('levelLock.message', { title: m.title, level: m.level, current: studentLevel }),
        [{ text: t('app.ok'), style: 'cancel' }],
      );
      return;
    }
    router.push(`/session/${m.id}`);
  };

  return (
    <Screen scroll={false}>
      <FlatList
        data={modules}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{t('learn.title') ?? 'Öğren'}</Text>
            <Text style={styles.subtitle}>{t('learn.subtitle')}</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const planLocked  = isModuleLocked(tier, m);
          const levelLocked = !planLocked && isModuleLevelLocked(tier, m, studentLevel);
          const locked      = planLocked || levelLocked;
          return (
            <Pressable
              onPress={() => launch(m)}
              style={[styles.card, locked && styles.cardLocked]}
              accessibilityRole="button"
            >
              <Text style={styles.emoji}>{m.icon ?? '🎮'}</Text>
              <View style={styles.body}>
                <Text style={styles.cardTitle}>{m.title}</Text>
                {m.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{m.description}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Badge label={`Sv ${m.level}`} variant="info" />
                  {planLocked  ? <Badge label="🔒 Pro"    variant="warning" /> : null}
                  {levelLocked ? <Badge label="🔒 Seviye" variant="info"    /> : null}
                </View>
              </View>
              <Ionicons
                name={locked ? 'lock-closed' : 'chevron-forward'}
                size={20}
                color={theme.colors.text.muted}
              />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: theme.spacing[4] },
  title:    { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  list: { paddingBottom: theme.spacing[8] },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingVertical:   theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
    ...theme.shadow.sm,
  },
  cardLocked: { opacity: 0.65 },
  emoji: { fontSize: 36, marginRight: theme.spacing[3] },
  body:  { flex: 1 },
  cardTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginBottom: 2 },
  cardDesc:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginBottom: theme.spacing[2] },
  metaRow:   { flexDirection: 'row', gap: theme.spacing[2], flexWrap: 'wrap' },
});
