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

type Kind = 'base' | 'variant';

interface BaseOption { id: string; name: string }

export default function CharacterEdit() {
  const { type, id } = useLocalSearchParams<{ type: Kind; id: string }>();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unlockXp, setUnlockXp] = useState('0');
  const [baseId, setBaseId] = useState<string | null>(null);
  const [bases, setBases]   = useState<BaseOption[]>([]);
  const [rarity, setRarity] = useState<'common'|'rare'|'legendary'>('common');
  const [assetUri, setAssetUri] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<'svg'|'png'|'lottie'>('png');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Variant editor needs the list of bases to pick a parent character.
      if (type === 'variant') {
        const { data: b } = await supabase
          .from('characters_base').select('id, name').order('display_order');
        setBases((b ?? []) as BaseOption[]);
        if ((b ?? []).length > 0 && !baseId) setBaseId((b as BaseOption[])[0].id);
      }

      if (!isNew && id) {
        const table = type === 'base' ? 'characters_base' : 'character_extras';
        const { data } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
        if (data) {
          setName(data.name ?? '');
          setDescription((data as any).description ?? '');
          setUnlockXp(String((data as any).unlock_xp ?? 0));
          if ((data as any).base_character_id) setBaseId((data as any).base_character_id);
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

  const uploadAsset = async (recordId: string): Promise<string | null> => {
    if (!assetUri) return null;
    const ext = assetType === 'lottie' ? 'json' : assetType;
    const folder = type === 'base' ? 'bases' : 'variants';
    const path = `${folder}/${recordId}.${ext}`;

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
    if (!name) {
      showAlert(t('teacher.assignment.incompleteTitle'), t('admin.content.charNameRequired'));
      return;
    }
    if (type === 'variant' && !baseId) {
      showAlert(t('teacher.assignment.incompleteTitle'), t('admin.content.charBaseRequired'));
      return;
    }
    setSubmitting(true);

    try {
      const table = type === 'base' ? 'characters_base' : 'character_extras';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const recordId = isNew ? slug : id!;

      let assetUrl = `placeholder://${recordId}`;
      if (assetUri) {
        const url = await uploadAsset(recordId);
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
        basePayload.base_character_id = baseId;
        basePayload.description = description;
        basePayload.rarity = rarity;
      }

      const result = isNew
        ? await supabase.from(table).insert(basePayload).select().single()
        : await supabase.from(table).update(basePayload).eq('id', id).select().single();
      if (result.error) throw result.error;

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
        {type === 'base' ? t('admin.content.addBaseChar') : t('admin.content.addVariant')}
        {' '}{isNew ? t('admin.content.newSuffix') : t('admin.content.editSuffix')}
      </Text>

      <ScrollView>
        <Input label={t('admin.content.nameLabel')} value={name} onChangeText={setName} required />
        <Input label={t('admin.content.descLabel')} value={description} onChangeText={setDescription} multiline />
        <Input label={t('admin.content.unlockXpLabel')} value={unlockXp} onChangeText={setUnlockXp} keyboardType="numeric" />

        {type === 'variant' && (
          <>
            <Text style={styles.label}>{t('admin.content.baseCharLabel')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing[3] }}>
              {bases.map((b) => (
                <Pressable key={b.id} onPress={() => setBaseId(b.id)}
                           style={[styles.rChip, baseId === b.id && styles.rChipActive]}>
                  <Text style={[styles.rChipText, baseId === b.id && styles.rChipTextActive]}>{b.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t('admin.content.rarityLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing[3] }}>
              {(['common','rare','legendary'] as const).map((r) => (
                <Pressable key={r} onPress={() => setRarity(r)}
                           style={[styles.rChip, rarity === r && styles.rChipActive]}>
                  <Text style={[styles.rChipText, rarity === r && styles.rChipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

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
