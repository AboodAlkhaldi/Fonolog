import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '@/theme';
import type { Question } from '@/domain';
import type { Word } from '@/domain/types/word.types';

const FLASH_MS = 850;   // each word shown for ~0.85 s (matches HTML reference)
const PAUSE_MS = 300;

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
}

type SeqMode = 'word' | 'image';

export function SequenceQuestion({ question, status, onChoose }: Props) {
  const sequence: Word[] = (question.extra?.sequence as Word[] | undefined) ?? [question.word];
  const options:  Word[] = (question.extra?.options  as Word[] | undefined) ?? [question.word];
  const mode:     SeqMode = (question.extra?.mode as SeqMode | undefined) ?? 'image';

  const [phase,    setPhase]    = useState<'flash' | 'recall'>('flash');
  const [flashIdx, setFlashIdx] = useState(0);
  const [showWord, setShowWord] = useState(true);
  const [selected, setSelected] = useState<Word[]>([]);

  const revealed = status === 'revealed';

  // CRITICAL: reset ALL game state when the question changes. Otherwise the
  // previous round's flashIdx/selected/phase leaks into the new round and the
  // game freezes after the first sub-round.
  useEffect(() => {
    setPhase('flash');
    setFlashIdx(0);
    setShowWord(true);
    setSelected([]);
  }, [question.id]);

  // Flash phase: each flashIdx fires a show → pause → advance cycle.
  useEffect(() => {
    if (phase !== 'flash') return;
    let cancelled = false;
    setShowWord(true);
    const hideTimer = setTimeout(() => {
      if (cancelled) return;
      setShowWord(false);
      setTimeout(() => {
        if (cancelled) return;
        const next = flashIdx + 1;
        if (next >= sequence.length) {
          setPhase('recall');
        } else {
          setFlashIdx(next);
        }
      }, PAUSE_MS);
    }, FLASH_MS);
    return () => {
      cancelled = true;
      clearTimeout(hideTimer);
    };
  }, [phase, flashIdx, sequence.length]);

  const tapOption = (word: Word) => {
    if (revealed || selected.find(w => w.word === word.word)) return;
    Haptics.selectionAsync().catch(() => {});
    const next = [...selected, word];
    setSelected(next);
    if (next.length === sequence.length) {
      onChoose(next.map(w => w.word).join(','));
    }
  };

  // ── Flash phase UI ──────────────────────────────────────────────
  if (phase === 'flash') {
    const current = sequence[flashIdx];
    return (
      <View style={styles.container}>
        <Text style={styles.prompt}>Resimleri iyi izle!</Text>
        <View style={styles.progressDots}>
          {sequence.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < flashIdx && styles.dotDone,
                i === flashIdx && showWord && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.flashCard}>
          {showWord ? (
            <>
              <Text style={styles.flashEmoji}>{current.emoji}</Text>
              <Text style={styles.flashWord}>{current.word}</Text>
            </>
          ) : (
            <Text style={styles.flashDots}>•••</Text>
          )}
        </View>
      </View>
    );
  }

  // ── Recall phase UI ─────────────────────────────────────────────
  const correctWords = question.correct.split(',');

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>
        {mode === 'image'
          ? `${sequence.length} resmi gördüğün sırayla seç`
          : `Gördüğün ${sequence.length} resmin adını sırayla seç`}
      </Text>
      <Text style={styles.counter}>{selected.length} / {sequence.length}</Text>

      {/* Order slots */}
      <View style={styles.orderRow}>
        {sequence.map((_, i) => {
          const sel = selected[i];
          return (
            <View key={i} style={styles.orderSlot}>
              {sel ? (
                mode === 'image' ? (
                  <Text style={styles.orderEmoji}>{sel.emoji}</Text>
                ) : (
                  <Text style={styles.orderWord}>{sel.word}</Text>
                )
              ) : (
                <Text style={styles.orderEmpty}>{i + 1}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Option tiles — text-only for kelimeDizisi, emoji+label for sıralıHatırla */}
      <View style={styles.optGrid}>
        {options.map((word, i) => {
          const isPicked  = !!selected.find(w => w.word === word.word);
          const posChosen = selected.findIndex(w => w.word === word.word);

          let bg: string = theme.colors.background.secondary;
          let bd: string = theme.colors.border.subtle;

          if (isPicked && !revealed) {
            bg = theme.colors.brand.primary + '33';
            bd = theme.colors.brand.primary;
          }
          if (isPicked && revealed) {
            const correct = word.word === correctWords[posChosen];
            bg = correct ? theme.colors.feedback.successSubtle : theme.colors.feedback.errorSubtle;
            bd = correct ? theme.colors.feedback.success       : theme.colors.feedback.error;
          }

          return (
            <Pressable
              key={word.word + i}
              onPress={() => tapOption(word)}
              disabled={isPicked || revealed}
              accessibilityRole="button"
              accessibilityLabel={word.word}
              style={[styles.optTile, { backgroundColor: bg, borderColor: bd }]}
            >
              {mode === 'image' ? (
                <>
                  <Text style={styles.optEmoji}>{word.emoji}</Text>
                  <Text style={styles.optCaption}>{word.word}</Text>
                </>
              ) : (
                <Text style={styles.optWordOnly}>{word.word}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {!revealed && selected.length > 0 && selected.length < sequence.length ? (
        <Pressable onPress={() => setSelected([])} style={styles.resetBtn}>
          <Text style={styles.resetText}>Sıfırla</Text>
        </Pressable>
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
    marginBottom: theme.spacing[3],
  },
  counter: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing[3],
  },
  // ── Flash ──
  progressDots: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.border.subtle,
  },
  dotActive: { backgroundColor: theme.colors.brand.primary },
  dotDone:   { backgroundColor: theme.colors.feedback.success },
  flashCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[8],
    alignItems: 'center',
    minWidth: 200,
    minHeight: 180,
    justifyContent: 'center',
    ...theme.shadow.md,
  },
  flashEmoji: { fontSize: 80 },
  flashWord: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[2],
    letterSpacing: 2,
  },
  flashDots: {
    fontSize: 32,
    color: theme.colors.text.muted,
    letterSpacing: 8,
  },
  // ── Recall ──
  orderRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[5],
  },
  orderSlot: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderEmoji: { fontSize: 32 },
  orderWord:  { ...theme.typography.bodyMedium, color: theme.colors.text.primary },
  orderEmpty: { ...theme.typography.h3, color: theme.colors.text.muted },
  optGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing[3],
  },
  optTile: {
    width: 96,
    minHeight: 88,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  optEmoji:    { fontSize: 36 },
  optCaption:  { ...theme.typography.caption, color: theme.colors.text.secondary, marginTop: 2, fontWeight: '600' },
  optWordOnly: { ...theme.typography.h4, color: theme.colors.text.primary, letterSpacing: 1 },
  resetBtn: {
    marginTop: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[5],
  },
  resetText: {
    ...theme.typography.body,
    color: theme.colors.text.muted,
    textDecorationLine: 'underline',
  },
});
