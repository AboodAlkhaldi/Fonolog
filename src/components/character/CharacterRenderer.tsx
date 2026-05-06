import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '@/theme';

export type CharacterAssetType = 'svg' | 'png' | 'lottie';

export interface CharacterLayer {
  id:         string;        // for keying
  asset_url:  string;
  asset_type: CharacterAssetType;
}

interface Props {
  base?:    CharacterLayer | null;
  extras?:  Array<CharacterLayer | null | undefined>;
  size?:    number;
  /** Fallback emoji if no base or asset fails to load */
  fallbackEmoji?: string;
}

/**
 * Layered character composer.
 *
 * Stage 12 implementation:
 *   - PNG: <Image>
 *   - SVG: <SvgUri> from react-native-svg if installed; else falls back to PNG
 *   - Lottie: stub for v2 (currently treated as png)
 *   - placeholder:// urls trigger emoji fallback
 *
 * For MVP: we ship with `placeholder://` urls in the DB and emoji fallback
 * displays a colored circle with initial letter. Admin upload replaces them.
 */
export function CharacterRenderer({
  base, extras = [], size = 140, fallbackEmoji = '🦁',
}: Props) {
  const isPlaceholder = (u?: string) => !u || u.startsWith('placeholder://');

  // Until real assets are uploaded: render emoji fallback.
  if (!base || isPlaceholder(base.asset_url)) {
    return (
      <View style={[styles.placeholderWrap, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.placeholderEmoji, { fontSize: size * 0.55 }]}>
          {fallbackEmoji}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.stack, { width: size, height: size }]}>
      <AssetLayer layer={base} size={size} />
      {extras
        .filter((e): e is CharacterLayer => Boolean(e) && !isPlaceholder(e!.asset_url))
        .map((e) => (
          <View key={e.id} style={[styles.absoluteFill, { width: size, height: size }]}>
            <AssetLayer layer={e} size={size} />
          </View>
        ))}
    </View>
  );
}

function AssetLayer({ layer, size }: { layer: CharacterLayer; size: number }) {
  // For MVP: render PNG/SVG via <Image>. SVG works in <Image> on Android (not iOS),
  // so for cross-platform SVG you'd swap to react-native-svg's SvgUri.
  // Lottie stub: also rendered as image; replace with <LottieView> when assets ready.
  return (
    <Image
      source={{ uri: layer.asset_url }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  stack:  { position: 'relative' },
  absoluteFill: { position: 'absolute', top: 0, left: 0 },
  placeholderWrap: {
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  placeholderEmoji: {},
});
