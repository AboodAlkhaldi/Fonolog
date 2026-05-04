import React, { useState } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { playWordAudio } from '@/audio/audio.service';
import { theme, MIN_TOUCH_TARGET } from '@/theme';

interface Props {
  audioUrl: string | null | undefined;
  size?:    number;
  style?:   ViewStyle;
}

/** Tap to play a word's TTS. Disabled with muted color when no URL. */
export function SpeakerButton({ audioUrl, size = MIN_TOUCH_TARGET, style }: Props) {
  const [playing, setPlaying] = useState(false);
  const enabled = !!audioUrl;

  const onPress = async () => {
    if (!enabled || playing) return;
    Haptics.selectionAsync().catch(() => {});
    setPlaying(true);
    try {
      await playWordAudio(audioUrl);
    } finally {
      // expo-audio doesn't reliably fire onEnd synchronously; gate via timeout
      setTimeout(() => setPlaying(false), 1500);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel="Sesli oku"
      style={[
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        !enabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons
        name={playing ? 'volume-high' : 'volume-medium-outline'}
        size={Math.round(size * 0.5)}
        color={enabled ? theme.colors.text.primary : theme.colors.text.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: theme.colors.brand.primary,
    alignItems:     'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  disabled: {
    backgroundColor: theme.colors.background.tertiary,
    opacity: 0.7,
  },
});
