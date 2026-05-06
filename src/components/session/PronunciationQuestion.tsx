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

type VerdictLabel = 'correct' | 'close' | 'wrong';

function getVerdictLabel(r: PronunciationResult): VerdictLabel {
  if (r.verdict === 'correct') return 'correct';
  if (r.verdict === 'close')   return 'close';
  return 'wrong';
}

const VERDICT_CONFIG: Record<VerdictLabel, { text: string; bg: string; border: string; textColor: string; icon: string }> = {
  correct: {
    text:      'Harika! Doğru söyledin.',
    bg:        theme.colors.feedback.successSubtle,
    border:    theme.colors.feedback.success,
    textColor: theme.colors.feedback.successText,
    icon:      '✅',
  },
  close: {
    text:      'Yakın! Biraz daha dene.',
    bg:        theme.colors.feedback.warningSubtle,
    border:    theme.colors.feedback.warning,
    textColor: theme.colors.text.primary,
    icon:      '🎯',
  },
  wrong: {
    text:      'Tekrar dene!',
    bg:        theme.colors.feedback.errorSubtle,
    border:    theme.colors.feedback.error,
    textColor: theme.colors.feedback.errorText,
    icon:      '🔄',
  },
};

export function PronunciationQuestion({ question, status, chosen: _chosen, onChoose }: Props) {
  const revealed = status === 'revealed';
  const audioUrl = (question.word as any).tts_url ?? (question.word as any).audio_url ?? null;
  const [verdictLabel, setVerdictLabel] = useState<VerdictLabel | null>(null);

  const handleResult = (r: PronunciationResult) => {
    setVerdictLabel(getVerdictLabel(r));
    const choice = r.verdict === 'wrong' ? '__wrong__' : question.correct;
    onChoose(choice);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>
        {question.prompt ?? 'Bu kelimeyi söyle:'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.emoji}>{question.word.emoji}</Text>
        <Text style={styles.word}>{question.word.word}</Text>
        <SpeakerButton audioUrl={audioUrl} size={56} style={{ marginTop: theme.spacing[3] }} />
      </View>

      {revealed && verdictLabel !== null ? (
        <View style={[
          styles.verdictBox,
          {
            backgroundColor: VERDICT_CONFIG[verdictLabel].bg,
            borderColor:     VERDICT_CONFIG[verdictLabel].border,
          },
        ]}>
          <Text style={styles.verdictIcon}>{VERDICT_CONFIG[verdictLabel].icon}</Text>
          <Text style={[styles.verdictText, { color: VERDICT_CONFIG[verdictLabel].textColor }]}>
            {VERDICT_CONFIG[verdictLabel].text}
          </Text>
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
  verdictBox: {
    marginTop:    theme.spacing[5],
    paddingVertical:   theme.spacing[4],
    paddingHorizontal: theme.spacing[5],
    borderRadius: theme.radius.xl,
    borderWidth:  2,
    alignItems:   'center',
    minWidth:     220,
    gap:          theme.spacing[2],
  },
  verdictIcon: {
    fontSize: 36,
  },
  verdictText: {
    ...theme.typography.h4,
    textAlign: 'center',
  },
});
