import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme, MIN_TOUCH_TARGET } from '@/theme';
import { WordImage } from '@/components';
import type { Question } from '@/domain';

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
}

/**
 * Builder question (used by `hece-birlestir`).
 *
 * Mechanic:
 *   - Top: assembled output (so far)
 *   - Middle: tappable shuffled syllable tiles
 *   - Once the assembly equals the word's syllable count, lock it in
 *   - "Geri" undoes the last tap
 *   - "Onayla" submits when full
 *
 * This component manages its OWN local state (which tiles have been used)
 * because the parent session machine just needs the final string.
 */
export function BuilderQuestion({ question, status, chosen, onChoose }: Props) {
  const targetSyllables = question.word.syl;            // ['ka','lem']
  const tiles           = question.options ?? [];       // shuffled syllables
  const expectedCount   = tiles.length;
  const revealed        = status === 'revealed';

  const [picked, setPicked] = useState<number[]>([]);   // tile indices, in order

  // Reset local state on a new question
  useEffect(() => {
    setPicked([]);
  }, [question.id]);

  // After reveal, force-show the chosen string
  const assembled = revealed && chosen
    ? chosen
    : picked.map((i) => tiles[i]).join('');

  const onTilePress = (idx: number) => {
    if (revealed) return;
    if (picked.includes(idx)) return;     // already used
    if (picked.length >= expectedCount) return;
    Haptics.selectionAsync().catch(() => {});
    const next = [...picked, idx];
    setPicked(next);
    if (next.length === expectedCount) {
      const candidate = next.map((i) => tiles[i]).join('');
      // Auto-submit when slots are full
      onChoose(candidate);
    }
  };

  const onUndo = () => {
    if (revealed) return;
    setPicked((p) => p.slice(0, -1));
  };

  // After reveal, color the assembly
  const isCorrect = revealed && chosen === question.correct;
  const assemblyColor = !revealed
    ? theme.colors.text.primary
    : isCorrect
      ? theme.colors.feedback.successText
      : theme.colors.feedback.errorText;

  return (
    <View style={styles.container}>
      {question.prompt ? <Text style={styles.prompt}>{question.prompt}</Text> : null}

      {/* Word image */}
      <View style={styles.wordImageWrap}>
        <WordImage word={question.word} size={120} />
      </View>

      {/* Assembly area */}
      <View style={styles.assemblyRow}>
        <Text style={[styles.assembly, { color: assemblyColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {assembled || '\u00A0'}
        </Text>
        {!revealed && picked.length > 0 ? (
          <Pressable onPress={onUndo} hitSlop={8} style={styles.undoBtn}
                     accessibilityRole="button" accessibilityLabel="Geri">
            <Ionicons name="arrow-undo" size={22} color={theme.colors.text.muted} />
          </Pressable>
        ) : null}
      </View>

      {revealed && !isCorrect ? (
        <Text style={styles.correctReveal}>
          Doğrusu: <Text style={styles.correctRevealBold}>{question.correct}</Text>
        </Text>
      ) : null}

      {/* Tile bank */}
      <View style={styles.bank}>
        {tiles.map((s, i) => {
          const used = picked.includes(i);
          return (
            <Pressable
              key={`${s}-${i}`}
              onPress={() => onTilePress(i)}
              accessibilityRole="button"
              accessibilityLabel={s}
              accessibilityState={{ disabled: used || revealed }}
              style={[
                styles.tile,
                used && styles.tileUsed,
                revealed && !used && styles.tileMuted,
              ]}
            >
              <Text style={[styles.tileText, used && styles.tileTextUsed]}>{s}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  prompt: {
    ...theme.typography.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  wordImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[5],
  },
  emojiCard: {
    width:  120,
    height: 120,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[5],
    ...theme.shadow.md,
  },
  emoji: { fontSize: 72 },
  assemblyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border.subtle,
    borderStyle: 'dashed',
    minWidth: '60%',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  assembly: {
    ...theme.typography.h2,
    fontSize: 36,
    letterSpacing: 1,
  },
  undoBtn: {
    marginLeft: theme.spacing[3],
    padding: theme.spacing[2],
  },
  correctReveal: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[3],
  },
  correctRevealBold: {
    color: theme.colors.feedback.successText,
    fontFamily: theme.typography.h3.fontFamily,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  tile: {
    minWidth: 72,
    minHeight: MIN_TOUCH_TARGET + 8,
    paddingHorizontal: theme.spacing[5],
    paddingVertical:   theme.spacing[3],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  tileUsed: {
    backgroundColor: theme.colors.background.tertiary,
    opacity: 0.4,
  },
  tileMuted: {
    opacity: 0.5,
  },
  tileText: {
    ...theme.typography.h3,
    fontSize: 28,
    color: theme.colors.text.primary,
  },
  tileTextUsed: {
    color: theme.colors.text.muted,
  },
});
