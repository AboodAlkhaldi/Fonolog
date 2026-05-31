import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { WordImage } from '@/components';
import type { Question } from '@/domain';

/**
 * Renders the visual prompt above the answer tiles.
 * Different modules need different prompt visuals:
 *
 *   tani            → word image, "Bu nedir?"
 *   tamamla         → word image + "ka___" syllable hint below
 *   tamamlaBastan   → word image + "___ya" syllable hint below
 *   uyak            → reference word as text + word image
 *   kategori        → word image; category text is implied by question.prompt
 *
 * Falls back to a plain word image for other modules.
 */
export function QuestionPrompt({
  moduleId,
  question,
}: { moduleId: string; question: Question }) {
  // tani → big image card. The child sees the picture and picks the name.
  if (moduleId === 'tani') {
    return <WordImage word={question.word} size={140} />;
  }

  // tamamla → image + "ka___" syllable hint underneath
  if (moduleId === 'tamamla') {
    const syllable = question.word.syl[0];
    return (
      <View style={styles.center}>
        <WordImage word={question.word} size={140} />
        <Text style={styles.syllableText}>
          {syllable}<Text style={styles.dim}>___</Text>
        </Text>
      </View>
    );
  }

  // tamamlaBastan → image + "___ya" syllable hint underneath
  if (moduleId === 'tamamlaBastan') {
    const lastSyl = question.word.syl[question.word.syl.length - 1];
    return (
      <View style={styles.center}>
        <WordImage word={question.word} size={140} />
        <Text style={styles.syllableText}>
          <Text style={styles.dim}>___</Text>{lastSyl}
        </Text>
      </View>
    );
  }

  // uyak / uyakUretim → reference word styled prominently with image
  if (moduleId === 'uyak' || moduleId === 'uyakUretim') {
    return (
      <View style={styles.center}>
        <Text style={styles.refWord}>{question.word.word}</Text>
        <WordImage word={question.word} size={120} />
      </View>
    );
  }

  // kategori → image card; category text is implied by question.prompt
  if (moduleId === 'kategori') {
    return <WordImage word={question.word} size={140} />;
  }

  // Default: image card
  return <WordImage word={question.word} size={140} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  syllableText: {
    ...theme.typography.numberHero,
    fontSize: 56,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[3],
  },
  refWord: {
    ...theme.typography.h1,
    fontSize: 48,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  dim: {
    color: theme.colors.text.muted,
  },
});
