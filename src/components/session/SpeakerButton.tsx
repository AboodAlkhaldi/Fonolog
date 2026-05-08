import React, { useState, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { createAudioPlayer, playPreloaded, AudioPlayer } from '@/audio/audio.service';
import { theme, MIN_TOUCH_TARGET } from '@/theme';

interface Props {
  audioUrl: string | null | undefined;
  size?:    number;
  style?:   ViewStyle;
}

/** Tap to play a word's TTS. Preloads audio when the URL is known to eliminate buffering delay. */
export function SpeakerButton({ audioUrl, size = MIN_TOUCH_TARGET, style }: Props) {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const enabled = !!audioUrl;

  // Preload: create the player as soon as we have a URL so it buffers in the background.
  useEffect(() => {
    if (!audioUrl) {
      playerRef.current?.remove();
      playerRef.current = null;
      return;
    }
    const p = createAudioPlayer({ uri: audioUrl });
    playerRef.current = p;
    return () => {
      p.remove();
      playerRef.current = null;
    };
  }, [audioUrl]);

  const onPress = async () => {
    if (!enabled || playing) return;
    Haptics.selectionAsync().catch(() => {});
    setPlaying(true);
    try {
      if (playerRef.current) {
        await playPreloaded(playerRef.current);
      }
    } finally {
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
