import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { theme } from '@/theme';
import { Button, WordImage } from '@/components';
import { SpeakerButton } from './SpeakerButton';
import type { Question } from '@/domain';

const SYLLABLE_COLORS = ['#F5A623', '#42A5F5', '#AB47BC', '#26C6DA', '#EC407A'];

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
}

export function ExploreCard({ question, status, onChoose }: Props) {
  const audioUrl   = (question.word as any).tts_url ?? (question.word as any).audio_url ?? null;
  const syllables  = (question.extra?.syllables as string[] | undefined) ?? [question.word.word];
  const firstLetter = (question.extra?.firstLetter as string | undefined) ?? question.word.word[0] ?? '';
  const lastLetter  = (question.extra?.lastLetter  as string | undefined) ?? question.word.word[question.word.word.length - 1] ?? '';

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{question.prompt ?? 'Dinle ve keşfet!'}</Text>

      <View style={styles.imageWrap}>
        <WordImage word={question.word} size={140} />
      </View>

      {/* Syllable blocks — wrap to multiple rows so a long (or multi-word)
          word never runs off the screen edge. */}
      <View style={styles.syllableRow}>
        {syllables.map((syl, i) => (
          <View
            key={i}
            style={[styles.sylBlock, { backgroundColor: SYLLABLE_COLORS[i % SYLLABLE_COLORS.length] }]}
          >
            <Text style={styles.sylText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{syl}</Text>
          </View>
        ))}
      </View>

      {/* First / last letter + speaker */}
      <View style={styles.infoRow}>
        <View style={styles.letterBadge}>
          <Text style={styles.letterLabel}>İlk harf</Text>
          <Text style={styles.letterValue}>{firstLetter.toLocaleUpperCase('tr')}</Text>
        </View>

        <SpeakerButton audioUrl={audioUrl} size={56} />

        <View style={styles.letterBadge}>
          <Text style={styles.letterLabel}>Son harf</Text>
          <Text style={styles.letterValue}>{lastLetter.toLocaleUpperCase('tr')}</Text>
        </View>
      </View>

      {status !== 'revealed' ? (
        <Button
          label="Devam et"
          variant="cta"
          size="lg"
          onPress={() => onChoose('__explore__')}
          style={{ marginTop: theme.spacing[5] }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  imageWrap: {
    marginBottom: theme.spacing[4],
  },
  syllableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[2],
  },
  sylBlock: {
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    maxWidth: '90%',
  },
  sylText: {
    ...theme.typography.h2,
    color: theme.colors.text.inverse,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[6],
    marginBottom: theme.spacing[2],
  },
  letterBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[3],
    minWidth: 68,
    ...theme.shadow.sm,
  },
  letterLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[1],
  },
  letterValue: {
    ...theme.typography.h2,
    color: theme.colors.brand.secondary,
    fontWeight: '800',
  },
});
