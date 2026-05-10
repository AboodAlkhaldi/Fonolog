import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import { Screen, Button, Input, Loading } from '@/components';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/store/alert';
import { theme } from '@/theme';
import { t } from '@/i18n';

type Kind = 'base' | 'extra' | 'cat';

export default function CharacterEdit() {
  const { type, id } = useLocalSearchParams<{ type: Kind; id: string }>();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unlockXp, setUnlockXp] = useState('0');
  const [categoryId, setCategoryId] = useState('hat');
  const [rarity, setRarity] = useState<'common'|'rare'|'legendary'>('common');
  const [assetUri, setAssetUri] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<'svg'|'png'|'lottie'>('png');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isNew && id) {
        const tableMap: any = { base: 'characters_base', extra: 'character_extras', cat: 'character_extra_categories' };
        const { data } = await supabase.from(tableMap[type]).select('*').eq('id', id).maybeSingle();
        if (data) {
          setName(data.name ?? '');
          setDescription((data as any).description ?? '');
          setUnlockXp(String((data as any).unlock_xp ?? 0));
          if ((data as any).category_id) setCategoryId((data as any).category_id);
          if ((data as any).rarity) setRarity((data as any).rarity);
          setAssetType((data as any).asset_type ?? 'png');
        }
      }
      setLoading(false);
    })();
  }, [type, id]);

  const pickAsset = async () => {
    if (assetType === 'lottie') {
      const r = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (r.canceled || !r.assets?.[0]) return;
      setAssetUri(r.assets[0].uri);
    } else {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (r.canceled || !r.assets?.[0]) return;
      setAssetUri(r.assets[0].uri);
    }
  };

  const uploadAsset = async (kind: Kind, recordId: string): Promise<string | null> => {
    if (!assetUri) return null;
    const ext = assetType === 'lottie' ? 'json' : assetType;
    const path = `${kind === 'base' ? 'bases' : 'extras'}/${recordId}.${ext}`;

    // Read file as base64 for upload
    const base64 = await FileSystem.readAsStringAsync(assetUri, { encoding: FileSystem.EncodingType.Base64 });
    const arr = decode(base64);
    const contentType = assetType === 'svg'  ? 'image/svg+xml'
                      : assetType === 'lottie' ? 'application/json'
                      : 'image/png';

    const { error } = await supabase.storage
      .from('characters')
      .upload(path, arr, { contentType, upsert: true });
    if (error) { showAlert(t('admin.content.loadError'), error.message); return null; }
    const { data } = supabase.storage.from('characters').getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async () => {
    if (!name) { showAlert(t('teacher.assignment.incompleteTitle'), t('admin.content.charNameRequired')); return; }
    setSubmitting(true);

    try {
      if (type === 'cat') {
        const slug = name.toLowerCase().replace(/[^a-z]/g, '_');
        const payload = { id: isNew ? slug : id, name, is_active: true };
        const result = isNew
          ? await supabase.from('character_extra_categories').insert(payload).select().single()
          : await supabase.from('character_extra_categories').update(payload).eq('id', id).select().single();
        if (result.error) throw result.error;
      } else {
        const tableMap: any = { base: 'characters_base', extra: 'character_extras' };
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const recordId = isNew ? slug : id!;

        let assetUrl = `placeholder://${recordId}`;
        if (assetUri) {
          const url = await uploadAsset(type, recordId);
          if (url) assetUrl = url;
        }

        const basePayload: any = {
          id: recordId,
          name,
          asset_url: assetUrl,
          asset_type: assetType,
          unlock_xp: parseInt(unlockXp, 10) || 0,
          is_active: true,
        };
        if (type === 'base') {
          basePayload.description = description;
        } else {
          basePayload.category_id = categoryId;
          basePayload.rarity = rarity;
        }

        const result = isNew
          ? await supabase.from(tableMap[type]).insert(basePayload).select().single()
          : await supabase.from(tableMap[type]).update(basePayload).eq('id', id).select().single();
        if (result.error) throw result.error;
      }

      router.back();
    } catch (e: any) {
      showAlert(t('app.error_title'), e?.message ?? t('admin.content.saveFail'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>
        {type === 'base' ? t('admin.content.addBaseChar') : type === 'extra' ? t('admin.content.tabExtras') : t('admin.content.tabCats')}
        {' '}{isNew ? t('admin.content.newSuffix') : t('admin.content.editSuffix')}
      </Text>

      <ScrollView>
        <Input label={t('admin.content.nameLabel')} value={name} onChangeText={setName} required />
        {type === 'base' && (
          <Input label={t('admin.content.descLabel')} value={description} onChangeText={setDescription} multiline />
        )}
        {(type === 'base' || type === 'extra') && (
          <Input label={t('admin.content.unlockXpLabel')} value={unlockXp} onChangeText={setUnlockXp} keyboardType="numeric" />
        )}
        {type === 'extra' && (
          <>
            <Text style={styles.label}>{t('admin.content.tabCats')}</Text>
            <Input value={categoryId} onChangeText={setCategoryId} placeholder="hat / shirt / shoes / acc / bg" />
            <Text style={styles.label}>{t('admin.content.rarityLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['common','rare','legendary'] as const).map((r) => (
                <Pressable key={r} onPress={() => setRarity(r)}
                           style={[styles.rChip, rarity === r && styles.rChipActive]}>
                  <Text style={[styles.rChipText, rarity === r && styles.rChipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {(type === 'base' || type === 'extra') && (
          <>
            <Text style={styles.label}>{t('admin.content.assetTypeLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing[3] }}>
              {(['png','svg','lottie'] as const).map((at) => (
                <Pressable key={at} onPress={() => setAssetType(at)}
                           style={[styles.rChip, assetType === at && styles.rChipActive]}>
                  <Text style={[styles.rChipText, assetType === at && styles.rChipTextActive]}>{at.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Button label={assetUri ? t('admin.content.fileSelected') : t('admin.content.filePick', { type: assetType.toUpperCase() })}
                    variant="secondary" size="md" fullWidth onPress={pickAsset} />
          </>
        )}

        <Button
          label={t('app.save')}
          variant="cta" size="lg" fullWidth
          loading={submitting} onPress={onSubmit}
          style={{ marginTop: theme.spacing[5] }}
        />
      </ScrollView>
    </Screen>
  );
}

// Tiny base64 → Uint8Array (for Supabase upload)
function decode(base64: string): Uint8Array {
  const binaryString = (globalThis as any).atob ? (globalThis as any).atob(base64) : require('base-64').decode(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
  label: { ...theme.typography.bodySmall, color: theme.colors.text.secondary, marginBottom: theme.spacing[2] },
  rChip: {
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.secondary,
  },
  rChipActive: { backgroundColor: theme.colors.brand.primary },
  rChipText: { ...theme.typography.bodySmall, color: theme.colors.text.muted },
  rChipTextActive: { color: theme.colors.text.primary },
});
