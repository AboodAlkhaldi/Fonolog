/**
 * SequenceQuestion — adaptive memory loop for Kelime Dizisi and Sıralı Hatırla.
 *
 * Spec (matches fonoloji-atölyesi (2).html):
 *   - Start at level 3 items per round
 *   - Each round: flash items one by one (~850ms each), then ask the student
 *     to select them back in the same order
 *   - kelimeDizisi (mode='word')  → options are text tiles, student picks names
 *   - siraliHatirla  (mode='image') → options are image tiles, student picks images
 *   - +1 level on `streakNeeded` correct in a row (3 normally, 2 after an error)
 *   - -1 level on any wrong round (range clamped 2..7)
 *   - 30 total rounds, then we hand back to useSession.completeMemorySession
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '@/theme';
import { WordImage } from '@/components';
import type { Question } from '@/domain';
import type { Word } from '@/domain/types/word.types';
import { useSession } from '@/store/session';
import { t } from '@/i18n';

const FLASH_MS         = 850;
const PAUSE_MS         = 250;
const FEEDBACK_MS      = 1000;
const TOTAL_ROUNDS     = 30;
const START_LEVEL      = 3;
const MIN_LEVEL        = 2;
const MAX_LEVEL        = 7;
const STREAK_NORMAL    = 3;
const STREAK_POST_ERR  = 2;

type Mode = 'word' | 'image';

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Hex + alpha → rgba string (e.g. '#10B981' + 0.15 → 'rgba(16,185,129,0.15)') */
function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8)  & 255;
  const b = (n)       & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function SequenceQuestion({ question }: Props) {
  const completeMemorySession = useSession((s) => s.completeMemorySession);

  const pool: Word[] = (question.extra?.pool as Word[] | undefined) ?? [];
  const mode: Mode   = ((question.extra?.mode as Mode | undefined) ?? 'image');

  // Module color — siraliHatirla green, kelimeDizisi violet (matches registry).
  const moduleColor = mode === 'image' ? '#10B981' : '#8B5CF6';

  // ── adaptive state ──
  const [level,        setLevel]        = useState(START_LEVEL);
  const [streak,       setStreak]       = useState(0);
  const [postError,    setPostError]    = useState(false);
  const [maxLevel,     setMaxLevel]     = useState(START_LEVEL);
  const [totalDone,    setTotalDone]    = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount,   setWrongCount]   = useState(0);

  // ── per-round state ──
  const [dizi,     setDizi]     = useState<Word[]>([]);
  const [options,  setOptions]  = useState<Word[]>([]);
  const [phase,    setPhase]    = useState<'show' | 'select'>('show');
  const [flashIdx, setFlashIdx] = useState(0);
  const [showItem, setShowItem] = useState(true);
  const [selected, setSelected] = useState<Word[]>([]);
  const [verdict,  setVerdict]  = useState<'correct' | 'wrong' | null>(null);

  // Guards against repeated completion calls if the user is still mid-tap
  // when the 30th round resolves.
  const completedRef = useRef(false);

  // Build a new round from the pool at the current level.
  const startRound = (lvl: number) => {
    const targetLvl = Math.min(lvl, pool.length);
    const newDizi = shuffle(pool).slice(0, targetLvl);
    const distractors = shuffle(pool.filter(w => !newDizi.some(d => d.word === w.word)))
      .slice(0, Math.min(4, Math.max(2, targetLvl - 1)));
    setDizi(newDizi);
    setOptions(shuffle([...newDizi, ...distractors]));
    setFlashIdx(0);
    setShowItem(true);
    setSelected([]);
    setVerdict(null);
    setPhase('show');
  };

  useEffect(() => { startRound(START_LEVEL); }, []);

  // ── Flash phase: cycle through each dizi item ──
  useEffect(() => {
    if (phase !== 'show') return;
    if (flashIdx >= dizi.length) {
      const t = setTimeout(() => setPhase('select'), PAUSE_MS);
      return () => clearTimeout(t);
    }
    setShowItem(true);
    const hide = setTimeout(() => setShowItem(false), FLASH_MS);
    const next = setTimeout(() => setFlashIdx((i) => i + 1), FLASH_MS + PAUSE_MS);
    return () => { clearTimeout(hide); clearTimeout(next); };
  }, [phase, flashIdx, dizi.length]);

  // ── Resolve the current round and apply adaptive rules ──
  const resolveRound = (ok: boolean) => {
    setVerdict(ok ? 'correct' : 'wrong');
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});

    let newLevel = level;
    let newStreak = streak;
    let newPostError = postError;

    if (ok) {
      newStreak = streak + 1;
      const needed = postError ? STREAK_POST_ERR : STREAK_NORMAL;
      if (newStreak >= needed) {
        newLevel = Math.min(MAX_LEVEL, level + 1);
        newStreak = 0;
        newPostError = false;
      }
    } else {
      newLevel = Math.max(MIN_LEVEL, level - 1);
      newStreak = 0;
      newPostError = true;
    }

    const newTotal     = totalDone + 1;
    const newCorrect   = correctCount + (ok ? 1 : 0);
    const newWrong     = wrongCount   + (ok ? 0 : 1);
    const newMaxLevel  = Math.max(maxLevel, newLevel);

    const timer = setTimeout(() => {
      if (newTotal >= TOTAL_ROUNDS) {
        if (completedRef.current) return;
        completedRef.current = true;
        completeMemorySession({
          correct:  newCorrect,
          wrong:    newWrong,
          total:    newTotal,
          maxLevel: newMaxLevel,
        });
        return;
      }
      setLevel(newLevel);
      setStreak(newStreak);
      setPostError(newPostError);
      setMaxLevel(newMaxLevel);
      setTotalDone(newTotal);
      setCorrectCount(newCorrect);
      setWrongCount(newWrong);
      startRound(newLevel);
    }, FEEDBACK_MS);
    return () => clearTimeout(timer);
  };

  // ── Tap handler ──
  // Both modes (kelimeDizisi = 'word', siraliHatirla = 'image') behave the
  // same: collect every pick and only judge once ALL slots are filled. We
  // never resolve on the first mismatched tap — the child places the whole
  // sequence (and can use "Sıfırla" to restart) before the round is marked
  // right or wrong. Only then do we compare the full ordered sequence.
  const onPick = (word: Word) => {
    if (phase !== 'select' || verdict) return;
    if (selected.some(s => s.word === word.word)) return;
    Haptics.selectionAsync().catch(() => {});

    const nextSel = [...selected, word];
    setSelected(nextSel);
    if (nextSel.length === dizi.length) {
      const allMatch = nextSel.every((w, i) => w.word === dizi[i].word);
      resolveRound(allMatch);
    }
  };

  const onResetSlots = () => {
    if (phase !== 'select' || verdict) return;
    setSelected([]);
  };

  // ── Shared top bar ──
  // The "round number" shown is the one currently in progress (1-based).
  // Once a round resolves, totalDone increments and the next round becomes
  // the displayed number; clamped to TOTAL_ROUNDS so it never overshoots.
  const displayRound = Math.min(totalDone + 1, TOTAL_ROUNDS);
  const TopBar = (
    <View style={styles.topRow}>
      <Text style={[styles.topMeta, { color: moduleColor }]}>
        {t('session.sequence.level', { level, round: displayRound, total: TOTAL_ROUNDS })}
      </Text>
      <Text style={styles.topCorrect}>✓ {correctCount}</Text>
    </View>
  );

  // ── Render: SHOW phase ──
  if (phase === 'show') {
    const current = dizi[Math.min(flashIdx, dizi.length - 1)];
    return (
      <View style={styles.container}>
        {TopBar}

        <View style={[styles.showCard, { borderColor: tint(moduleColor, 0.25) }]}>
          <Text style={[styles.showTitle, { color: moduleColor }]}>
            {mode === 'image'
              ? t('session.sequence.showImage')
              : t('session.sequence.showWord')}
          </Text>

          <View style={styles.dotsRow}>
            {dizi.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i < flashIdx
                      ? moduleColor
                      : (i === flashIdx && showItem ? tint(moduleColor, 0.5) : theme.colors.border.subtle),
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.flashStack}>
            {current && showItem ? (
              <>
                <WordImage word={current} size={120} />
                <Text style={styles.flashWord} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{current.word}</Text>
              </>
            ) : (
              <Text style={styles.flashDots}>•••</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Render: SELECT phase ──
  return (
    <View style={styles.container}>
      {TopBar}

      {verdict ? (
        <View style={[
          styles.verdictBox,
          verdict === 'correct'
            ? { backgroundColor: theme.colors.feedback.successSubtle }
            : { backgroundColor: theme.colors.feedback.errorSubtle },
        ]}>
          <Text style={[
            styles.verdictText,
            { color: verdict === 'correct' ? theme.colors.feedback.successText : theme.colors.feedback.errorText },
          ]}>
            {verdict === 'correct' ? t('session.sequence.verdictGood') : t('session.sequence.verdictRetry')}
          </Text>
        </View>
      ) : null}

      <View style={styles.promptBox}>
        <Text style={styles.promptText}>
          {mode === 'image'
            ? t('session.sequence.pickImage', { count: dizi.length, n: selected.length })
            : t('session.sequence.pickWord',  { count: dizi.length, n: selected.length })}
        </Text>
        <View style={styles.orderRow}>
          {dizi.map((_, i) => {
            const sel = selected[i];
            return (
              <View
                key={i}
                style={[
                  styles.orderSlot,
                  sel ? { borderColor: moduleColor, backgroundColor: tint(moduleColor, 0.12) } : null,
                ]}
              >
                {sel ? (
                  mode === 'image' ? (
                    <WordImage word={sel} size={38} bg={'transparent'} />
                  ) : (
                    <Text style={[styles.orderWord, { color: moduleColor }]} numberOfLines={1}>
                      {sel.word}
                    </Text>
                  )
                ) : (
                  <Text style={styles.orderEmpty}>{i + 1}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.optGrid}>
        {options.map((word, i) => {
          const isPicked = !!selected.find(w => w.word === word.word);
          return (
            <Pressable
              key={word.word + i}
              onPress={() => onPick(word)}
              disabled={isPicked || !!verdict}
              style={[
                styles.optTile,
                isPicked && { backgroundColor: tint(moduleColor, 0.15), borderColor: moduleColor },
                !!verdict && styles.optTileDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={word.word}
            >
              {mode === 'image' ? (
                <>
                  <WordImage word={word} size={56} bg={'transparent'} />
                  <Text style={styles.optCaption} numberOfLines={1}>{word.word}</Text>
                </>
              ) : (
                <Text style={styles.optWordOnly} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {word.word}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footerRow}>
        {!verdict && streak > 0 ? (
          <Text style={styles.adaptiveHint}>
            {t('session.sequence.streakHint', { streak, needed: postError ? STREAK_POST_ERR : STREAK_NORMAL })}
          </Text>
        ) : <View />}
        {!verdict && selected.length > 0 && selected.length < dizi.length ? (
          <Pressable onPress={onResetSlots} style={styles.resetBtn}>
            <Text style={styles.resetText}>{t('session.sequence.reset')}</Text>
          </Pressable>
        ) : null}
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
  topCorrect: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.feedback.successText,
  },

  showCard: {
    marginTop: theme.spacing[2],
    padding: theme.spacing[5],
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  showTitle: {
    ...theme.typography.bodyLarge,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  flashStack: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  flashWord: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[3],
    letterSpacing: 2,
  },
  flashDots: {
    ...theme.typography.h1,
    color: theme.colors.text.muted,
    fontSize: 48,
  },

  verdictBox: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing[3],
    alignItems: 'center',
  },
  verdictText: {
    ...theme.typography.h3,
    fontWeight: '800',
  },

  promptBox: {
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  promptText: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  orderRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  orderSlot: {
    width: 52, height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 2,
    borderColor: theme.colors.border.subtle,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  orderWord: {
    ...theme.typography.caption,
    fontWeight: '800',
    letterSpacing: 1,
  },
  orderEmpty: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
  },

  optGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  optTile: {
    width: '31%',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 84,
    ...theme.shadow.sm,
  },
  optTileDisabled: { opacity: 0.55 },
  optCaption: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.primary,
    marginTop: 4,
  },
  optWordOnly: {
    ...theme.typography.h4,
    color: theme.colors.text.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  footerRow: {
    marginTop: theme.spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adaptiveHint: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  resetBtn: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.radius.md,
  },
  resetText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
  },
});
