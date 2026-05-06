import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Badge } from '@/components';
import { CharacterRenderer } from '@/components/character/CharacterRenderer';
import { useAuth } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';

interface BaseChar { id: string; name: string; asset_url: string; asset_type: 'svg'|'png'|'lottie'; unlock_xp: number }
interface Extra    { id: string; name: string; asset_url: string; asset_type: 'svg'|'png'|'lottie'; category_id: string; rarity: string; unlock_xp: number }
interface ExtraCat { id: string; name: string }
interface CharRow {
  total_xp: number; level: number;
  current_streak: number; longest_streak: number;
  base_character_id: string | null;
  equipped_hat: string | null;
  equipped_shirt: string | null;
  equipped_shoes: string | null;
  equipped_acc: string | null;
  equipped_bg: string | null;
}

type Tab = 'base' | 'extras';

export default function CharacterTab() {
  const profile = useAuth((s) => s.profile);
  const [tab,        setTab]        = useState<Tab>('base');
  const [bases,      setBases]      = useState<BaseChar[]>([]);
  const [extras,     setExtras]     = useState<Extra[]>([]);
  const [cats,       setCats]       = useState<ExtraCat[]>([]);
  const [character,  setCharacter]  = useState<CharRow | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [activeCat,  setActiveCat]  = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const [b, x, c, ch] = await Promise.all([
        supabase.from('characters_base').select('*').eq('is_active', true).order('display_order'),
        supabase.from('character_extras').select('*').eq('is_active', true).order('unlock_xp'),
        supabase.from('character_extra_categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('student_character').select('*').eq('student_id', profile.id).maybeSingle(),
      ]);

      const firstErr = b.error || x.error || c.error || ch.error;
      if (firstErr) {
        setError(firstErr.message);
        setLoading(false);
        return;
      }

      setBases(b.data ?? []);
      setExtras(x.data ?? []);
      setCats(c.data ?? []);

      // Defensive: if the student row is missing (DB trigger backfill incomplete),
      // create one client-side so the screen can render instead of hanging.
      let charData: any = ch.data;
      if (!charData) {
        const upsert = await supabase
          .from('student_character')
          .upsert({ student_id: profile.id } as any, { onConflict: 'student_id' })
          .select()
          .maybeSingle();
        if (upsert.error) {
          setError(upsert.error.message);
          setLoading(false);
          return;
        }
        charData = upsert.data;
      }
      setCharacter(charData as CharRow);

      if ((c.data ?? []).length > 0 && !activeCat) setActiveCat(c.data![0].id);
      setLoading(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Karakter yüklenemedi.');
      setLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen><Loading /></Screen>;
  if (error) {
    return (
      <Screen>
        <Text style={styles.title}>Karakter</Text>
        <Text style={[styles.tileHint, { textAlign: 'center', marginTop: 24 }]}>{error}</Text>
      </Screen>
    );
  }
  if (!character) {
    return (
      <Screen>
        <Text style={styles.title}>Karakter</Text>
        <Text style={[styles.tileHint, { textAlign: 'center', marginTop: 24 }]}>
          Karakter bilgileri henüz hazır değil. Birkaç saniye sonra tekrar dene.
        </Text>
      </Screen>
    );
  }

  const equipBase = async (id: string) => {
    if (character.total_xp < (bases.find((b) => b.id === id)?.unlock_xp ?? 0)) {
      Alert.alert('Henüz açılmadı', 'Daha çok XP kazan!');
      return;
    }
    await supabase.from('student_character').update({ base_character_id: id } as any).eq('student_id', profile!.id);
    load();
  };

  const equipExtra = async (extra: Extra) => {
    if (character.total_xp < extra.unlock_xp) {
      Alert.alert('Henüz açılmadı', `${extra.unlock_xp} XP gerekiyor.`);
      return;
    }
    const { error } = await supabase.rpc('equip_item', { p_item_id: extra.id });
    if (error) { Alert.alert('Hata', error.message); return; }
    load();
  };

  const baseDef = bases.find((b) => b.id === character.base_character_id) ?? null;
  const equippedExtras = [
    extras.find((e) => e.id === character.equipped_hat),
    extras.find((e) => e.id === character.equipped_shirt),
    extras.find((e) => e.id === character.equipped_shoes),
    extras.find((e) => e.id === character.equipped_acc),
    extras.find((e) => e.id === character.equipped_bg),
  ];

  const filteredExtras = extras.filter((e) => e.category_id === activeCat);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Karakter</Text>

      <View style={styles.previewRow}>
        <CharacterRenderer
          base={baseDef ? { id: baseDef.id, asset_url: baseDef.asset_url, asset_type: baseDef.asset_type } : null}
          extras={equippedExtras.map((e) => e ? { id: e.id, asset_url: e.asset_url, asset_type: e.asset_type } : null)}
          size={140}
          fallbackEmoji={profile?.child_avatar_emoji ?? '🦁'}
        />
        <View style={styles.statsCol}>
          <Badge label={`Sv ${character.level}`} variant="info" />
          <Badge label={`${character.total_xp} XP`} variant="success" />
          <Badge label={`🔥 ${character.current_streak}`} variant="warning" />
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('base')} style={[styles.tabBtn, tab === 'base' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'base' && styles.tabTextActive]}>Karakterler</Text>
        </Pressable>
        <Pressable onPress={() => setTab('extras')} style={[styles.tabBtn, tab === 'extras' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'extras' && styles.tabTextActive]}>Aksesuarlar</Text>
        </Pressable>
      </View>

      {tab === 'base' ? (
        <FlatList
          data={bases}
          numColumns={3}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
          renderItem={({ item }) => {
            const unlocked = character.total_xp >= item.unlock_xp;
            const equipped = item.id === character.base_character_id;
            return (
              <Pressable
                onPress={() => unlocked ? equipBase(item.id) : Alert.alert(item.name, `${item.unlock_xp} XP'de açılır`)}
                style={[styles.tile, equipped && styles.tileEquipped, !unlocked && styles.tileLocked]}
              >
                <CharacterRenderer
                  base={{ id: item.id, asset_url: item.asset_url, asset_type: item.asset_type }}
                  size={64}
                  fallbackEmoji="🦁"
                />
                <Text style={styles.tileName} numberOfLines={1}>{item.name}</Text>
                {!unlocked ? <Text style={styles.tileHint}>🔒 {item.unlock_xp}</Text> :
                 equipped ? <Ionicons name="checkmark-circle" size={14} color={theme.colors.feedback.success} /> :
                 null}
              </Pressable>
            );
          }}
        />
      ) : (
        <>
          <FlatList
            horizontal
            data={cats}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: theme.spacing[2] }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setActiveCat(item.id)}
                style={[styles.catChip, activeCat === item.id && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, activeCat === item.id && styles.catChipTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
          <FlatList
            data={filteredExtras}
            numColumns={3}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
            renderItem={({ item }) => {
              const unlocked = character.total_xp >= item.unlock_xp;
              const equipped = item.id === character.equipped_hat || item.id === character.equipped_shirt
                || item.id === character.equipped_shoes || item.id === character.equipped_acc
                || item.id === character.equipped_bg;
              return (
                <Pressable
                  onPress={() => unlocked ? equipExtra(item) : Alert.alert(item.name, `${item.unlock_xp} XP'de açılır`)}
                  style={[styles.tile, equipped && styles.tileEquipped, !unlocked && styles.tileLocked]}
                >
                  <CharacterRenderer
                    base={null}
                    extras={[{ id: item.id, asset_url: item.asset_url, asset_type: item.asset_type }]}
                    size={56}
                    fallbackEmoji="✨"
                  />
                  <Text style={styles.tileName} numberOfLines={1}>{item.name}</Text>
                  {!unlocked ? <Text style={styles.tileHint}>🔒 {item.unlock_xp}</Text> :
                   equipped ? <Ionicons name="checkmark-circle" size={14} color={theme.colors.feedback.success} /> :
                   <Text style={styles.rarity}>{item.rarity}</Text>}
                </Pressable>
              );
            }}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4], paddingVertical: theme.spacing[4] },
  statsCol: { flex: 1, gap: theme.spacing[2] },
  tabs: { flexDirection: 'row', gap: theme.spacing[2], marginBottom: theme.spacing[3] },
  tabBtn: {
    flex: 1, paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md, alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  tabBtnActive: { backgroundColor: theme.colors.brand.primary },
  tabText: { ...theme.typography.bodyMedium, color: theme.colors.text.muted },
  tabTextActive: { color: theme.colors.text.primary },
  catChip: {
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background.secondary,
  },
  catChipActive: { backgroundColor: theme.colors.brand.primary },
  catChipText: { ...theme.typography.bodySmall, color: theme.colors.text.muted },
  catChipTextActive: { color: theme.colors.text.primary },
  tile: {
    flex: 1, margin: 4, padding: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.md,
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', minHeight: 110,
  },
  tileEquipped: {
    borderColor: theme.colors.feedback.success,
    backgroundColor: theme.colors.feedback.successSubtle,
  },
  tileLocked: { opacity: 0.5 },
  tileName: { ...theme.typography.caption, color: theme.colors.text.primary, marginTop: 4 },
  tileHint: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  rarity:   { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
});
