import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Badge } from '@/components';
import { useAuth } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';

type ItemSlot = 'hat' | 'shirt' | 'shoes' | 'acc' | 'bg';
const SLOTS: { slot: ItemSlot; label: string }[] = [
  { slot: 'hat',   label: 'Şapka' },
  { slot: 'shirt', label: 'Tişört' },
  { slot: 'shoes', label: 'Ayakkabı' },
  { slot: 'acc',   label: 'Aksesuar' },
  { slot: 'bg',    label: 'Arka Plan' },
];

interface ItemRow {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  rarity: 'common' | 'rare' | 'legendary';
  unlock_xp: number;
}
interface CharRow {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  equipped_hat: string | null;
  equipped_shirt: string | null;
  equipped_shoes: string | null;
  equipped_acc: string | null;
  equipped_bg: string | null;
}

export default function CharacterTab() {
  const profile = useAuth((s) => s.profile);
  const [character, setCharacter] = useState<CharRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile) return;
    const [charRes, itemsRes] = await Promise.all([
      supabase.from('student_character').select('*').eq('student_id', profile.id).maybeSingle(),
      supabase.from('character_items').select('*').eq('is_active', true).order('unlock_xp'),
    ]);
    if (charRes.data) setCharacter(charRes.data as any);
    if (itemsRes.data) setItems(itemsRes.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile?.id]);

  const equip = async (item: ItemRow) => {
    if (!character) return;
    if (character.total_xp < item.unlock_xp) {
      Alert.alert('Henüz açılmadı', `${item.unlock_xp} XP gerekiyor.`);
      return;
    }
    const { error } = await supabase.rpc('equip_item', { p_item_id: item.id });
    if (error) { Alert.alert('Hata', error.message); return; }
    load();
  };

  if (loading || !character) return <Screen><Loading /></Screen>;

  const avatar = profile?.child_avatar_emoji ?? '🦁';
  const equippedFor = (slot: ItemSlot): string | null => {
    if (slot === 'hat')   return character.equipped_hat;
    if (slot === 'shirt') return character.equipped_shirt;
    if (slot === 'shoes') return character.equipped_shoes;
    if (slot === 'acc')   return character.equipped_acc;
    if (slot === 'bg')    return character.equipped_bg;
    return null;
  };

  return (
    <Screen>
      <Text style={styles.title}>Karakter</Text>

      <View style={styles.preview}>
        <View style={styles.avatarRing}>
          <Text style={styles.avatarEmoji}>{avatar}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing[3] }}>
          <Badge label={`Sv ${character.level}`} variant="info" />
          <Badge label={`${character.total_xp} XP`} variant="success" />
          <Badge label={`🔥 ${character.current_streak}`} variant="warning" />
        </View>
      </View>

      <ScrollView style={{ marginTop: theme.spacing[4] }}>
        {SLOTS.map(({ slot, label }) => {
          const slotItems = items.filter((i) => i.slot === slot);
          const equippedId = equippedFor(slot);
          return (
            <View key={slot} style={styles.section}>
              <Text style={styles.sectionTitle}>{label}</Text>
              <View style={styles.row}>
                {slotItems.map((it) => {
                  const unlocked = character.total_xp >= it.unlock_xp;
                  const equipped = it.id === equippedId;
                  return (
                    <Pressable
                      key={it.id}
                      onPress={() => unlocked ? equip(it) : Alert.alert(it.name, `${it.unlock_xp} XP'de açılır`)}
                      style={[
                        styles.item,
                        equipped && styles.itemEquipped,
                        !unlocked && styles.itemLocked,
                      ]}
                    >
                      <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                      {!unlocked ? (
                        <Text style={styles.itemHint}>🔒 {it.unlock_xp} XP</Text>
                      ) : equipped ? (
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.feedback.success} />
                      ) : (
                        <Text style={styles.itemRarity}>{it.rarity}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
        <View style={{ height: theme.spacing[8] }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary },
  preview: { alignItems: 'center', paddingVertical: theme.spacing[4] },
  avatarRing: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadow.md,
  },
  avatarEmoji: { fontSize: 70 },
  section: { marginBottom: theme.spacing[4] },
  sectionTitle: {
    ...theme.typography.h4, color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
  item: {
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: theme.spacing[3], paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.md,
    borderWidth: 2, borderColor: theme.colors.border.subtle,
    minWidth: 120, alignItems: 'center',
  },
  itemEquipped: {
    borderColor: theme.colors.feedback.success,
    backgroundColor: theme.colors.feedback.successSubtle,
  },
  itemLocked: { opacity: 0.55 },
  itemName: { ...theme.typography.bodySmall, fontFamily: theme.typography.bodyLarge.fontFamily, color: theme.colors.text.primary },
  itemHint: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  itemRarity: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
});
