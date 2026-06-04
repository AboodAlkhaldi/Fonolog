import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { WordImage } from '@/components';
import { HIDE_PROMPT_TEXT_MODULES } from '@/domain';
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
        <Text style={styles.syllableText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
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
        <Text style={styles.syllableText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          <Text style={styles.dim}>___</Text>{lastSyl}
        </Text>
      </View>
    );
  }

  // uyakUretim → the MIRROR of uyak: the child READS the target word (text) and
  // picks the rhyming PICTURE from the image options below. So the prompt visual
  // is the word as text, with no image (the images live in the answer tiles).
  if (moduleId === 'uyakUretim') {
    return (
      <View style={styles.center}>
        <Text style={styles.refWord} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
          {question.word.word}
        </Text>
      </View>
    );
  }

  // uyak → reference image + speaker. The word itself is hidden (it's the target
  // the child has to find a rhyme for) — they hear it via the speaker + see the
  // picture, then pick the rhyming word from text options.
  if (moduleId === 'uyak') {
    const hideWord = HIDE_PROMPT_TEXT_MODULES.has(moduleId);
    return (
      <View style={styles.center}>
        {!hideWord && (
          <Text style={styles.refWord} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {question.word.word}
          </Text>
        )}
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
