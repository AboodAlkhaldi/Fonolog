import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import type { Question } from '@/domain';

/**
 * Renders the visual prompt above the answer tiles.
 * Different modules need different prompt visuals:
 *
 *   tani            → emoji card of the word, "Bu nedir?"
 *   tamamla         → first syllable, "ka___"
 *   uyak            → reference word, "Bu kelimeyle hangisi kafiye?"
 *   kategori        → category emoji + "Hangisi … grubundan?"
 *
 * Falls back to a plain emoji card for other modules.
 */
export function QuestionPrompt({
  moduleId,
  question,
}: { moduleId: string; question: Question }) {
  // tani → big emoji card. The child sees the picture and picks the name.
  if (moduleId === 'tani') {
    return <EmojiCard emoji={question.word.emoji} />;
  }

  // tamamla → "ka___" (show first syllable, blank the rest)
  if (moduleId === 'tamamla') {
    const syllable = question.word.syl[0];
    return (
      <View style={styles.center}>
        <Text style={styles.syllableText}>
          {syllable}<Text style={styles.dim}>___</Text>
        </Text>
      </View>
    );
  }

  // tamamlaBastan → "___ya" (show last syllable, blank the start — answer is the missing head)
  if (moduleId === 'tamamlaBastan') {
    const lastSyl = question.word.syl[question.word.syl.length - 1];
    return (
      <View style={styles.center}>
        <Text style={styles.syllableText}>
          <Text style={styles.dim}>___</Text>{lastSyl}
        </Text>
      </View>
    );
  }

  // uyak → reference word styled prominently
  if (moduleId === 'uyak' || moduleId === 'uyakUretim') {
    return (
      <View style={styles.center}>
        <Text style={styles.refWord}>{question.word.word}</Text>
        <Text style={styles.dim}>{question.word.emoji}</Text>
      </View>
    );
  }

  // kategori → emoji card; category text is implied by question.prompt
  if (moduleId === 'kategori') {
    return <EmojiCard emoji={question.word.emoji} />;
  }

  // Default: emoji card
  return <EmojiCard emoji={question.word.emoji} />;
}

function EmojiCard({ emoji }: { emoji: string }) {
  return (
    <View style={styles.emojiCard}>
      <Text style={styles.emojiText}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  emojiCard: {
    width:  140,
    height: 140,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.md,
  },
  emojiText: { fontSize: 88 },
  syllableText: {
    ...theme.typography.numberHero,
    fontSize: 72,
    color: theme.colors.text.primary,
  },
  refWord: {
    ...theme.typography.h1,
    fontSize: 48,
    color: theme.colors.text.primary,
  },
  dim: {
    color: theme.colors.text.muted,
  },
});
