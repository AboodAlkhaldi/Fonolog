import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '@/theme';

export type CharacterAssetType = 'svg' | 'png' | 'lottie';

export interface CharacterLayer {
  id:         string;
  asset_url:  string;
  asset_type: CharacterAssetType;
}

interface Props {
  /** The base character (the animal). */
  base?:    CharacterLayer | null;
  /**
   * If set, this variant REPLACES the base render. Variants are different
   * visual versions of the SAME base (e.g. lion → king lion). They are not
   * overlaid on top of the base.
   */
  variant?: CharacterLayer | null;
  size?:    number;
  /** Fallback emoji if no asset or asset fails to load */
  fallbackEmoji?: string;
}

function emojiFromUrl(url?: string, fallback = '🦁') {
  if (!url || !url.startsWith('placeholder://')) return fallback;
  const extracted = url.slice('placeholder://'.length);
  return extracted || fallback;
}

const isPlaceholder = (u?: string) => !u || u.startsWith('placeholder://');

export function CharacterRenderer({
  base, variant, size = 140, fallbackEmoji = '🦁',
}: Props) {
  // Variant wins over base when present (it's the upgraded look of the same animal).
  const shown = variant ?? base ?? null;

  if (!shown || isPlaceholder(shown.asset_url)) {
    const emoji = shown ? emojiFromUrl(shown.asset_url, fallbackEmoji) : fallbackEmoji;
    return (
      <View style={[styles.placeholderWrap, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.placeholderEmoji, { fontSize: size * 0.5 }]}>
          {emoji}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.stack, { width: size, height: size }]}>
      <Image
        source={{ uri: shown.asset_url }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack:  { position: 'relative' },
  placeholderWrap: {
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  placeholderEmoji: { textAlign: 'center' },
});
