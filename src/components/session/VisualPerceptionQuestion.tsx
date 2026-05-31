/**
 * VisualPerceptionQuestion — Görsel Algı live grid.
 *
 * Spec (matches fonoloji-atölyesi (2).html, GorselAlgiEkrani):
 *   - 9-cell 3×3 grid, each cell holds a random word
 *   - One non-flashing cell rotates to a fresh random word every 700ms
 *   - Tap correct → 380ms green flash, replace cell, bulunan++
 *   - Tap wrong → 380ms red flash, replace cell, yanlis++
 *   - Bias toward target category: 40% before 7 correct found, 25% after
 *   - End at 15 correct
 *
 * Hand back to useSession.completeMemorySession with final counts so the
 * standard result/finish flow persists the run.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '@/theme';
import { WordImage } from '@/components';
import type { Question } from '@/domain';
import type { Word } from '@/domain/types/word.types';
import { useSession } from '@/store/session';

const GRID_SIZE      = 9;
const TICK_MS        = 700;
const FLASH_MS       = 380;
const WIN_AT         = 15;
const BIAS_EARLY     = 0.40;  // chance to draw from target category before 7 correct
const BIAS_LATE      = 0.25;  // chance after 7 correct (gets harder)
const BIAS_THRESHOLD = 7;

const MODULE_COLOR = '#7C3AED';   // matches the registry color for gorselAlgi

interface Cell {
  id:    string;
  word:  Word;
  flash: 'correct' | 'wrong' | null;
}

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
}

function nextId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function VisualPerceptionQuestion({ question }: Props) {
  const completeMemorySession = useSession((s) => s.completeMemorySession);

  const pool:           Word[] = (question.extra?.pool as Word[] | undefined) ?? [];
  const targetCategory: string = (question.extra?.targetCategory as string | undefined) ?? '';
  const targetPool = pool.filter((w) => w.kat === targetCategory);
  const otherPool  = pool.filter((w) => w.kat !== targetCategory);

  const correctRef = useRef(0);
  const wrongRef   = useRef(0);
  const completedRef = useRef(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount,   setWrongCount]   = useState(0);

  const pickCellWord = (currentCorrect: number): Word => {
    const bias = currentCorrect < BIAS_THRESHOLD ? BIAS_EARLY : BIAS_LATE;
    const fromTarget = Math.random() < bias && targetPool.length > 0;
    const src = fromTarget ? targetPool : (otherPool.length > 0 ? otherPool : pool);
    return src[Math.floor(Math.random() * src.length)];
  };

  const makeCell = (currentCorrect: number): Cell => ({
    id:    nextId(),
    word:  pickCellWord(currentCorrect),
    flash: null,
  });

  const [grid, setGrid] = useState<Cell[]>(() =>
    Array.from({ length: GRID_SIZE }, () => makeCell(0)),
  );

  // ── Tick: every 700ms, replace one random non-flashing cell ──
  useEffect(() => {
    if (completedRef.current) return;
    const iv = setInterval(() => {
      setGrid((g) => {
        const candidates = g
          .map((c, i) => ({ i, c }))
          .filter((x) => x.c.flash === null);
        if (candidates.length === 0) return g;
        const pickIdx = candidates[Math.floor(Math.random() * candidates.length)].i;
        const next = g.slice();
        next[pickIdx] = makeCell(correctRef.current);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTap = (idx: number) => {
    if (completedRef.current) return;
    const cell = grid[idx];
    if (!cell || cell.flash) return;

    const isCorrect = cell.word.kat === targetCategory;
    Haptics.notificationAsync(
      isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});

    setGrid((g) => {
      const next = g.slice();
      next[idx] = { ...cell, flash: isCorrect ? 'correct' : 'wrong' };
      return next;
    });

    if (isCorrect) {
      correctRef.current += 1;
      setCorrectCount(correctRef.current);
    } else {
      wrongRef.current += 1;
      setWrongCount(wrongRef.current);
    }

    setTimeout(() => {
      setGrid((g) => {
        const next = g.slice();
        next[idx] = makeCell(correctRef.current);
        return next;
      });

      if (correctRef.current >= WIN_AT && !completedRef.current) {
        completedRef.current = true;
        completeMemorySession({
          correct:  correctRef.current,
          wrong:    wrongRef.current,
          total:    correctRef.current + wrongRef.current,
          maxLevel: 1,
        });
      }
    }, FLASH_MS);
  };

  const targetEmoji  = (question.extra?.targetEmoji  as string | undefined) ?? '🎯';
  const targetSuffix = (question.extra?.targetSuffix as string | undefined) ?? 'nesneyi';
  const pct = Math.round((correctCount / WIN_AT) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={[styles.topMeta, { color: MODULE_COLOR }]}>
          {correctCount} / {WIN_AT}
        </Text>
        <Text style={styles.topWrong}>✗ {wrongCount}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: MODULE_COLOR }]} />
      </View>

      <View style={styles.promptBox}>
        <Text style={[styles.promptText, { color: MODULE_COLOR }]}>
          {targetEmoji} {targetCategory} — {targetSuffix} dokun!
        </Text>
      </View>

      <View style={styles.grid}>
        {grid.map((cell, i) => {
          const bg =
            cell.flash === 'correct' ? theme.colors.feedback.successSubtle
          : cell.flash === 'wrong'   ? theme.colors.feedback.errorSubtle
          :                            theme.colors.background.secondary;
          const bd =
            cell.flash === 'correct' ? theme.colors.feedback.success
          : cell.flash === 'wrong'   ? theme.colors.feedback.error
          :                            theme.colors.border.subtle;

          return (
            <Pressable
              key={cell.id}
              onPress={() => onTap(i)}
              disabled={!!cell.flash}
              style={[styles.cell, { backgroundColor: bg, borderColor: bd }]}
              accessibilityRole="button"
              accessibilityLabel={cell.word.word}
            >
              <WordImage word={cell.word} size={62} bg={'transparent'} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: theme.spacing[2] },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  topMeta: {
    ...theme.typography.bodySmall,
    fontWeight: '800',
  },
  topWrong: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.feedback.errorText,
  },

  progressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: theme.colors.background.tertiary,
    overflow: 'hidden',
    marginBottom: theme.spacing[3],
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },

  promptBox: {
    backgroundColor: theme.colors.background.secondary,
    borderColor: theme.colors.border.subtle,
    borderWidth: 1,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing[3],
    ...theme.shadow.sm,
  },
  promptText: {
    ...theme.typography.bodyLarge,
    fontWeight: '800',
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
});
