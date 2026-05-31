import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Keyboard,
} from 'react-native';

import { theme } from '@/theme';
import { Button, WordImage } from '@/components';
import { SpeakerButton } from './SpeakerButton';
import type { Question } from '@/domain';

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
  hidePromptText?: boolean;
}

export function KeyboardPhonemeQuestion({ question, status, onChoose, hidePromptText = false }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput>(null);
  const audioUrl = (question.word as any).tts_url ?? (question.word as any).audio_url ?? null;
  const mode = (question.extra?.inputMode as 'suffix' | 'prefix') ?? 'suffix';
  const revealed = status === 'revealed';

  // Reset typed text whenever the question changes so leftover input
  // from the previous word doesn't leak into the next one.
  useEffect(() => { setInput(''); }, [question.id]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    Keyboard.dismiss();
    onChoose(input.trim().toLocaleLowerCase('tr'));
  };

  return (
    <View style={styles.container}>
      {!hidePromptText && question.prompt ? (
        <Text style={styles.prompt}>{question.prompt}</Text>
      ) : null}

      <View style={styles.card}>
        <WordImage word={question.word} size={120} />
        <Text style={styles.word}>{question.word.word}</Text>
        <SpeakerButton audioUrl={audioUrl} size={48} style={{ marginTop: theme.spacing[3] }} />
      </View>

      {!revealed ? (
        <View style={styles.inputSection}>
          {/* Visual: --[input] or [input]-- */}
          <View style={styles.inputRow}>
            {mode === 'suffix' && (
              <View style={styles.dashBox}>
                <Text style={styles.dashText}>— —</Text>
              </View>
            )}
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="yaz..."
              placeholderTextColor={theme.colors.text.muted}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!revealed}
            />
            {mode === 'prefix' && (
              <View style={styles.dashBox}>
                <Text style={styles.dashText}>— —</Text>
              </View>
            )}
          </View>

          <Button
            label="Gönder"
            variant="cta"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            style={{ marginTop: theme.spacing[4] }}
          />
        </View>
      ) : (
        <View style={styles.revealedBox}>
          <Text style={styles.revealedLabel}>Doğru cevap:</Text>
          <Text style={styles.revealedAnswer}>{question.correct}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prompt: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[5],
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius:    theme.radius.xl,
    padding:         theme.spacing[5],
    alignItems:      'center',
    minWidth:        200,
    ...theme.shadow.md,
  },
  emoji: { fontSize: 72 },
  word: {
    ...theme.typography.h1,
    fontSize: 36,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[2],
  },
  inputSection: { width: '100%', marginTop: theme.spacing[6] },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.brand.primary,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  dashBox: {
    backgroundColor: theme.colors.background.tertiary,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashText: {
    ...theme.typography.h3,
    color: theme.colors.text.muted,
    letterSpacing: 2,
  },
  textInput: {
    flex: 1,
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    minHeight: 56,
  },
  revealedBox: {
    marginTop: theme.spacing[5],
    backgroundColor: theme.colors.feedback.successSubtle,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.feedback.success,
  },
  revealedLabel: { ...theme.typography.bodySmall, color: theme.colors.text.muted },
  revealedAnswer: { ...theme.typography.h2, color: theme.colors.feedback.successText, marginTop: 4 },
});
