import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Loading, Badge } from '@/components';
import { CharacterRenderer } from '@/components/character/CharacterRenderer';
import { useAuth } from '@/store/auth';
import { useCharacter } from '@/store/character';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

const placeholderEmoji = (url: string, fallback = '✨') =>
  url.startsWith('placeholder://') ? (url.slice('placeholder://'.length) || fallback) : fallback;

type BaseChar = import('@/store/character').BaseCharacter;
type Variant  = import('@/store/character').VariantCharacter;

type Tab = 'base' | 'variants';

const RARITY_LABEL: Record<Variant['rarity'], string> = {
  common:    'Sıradan',
  rare:      'Nadir',
  legendary: 'Efsane',
};

const RARITY_COLOR: Record<Variant['rarity'], string> = {
  common:    theme.colors.text.muted,
  rare:      theme.colors.brand.primary,
  legendary: theme.colors.feedback.warningText,
};

export default function CharacterTab() {
  const profile       = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const loadCharacter = useCharacter((s) => s.load);
  const reloadCharacter = useCharacter((s) => s.reload);
  const equipFromStore = useCharacter((s) => s.equip);
  const storeBases    = useCharacter((s) => s.bases);
  const storeVariants = useCharacter((s) => s.variants);
  const storeStats    = useCharacter((s) => s.stats);
  const storeLoading  = useCharacter((s) => s.loading);
  const storeError    = useCharacter((s) => s.error);

  const [tab, setTab] = useState<Tab>('base');
  /** Which base character's variants to show in the "Aksesuarlar" tab. */
  const [activeBaseId, setActiveBaseId] = useState<string | null>(null);

  // Admin/teacher previewing as a student: show empty character UI without
  // touching the real student's data. Don't load from the store in that mode.
  const previewing = !!impersonating;

  useEffect(() => {
    if (previewing) return;
    if (!profile?.id) return;
    loadCharacter(profile.id);
  }, [profile?.id, previewing, loadCharacter]);

  // Re-pull on focus so freshly uploaded character art (edited in admin) shows
  // up without an app restart. Skips the very first focus — the effect above
  // already did the initial load.
  useFocusEffect(
    useCallback(() => {
      if (previewing || !profile?.id) return;
      reloadCharacter();
    }, [previewing, profile?.id, reloadCharacter]),
  );

  const previewStats: import('@/store/character').CharacterStats = {
    total_xp: 0, level: 1, current_streak: 0, longest_streak: 0,
    base_character_id: null, equipped_variant_id: null,
  };

  const bases: BaseChar[]   = previewing ? [] : storeBases;
  const variants: Variant[] = previewing ? [] : storeVariants;
  const character           = previewing ? previewStats : storeStats;
  const loading             = previewing ? false : storeLoading;
  const error               = previewing ? null  : storeError;

  // Default the variants tab to the currently equipped base character (once loaded).
  useEffect(() => {
    if (activeBaseId || !character) return;
    const initialBase = character.base_character_id ?? bases[0]?.id ?? null;
    if (initialBase) setActiveBaseId(initialBase);
  }, [activeBaseId, character, bases]);

  if (loading) return <Screen><Loading /></Screen>;
  if (error) {
    return (
      <Screen>
        <Text style={styles.title}>{t('character.title')}</Text>
        <Text style={styles.errorText}>{error}</Text>
      </Screen>
    );
  }
  if (!character) {
    return (
      <Screen>
        <Text style={styles.title}>{t('character.title')}</Text>
        <Text style={styles.errorText}>{t('character.notReady')}</Text>
      </Screen>
    );
  }

  const tryEquip = async (id: string, label: string, xpNeeded: number) => {
    if (previewing) return; // preview mode doesn't persist
    if (!character || character.total_xp < xpNeeded) {
      showAlert(label, t('character.unlockRequired', { xp: xpNeeded }));
      return;
    }
    const res = await equipFromStore(id);
    if (!res.ok) showAlert(t('app.error_title'), res.error);
  };

  const baseDef    = bases.find((b) => b.id === character.base_character_id) ?? null;
  const variantDef = variants.find((v) => v.id === character.equipped_variant_id) ?? null;
  const activeBase = bases.find((b) => b.id === activeBaseId) ?? null;
  const visibleVariants = activeBaseId
    ? variants.filter((v) => v.base_character_id === activeBaseId)
    : [];

  // Progress to next base-character unlock (encourages exploration).
  const nextBaseLock = bases.find((b) => b.unlock_xp > character.total_xp);
  const xpToNext     = nextBaseLock ? nextBaseLock.unlock_xp - character.total_xp : 0;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('character.title')}</Text>
      </View>

      {/* Hero preview card */}
      <View style={styles.previewCard}>
        <View style={styles.previewAvatar}>
          <CharacterRenderer
            base={baseDef ? { id: baseDef.id, asset_url: baseDef.asset_url, asset_type: baseDef.asset_type } : null}
            variant={variantDef ? { id: variantDef.id, asset_url: variantDef.asset_url, asset_type: variantDef.asset_type } : null}
            size={96}
            fallbackEmoji={
              baseDef ? placeholderEmoji(baseDef.asset_url, profile?.child_avatar_emoji ?? '🦁')
                      : (profile?.child_avatar_emoji ?? '🦁')
            }
          />
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.characterName}>{profile?.full_name?.split(' ')[0] ?? 'Kahraman'}</Text>
          <Text style={styles.characterSub}>
            {variantDef ? variantDef.name : (baseDef?.name ?? t('character.tabBase'))}
          </Text>
          <View style={styles.statsBadges}>
            <View style={styles.statPill}>
              <Ionicons name="star" size={12} color={theme.colors.feedback.warningText} />
              <Text style={styles.statPillText}>{character.total_xp} XP</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="flame" size={12} color={theme.colors.feedback.warningText} />
              <Text style={styles.statPillText}>{character.current_streak}</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="trophy" size={12} color={theme.colors.feedback.success} />
              <Text style={styles.statPillText}>Sv {character.level}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('base')} style={[styles.tabBtn, tab === 'base' && styles.tabBtnActive]}>
          <Ionicons name="person" size={16}
                    color={tab === 'base' ? theme.colors.text.primary : theme.colors.text.muted} />
          <Text style={[styles.tabText, tab === 'base' && styles.tabTextActive]}>{t('character.tabBase')}</Text>
        </Pressable>
        <Pressable onPress={() => setTab('variants')} style={[styles.tabBtn, tab === 'variants' && styles.tabBtnActive]}>
          <Ionicons name="sparkles" size={16}
                    color={tab === 'variants' ? theme.colors.text.primary : theme.colors.text.muted} />
          <Text style={[styles.tabText, tab === 'variants' && styles.tabTextActive]}>{t('character.tabExtras')}</Text>
        </Pressable>
      </View>

      {tab === 'base' ? (
        <FlatList
          data={bases}
          numColumns={2}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          ListFooterComponent={nextBaseLock ? (
            <View style={styles.progressHint}>
              <Ionicons name="lock-closed" size={14} color={theme.colors.text.muted} />
              <Text style={styles.progressHintText}>
                {t('character.nextUnlock', { name: nextBaseLock.name, xp: xpToNext })}
              </Text>
            </View>
          ) : null}
          renderItem={({ item }) => {
            const unlocked = character.total_xp >= item.unlock_xp;
            const equipped = item.id === character.base_character_id;
            return (
              <Pressable
                onPress={() => unlocked
                  ? tryEquip(item.id, item.name, item.unlock_xp)
                  : showAlert(item.name, t('character.unlockAt', { xp: item.unlock_xp }))}
                style={[styles.baseCard, equipped && styles.cardEquipped, !unlocked && styles.cardLocked]}
              >
                <View style={styles.baseAvatar}>
                  <CharacterRenderer
                    base={{ id: item.id, asset_url: item.asset_url, asset_type: item.asset_type }}
                    size={72}
                    fallbackEmoji={placeholderEmoji(item.asset_url, '🦁')}
                  />
                  {equipped ? (
                    <View style={styles.equippedDot}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.baseName} numberOfLines={1}>{item.name}</Text>
                {unlocked ? (
                  <Text style={[styles.unlockTag, equipped && styles.unlockTagEquipped]}>
                    {equipped ? t('character.equippedLabel') : t('character.tapToEquip')}
                  </Text>
                ) : (
                  <View style={styles.lockTag}>
                    <Ionicons name="lock-closed" size={10} color={theme.colors.text.muted} />
                    <Text style={styles.lockTagText}>{item.unlock_xp} XP</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }} showsVerticalScrollIndicator={false}>
          {/* Section intro */}
          <View style={styles.variantsHint}>
            <Ionicons name="information-circle" size={16} color={theme.colors.brand.primary} />
            <Text style={styles.variantsHintText}>{t('character.variantsHint')}</Text>
          </View>

          {/* Base-character chips (one per base = one "Aksesuarlar" section) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {bases.map((b) => {
              const isActive = activeBaseId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setActiveBaseId(b.id)}
                  style={[styles.baseChip, isActive && styles.baseChipActive]}
                >
                  <Text style={styles.baseChipEmoji}>{placeholderEmoji(b.asset_url, '🦁')}</Text>
                  <Text style={[styles.baseChipText, isActive && styles.baseChipTextActive]} numberOfLines={1}>
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Section header */}
          {activeBase ? (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionEmoji}>{placeholderEmoji(activeBase.asset_url, '🦁')}</Text>
                <View>
                  <Text style={styles.sectionTitle}>{activeBase.name} Aksesuarları</Text>
                  <Text style={styles.sectionSubtitle}>
                    {t('character.variantsCount', { count: visibleVariants.length })}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Variants grid */}
          {visibleVariants.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyText}>{t('character.noVariants')}</Text>
            </View>
          ) : (
            <View style={styles.variantsGrid}>
              {visibleVariants.map((v) => {
                const unlocked = character.total_xp >= v.unlock_xp;
                const equipped = v.id === character.equipped_variant_id;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => unlocked
                      ? tryEquip(v.id, v.name, v.unlock_xp)
                      : showAlert(v.name, t('character.unlockRequired', { xp: v.unlock_xp }))}
                    style={[styles.variantCard, equipped && styles.cardEquipped, !unlocked && styles.cardLocked]}
                  >
                    <View style={[styles.variantAvatar, { backgroundColor: RARITY_COLOR[v.rarity] + '15' }]}>
                      <CharacterRenderer
                        variant={{ id: v.id, asset_url: v.asset_url, asset_type: v.asset_type }}
                        size={64}
                        fallbackEmoji={placeholderEmoji(v.asset_url, '✨')}
                      />
                      {equipped ? (
                        <View style={styles.equippedDot}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLOR[v.rarity] + '20' }]}>
                      <Text style={[styles.rarityText, { color: RARITY_COLOR[v.rarity] }]}>
                        {RARITY_LABEL[v.rarity]}
                      </Text>
                    </View>
                    <Text style={styles.variantName} numberOfLines={1}>{v.name}</Text>
                    {unlocked ? (
                      <Text style={[styles.unlockTag, equipped && styles.unlockTagEquipped]}>
                        {equipped ? t('character.equippedLabel') : t('character.tapToEquip')}
                      </Text>
                    ) : (
                      <View style={styles.lockTag}>
                        <Ionicons name="lock-closed" size={10} color={theme.colors.text.muted} />
                        <Text style={styles.lockTagText}>{v.unlock_xp} XP</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: theme.spacing[3] },
  title: { ...theme.typography.h1, color: theme.colors.text.primary },
  errorText: { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center', marginTop: theme.spacing[6] },

  // Preview card
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadow.md,
  },
  previewAvatar: {
    width: 104, height: 104,
    borderRadius: 52,
    backgroundColor: theme.colors.brand.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  statsCol: { flex: 1, gap: theme.spacing[1] },
  characterName: { ...theme.typography.h3, color: theme.colors.text.primary },
  characterSub:  { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginBottom: theme.spacing[2] },
  statsBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.radius.full,
  },
  statPillText: { ...theme.typography.caption, color: theme.colors.text.primary, fontFamily: theme.typography.bodyMedium.fontFamily },

  // Tabs
  tabs: { flexDirection: 'row', gap: theme.spacing[2], marginBottom: theme.spacing[3] },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.secondary,
  },
  tabBtnActive: { backgroundColor: theme.colors.brand.primary },
  tabText: { ...theme.typography.bodyMedium, color: theme.colors.text.muted },
  tabTextActive: { color: theme.colors.text.primary },

  // Base grid (2-col)
  gridContent: { paddingBottom: theme.spacing[8] },
  gridRow:     { gap: theme.spacing[3], marginBottom: theme.spacing[3] },
  baseCard: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[3],
    alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    ...theme.shadow.sm,
  },
  baseAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: theme.colors.background.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing[2],
    position: 'relative',
  },
  baseName: { ...theme.typography.bodyLarge, fontFamily: theme.typography.bodyLarge.fontFamily, color: theme.colors.text.primary, marginBottom: 4 },

  // Variants section
  variantsHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.feedback.infoSubtle,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing[3],
  },
  variantsHintText: { ...theme.typography.bodySmall, color: theme.colors.text.secondary, flex: 1 },

  chipScroll: { gap: 8, paddingBottom: theme.spacing[2] },
  baseChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.full,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  baseChipActive: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.brand.primary + '14',
  },
  baseChipEmoji: { fontSize: 18 },
  baseChipText: { ...theme.typography.bodySmall, color: theme.colors.text.muted, fontFamily: theme.typography.bodyMedium.fontFamily },
  baseChipTextActive: { color: theme.colors.brand.primary },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: theme.spacing[3], marginBottom: theme.spacing[2],
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionEmoji: { fontSize: 28 },
  sectionTitle: { ...theme.typography.h4, color: theme.colors.text.primary },
  sectionSubtitle: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 1 },

  variantsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[3], marginBottom: theme.spacing[3] },
  variantCard: {
    width: '47%',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[3],
    alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    ...theme.shadow.sm,
  },
  variantAvatar: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing[2],
    position: 'relative',
  },
  rarityBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: theme.radius.full,
    marginBottom: 4,
  },
  rarityText: { ...theme.typography.caption, fontFamily: theme.typography.bodyMedium.fontFamily, fontSize: 10 },
  variantName: { ...theme.typography.bodyMedium, color: theme.colors.text.primary, marginBottom: 4, textAlign: 'center' },

  // Shared card states
  cardEquipped: {
    borderColor: theme.colors.feedback.success,
    backgroundColor: theme.colors.feedback.successSubtle,
  },
  cardLocked: { opacity: 0.55 },
  equippedDot: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.colors.feedback.success,
    borderWidth: 2, borderColor: theme.colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Unlock / lock tags (replaces the muddled hint/rarity text)
  unlockTag: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  unlockTagEquipped: { color: theme.colors.feedback.successText, fontFamily: theme.typography.bodyMedium.fontFamily },
  lockTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: theme.radius.full,
    marginTop: 2,
  },
  lockTagText: { ...theme.typography.caption, color: theme.colors.text.muted, fontSize: 10 },

  progressHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    marginTop: theme.spacing[2],
  },
  progressHintText: { ...theme.typography.bodySmall, color: theme.colors.text.muted, flex: 1 },

  emptyState: { alignItems: 'center', paddingVertical: theme.spacing[8] },
  emptyEmoji: { fontSize: 48, marginBottom: theme.spacing[2] },
  emptyText:  { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center' },
});
