import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  useAudioRecorder,
  RecordingPresets,
  requestMicPermission,
} from '@/audio/audio.service';
import { evaluatePronunciation, type PronunciationResult } from '@/audio/pronunciation.service';
import { theme, MIN_TOUCH_TARGET } from '@/theme';
import { t } from '@/i18n';

interface Props {
  expectedWord:   string;
  onResult:       (r: PronunciationResult) => void;
  disabled?:      boolean;
  style?:         ViewStyle;
  /** Maximum recording duration in ms (default 5000) */
  maxMs?:         number;
}

type Stage = 'idle' | 'recording' | 'evaluating' | 'denied';

/**
 * Press-and-hold mic. Records up to `maxMs`. On release, uploads and
 * calls `onResult` with the verdict.
 *
 * UX:
 *   idle → red ring grows on press → on release, uploads → verdict
 *   denied (no permission) → shows a hint instead
 */
export function MicButton({ expectedWord, onResult, disabled, style, maxMs = 5000 }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

  // Auto-stop after maxMs
  useEffect(() => {
    if (stage !== 'recording') return;
    const id = setTimeout(() => stop(), maxMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const start = async () => {
    if (disabled || stage !== 'idle') return;
    setError(null);
    const ok = await requestMicPermission();
    if (!ok) {
      setStage('denied');
      return;
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStage('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {
      console.warn('[mic] start failed', e);
      setError('Mikrofon başlatılamadı');
      setStage('idle');
    }
  };

  const stop = async () => {
    if (stage !== 'recording') return;
    setStage('evaluating');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('no recording uri');
      const result = await evaluatePronunciation(uri, expectedWord);
      onResult(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Değerlendirme başarısız';
      setError(msg);
    } finally {
      setStage('idle');
    }
  };

  if (stage === 'denied') {
    return (
      <View style={[styles.deniedBox, style]}>
        <Ionicons name="mic-off-outline" size={20} color={theme.colors.text.muted} />
        <Text style={styles.deniedText}>Mikrofon erişimi reddedildi. Ayarlardan açabilirsin.</Text>
      </View>
    );
  }

  const isBusy = stage === 'evaluating';
  const isRec  = stage === 'recording';

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPressIn={start}
        onPressOut={stop}
        disabled={disabled || isBusy}
        accessibilityRole="button"
        accessibilityLabel="Telaffuz et"
        style={[
          styles.btn,
          isRec && styles.btnRecording,
          (disabled || isBusy) && styles.btnDisabled,
        ]}
      >
        {isBusy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name={isRec ? 'mic' : 'mic-outline'} size={32} color="#fff" />
        )}
      </Pressable>
      <Text style={styles.hint}>
        {isRec     ? 'Bırakınca dur' :
         isBusy    ? 'Değerlendiriliyor...' :
                     'Basılı tut, kelimeyi söyle'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const SIZE = MIN_TOUCH_TARGET * 1.5;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  btn: {
    width: SIZE, height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.colors.action.cta,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadow.md,
  },
  btnRecording: {
    backgroundColor: theme.colors.feedback.error,
    transform: [{ scale: 1.1 }],
  },
  btnDisabled: { opacity: 0.5 },
  hint: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.feedback.errorText,
    marginTop: theme.spacing[1],
  },
  deniedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
  },
  deniedText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
    marginLeft: theme.spacing[2],
    flex: 1,
  },
});
