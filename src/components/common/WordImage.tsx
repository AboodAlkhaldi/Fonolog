import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme';
import { peekSvg, loadSvg } from '@/lib/svg-cache';
import type { Word } from '@/domain';

interface Props {
  word:  Word;
  size?: number;
  /** Optional override for the container background. */
  bg?:   string;
}

/**
 * Renders a word's illustration. Replaces the per-device emoji rendering
 * that used to live in QuestionPrompt / Sequence / etc.
 *
 * Resolution order:
 *   1. word.image_url (svg — uploaded by admin to the word-images bucket;
 *      legacy png assets are still rendered for backwards compatibility)
 *   2. placeholder icon — neutral grey card with an image icon
 *
 * SVG handling: a malformed SVG used to throw an *uncaught* parse error inside
 * react-native-svg ("Expected >…") and crash the whole screen. We now fetch the
 * markup ourselves and validate it before handing it to the parser, so a
 * broken/garbage file degrades to the placeholder card instead of crashing.
 * SvgErrorBoundary is the final safety net for markup that passes the cheap
 * check but still trips the parser.
 */
export function WordImage({ word, size = 96, bg = theme.colors.background.secondary }: Props) {
  const dim = { width: size, height: size };

  const isSvg = !!word.image_url && (
    word.image_type === 'svg' ||
    word.image_url.toLowerCase().split('?')[0].endsWith('.svg')
  );

  // null = still loading, 'invalid' = fetch/validation failed, string = good xml.
  // Seed synchronously from the cache so an already-fetched/prewarmed SVG paints
  // on first render — no placeholder flicker (critical for the Görsel Algı grid
  // that rotates cells every 700ms).
  const [svgXml, setSvgXml] = useState<string | 'invalid' | null>(() =>
    isSvg && word.image_url ? (peekSvg(word.image_url) ?? null) : null,
  );

  useEffect(() => {
    if (!isSvg || !word.image_url) { setSvgXml(null); return; }
    const cached = peekSvg(word.image_url);
    if (cached !== undefined) { setSvgXml(cached); return; } // instant, no fetch
    let alive = true;
    setSvgXml(null);
    loadSvg(word.image_url).then((val) => { if (alive) setSvgXml(val); });
    return () => { alive = false; };
  }, [isSvg, word.image_url]);

  const placeholderIcon = (
    <Ionicons name="image-outline" size={size * 0.4} color={theme.colors.text.muted} />
  );
  const card = (children: React.ReactNode) => (
    <View style={[styles.card, dim, { backgroundColor: bg }]}>{children}</View>
  );

  if (word.image_url) {
    if (isSvg) {
      // Loading or invalid → quiet placeholder (never the raw parser).
      if (svgXml === null || svgXml === 'invalid') return card(placeholderIcon);
      return card(
        <SvgErrorBoundary fallback={placeholderIcon}>
          <SvgXml xml={svgXml} width={size * 0.8} height={size * 0.8} />
        </SvgErrorBoundary>,
      );
    }
    return card(
      <Image
        source={{ uri: word.image_url }}
        style={[styles.image, { width: size * 0.85, height: size * 0.85 }]}
        contentFit="contain"
        transition={150}
      />,
    );
  }

  return card(placeholderIcon);
}

/**
 * Final safety net: catches synchronous render errors from react-native-svg
 * when markup passes the cheap check but still trips the parser. Without this,
 * such an error would unmount the entire route.
 */
class SvgErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch() {
    // Swallow — a broken illustration must never crash the screen.
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  image: { borderRadius: theme.radius.lg },
});
