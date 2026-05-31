import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { theme } from '@/theme';
import { Button, WordImage } from '@/components';
import { SpeakerButton } from './SpeakerButton';
import type { Question } from '@/domain';

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
}

export function PronunciationQuestion({ question, status, onChoose }: Props) {
  const audioUrl = (question.word as any).tts_url ?? (question.word as any).audio_url ?? null;

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>
        {question.prompt ?? 'Bu kelimeyi incele:'}
      </Text>

      <View style={styles.card}>
        <WordImage word={question.word} size={140} />
        <Text style={styles.word}>{question.word.word}</Text>
        <SpeakerButton audioUrl={audioUrl} size={56} style={{ marginTop: theme.spacing[3] }} />
      </View>

      {status !== 'revealed' ? (
        <Button
          label="Devam et"
          variant="cta"
          size="lg"
          onPress={() => onChoose(question.correct)}
          style={{ marginTop: theme.spacing[6] }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prompt: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[5],
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius:    theme.radius.xl,
    padding:         theme.spacing[6],
    alignItems:      'center',
    minWidth:        220,
    ...theme.shadow.md,
  },
  emoji: { fontSize: 80 },
  word: {
    ...theme.typography.h1,
    fontSize: 40,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[2],
  },
});
