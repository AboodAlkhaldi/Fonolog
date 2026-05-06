import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { theme } from '@/theme';
import { Button } from '@/components';
import { SpeakerButton } from './SpeakerButton';
import { MicButton }     from './MicButton';
import type { Question } from '@/domain';
import type { PronunciationResult } from '@/audio/pronunciation.service';

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
}

/**
 * Pronunciation challenge.
 *  1. Show the word + emoji + speaker (so child can hear it first)
 *  2. Press-and-hold mic, say the word
 *  3. Server returns verdict (correct/close/wrong)
 *  4. We forward the correct/wrong result to onChoose so the session machine
 *     records it just like a multiple-choice answer.
 */
export function PronunciationQuestion({ question, status, chosen, onChoose }: Props) {
  const revealed = status === 'revealed';
  const audioUrl = (question.word as any).tts_url ?? (question.word as any).audio_url ?? null;
  const [transcript, setTranscript] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);

  const handleResult = (r: PronunciationResult) => {
    setTranscript(r.transcript);
    setSimilarity(r.similarity);
    // Map verdict to a chosen answer: correct or close → mark as correct
    const choice = r.verdict === 'wrong' ? '__wrong__' : question.correct;
    onChoose(choice);
  };

  return (
    <View style={styles.container}>
      {question.prompt ? (
        <Text style={styles.prompt}>{question.prompt}</Text>
      ) : (
        <Text style={styles.prompt}>Bu kelimeyi söyle:</Text>
      )}

      <View style={styles.card}>
        <Text style={styles.emoji}>{question.word.emoji}</Text>
        <Text style={styles.word}>{question.word.word}</Text>
        <SpeakerButton audioUrl={audioUrl} size={56} style={{ marginTop: theme.spacing[3] }} />
      </View>

      {revealed && transcript !== null ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackLabel}>Duyduğum:</Text>
          <Text style={styles.feedbackTranscript}>"{transcript}"</Text>
          {similarity !== null ? (
            <Text style={styles.feedbackScore}>
              Benzerlik: {Math.round(similarity * 100)}%
            </Text>
          ) : null}
        </View>
      ) : null}

      {!revealed ? (
        <MicButton
          expectedWord={question.correct}
          onResult={handleResult}
          style={{ marginTop: theme.spacing[6] }}
        />
      ) : null}

      {!revealed ? (
        <Button
          label="Atla"
          variant="ghost"
          size="md"
          onPress={() => onChoose('__skip__')}
          style={{ marginTop: theme.spacing[5] }}
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
  feedbackBox: {
    marginTop: theme.spacing[5],
    padding: theme.spacing[4],
    backgroundColor: theme.colors.feedback.infoSubtle,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    minWidth: 220,
  },
  feedbackLabel: { ...theme.typography.caption, color: theme.colors.text.muted },
  feedbackTranscript: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[1],
  },
  feedbackScore: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[2],
  },
});
