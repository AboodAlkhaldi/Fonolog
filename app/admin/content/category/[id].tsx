import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Input, Loading } from '@/components';
import { supabase } from '@/lib/supabase';
import { contentRepository } from '@/domain';
import { theme } from '@/theme';

export default function CategoryEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isNew && id) {
        const { data } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
        if (data) {
          setName(data.name);
          setEmoji(data.emoji ?? '');
          setDescription(data.description ?? '');
          setLevel(String(data.level ?? 0));
        }
      }
      setLoading(false);
    })();
  }, [id]);

  const onSubmit = async () => {
    if (!name) { Alert.alert('Eksik', 'Kategori adı zorunlu.'); return; }
    setSubmitting(true);

    const payload: any = {
      name,
      emoji: emoji || '📁',
      description,
      level: parseInt(level, 10) || 0,
      is_active: true,
    };

    const result = isNew
      ? await supabase.from('categories').insert(payload).select().single()
      : await supabase.from('categories').update(payload).eq('id', id).select().single();

    if (result.error) { Alert.alert('Hata', result.error.message); setSubmitting(false); return; }
    contentRepository.invalidate();
    router.back();
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title}>{isNew ? 'Yeni Kategori' : 'Kategori Düzenle'}</Text>

      <ScrollView>
        <Input label="Ad" value={name} onChangeText={setName} required />
        <Input label="Emoji" value={emoji} onChangeText={setEmoji} placeholder="ör: 🐱" />
        <Input label="Açıklama (isteğe bağlı)" value={description} onChangeText={setDescription} multiline />
        <Input label="Seviye (0 = ücretsiz, 1+ = premium)" value={level} onChangeText={setLevel}
               keyboardType="numeric" />

        <Button
          label={isNew ? 'Ekle' : 'Kaydet'}
          variant="cta" size="lg" fullWidth
          loading={submitting} onPress={onSubmit}
          style={{ marginTop: theme.spacing[5] }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
});
