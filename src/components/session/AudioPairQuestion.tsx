import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme';
import { WordImage } from '@/components';
import { SpeakerButton } from './SpeakerButton';
import type { Question } from '@/domain';
import type { Word } from '@/domain/types/word.types';

interface Props {
  question: Question;
  status:   'ready' | 'revealed';
  chosen:   string | null;
  onChoose: (choice: string) => void;
  hidePromptText?: boolean;
}

/**
 * Audio-pair challenge — used by Uzun Kelime.
 * Two word cards shown side-by-side, each with an audio button.
 * The student listens to both, then taps the longer word.
 */
export function AudioPairQuestion({ question, status, chosen, onChoose, hidePromptText = false }: Props) {
  const revealed = status === 'revealed';
  const extra    = (question.extra ?? {}) as { wordA: Word; wordB: Word };
  const wordA    = extra.wordA;
  const wordB    = extra.wordB;

  // track which card the speaker is playing so we can show visual feedback
  const [playingA, setPlayingA] = useState(false);
  const [playingB, setPlayingB] = useState(false);

  if (!wordA || !wordB) return null;

  const audioA = (wordA as any).tts_url ?? (wordA as any).audio_url ?? null;
  const audioB = (wordB as any).tts_url ?? (wordB as any).audio_url ?? null;

  const onPress = (word: string) => {
    if (revealed) return;
    Haptics.selectionAsync().catch(() => {});
    onChoose(word);
  };

  const cardState = (word: string): 'default' | 'selected' | 'correct' | 'wrong' => {
    if (!revealed) return chosen === word ? 'selected' : 'default';
    if (word === question.correct) return 'correct';
    if (chosen === word && word !== question.correct) return 'wrong';
    return 'default';
  };

  return (
    <View style={styles.container}>
      {!hidePromptText && (
        <>
          <Text style={styles.prompt}>{question.prompt ?? 'Hangisi daha uzun?'}</Text>
          <Text style={styles.subtitle}>Her iki kelimeyi dinle, sonra daha uzun olanı seç.</Text>
        </>
      )}

      <View style={styles.cardsRow}>
        <WordCard
          word={wordA}
          audioUrl={audioA}
          state={cardState(wordA.word)}
          onPress={() => onPress(wordA.word)}
          syllableCount={wordA.n}
          revealed={revealed}
          hideWord={hidePromptText}
        />

        <View style={styles.vsContainer}>
          <View style={styles.vsDivider} />
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={styles.vsDivider} />
        </View>

        <WordCard
          word={wordB}
          audioUrl={audioB}
          state={cardState(wordB.word)}
          onPress={() => onPress(wordB.word)}
          syllableCount={wordB.n}
          revealed={revealed}
          hideWord={hidePromptText}
        />
      </View>

      {revealed && (
        <View style={styles.hintRow}>
          <Ionicons
            name={chosen === question.correct ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={chosen === question.correct ? theme.colors.feedback.success : theme.colors.feedback.error}
          />
          <Text style={[
            styles.hintText,
            { color: chosen === question.correct ? theme.colors.feedback.successText : theme.colors.feedback.errorText },
          ]}>
            {question.correct} daha uzun ({(question.correct === wordA.word ? wordA.word : wordB.word).replace(/\s+/g, '').length} harf)
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Word Card ────────────────────────────────────────────────────────────────

interface CardProps {
  word:          Word;
  audioUrl:      string | null;
  state:         'default' | 'selected' | 'correct' | 'wrong';
  onPress:       () => void;
  syllableCount: number;
  revealed:      boolean;
  /** Hide the word label + count dots so the child must judge length by ear. */
  hideWord?:     boolean;
}

function WordCard({ word, audioUrl, state, onPress, syllableCount, revealed, hideWord = false }: CardProps) {
  const borderColor =
    state === 'correct'  ? theme.colors.feedback.success  :
    state === 'wrong'    ? theme.colors.feedback.error     :
    state === 'selected' ? theme.colors.brand.primary      :
    theme.colors.border.subtle;

  const bgColor =
    state === 'correct'  ? theme.colors.feedback.successSubtle :
    state === 'wrong'    ? theme.colors.feedback.errorSubtle   :
    state === 'selected' ? theme.colors.brand.primary + '18'   :
    theme.colors.background.secondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={revealed}
      style={[styles.card, { borderColor, backgroundColor: bgColor }]}
    >
      {/* State icon in corner */}
      {state === 'correct' || state === 'wrong' ? (
        <View style={styles.cardCornerIcon}>
          <Ionicons
            name={state === 'correct' ? 'checkmark-circle' : 'close-circle'}
            size={22}
            color={state === 'correct' ? theme.colors.feedback.success : theme.colors.feedback.error}
          />
        </View>
      ) : null}

      <WordImage word={word} size={88} bg={'transparent'} />
      {/* The word text and the count dots both give the answer away, so they
          stay hidden until the answer is revealed when hideWord is set. */}
      {(!hideWord || revealed) && (
        <Text
          style={styles.cardWord}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
        >{word.word}</Text>
      )}

      {(!hideWord || revealed) && (
        <View style={styles.syllableDots}>
          {Array.from({ length: syllableCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                state === 'correct' && styles.dotCorrect,
                state === 'wrong'   && styles.dotWrong,
              ]}
            />
          ))}
        </View>
      )}

      <SpeakerButton
        audioUrl={audioUrl}
        size={52}
        style={styles.cardSpeaker}
      />
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[2],
  },
  prompt: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[1],
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
  },

  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    width: '100%',
  },

  card: {
    flex: 1,
    borderRadius: theme.radius.xl,
    borderWidth: 2.5,
    paddingVertical: theme.spacing[5],
    paddingHorizontal: theme.spacing[3],
    alignItems: 'center',
    // Fixed height keeps both cards identical regardless of word length.
    // Long words shrink (adjustsFontSizeToFit) instead of growing the card.
    height: 230,
    justifyContent: 'center',
    overflow: 'hidden',
    ...theme.shadow.md,
  },
  cardCornerIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  cardEmoji: {
    fontSize: 60,
    marginBottom: theme.spacing[2],
  },
  cardWord: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  syllableDots: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: theme.spacing[4],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.brand.primary,
    opacity: 0.5,
  },
  dotCorrect: {
    backgroundColor: theme.colors.feedback.success,
    opacity: 1,
  },
  dotWrong: {
    backgroundColor: theme.colors.feedback.error,
    opacity: 0.7,
  },
  cardSpeaker: {
    // no extra margin needed — SpeakerButton already has sizing
  },

  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    gap: theme.spacing[2],
  },
  vsDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border.subtle,
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    fontFamily: theme.typography.bodyMedium.fontFamily,
  },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginTop: theme.spacing[5],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.secondary,
  },
  hintText: {
    ...theme.typography.bodyMedium,
  },
});
