import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme, MIN_TOUCH_TARGET } from '@/theme';
import { SpeakerButton } from './SpeakerButton';
import type { Question } from '@/domain';

interface Props {
  question:    Question;
  status:      'ready' | 'revealed';
  chosen:      string | null;
  onChoose:    (choice: string) => void;
  /**
   * Renders the prompt area above the choices. Different modules render
   * different things here (an emoji card, a syllable, a category name, etc.).
   */
  promptSlot?:  React.ReactNode;
  /** Show speaker button to play the word's TTS. Default true if word has audio_url. */
  showSpeaker?: boolean;
  /** Hide the inline `question.prompt` text — used for games where the
   *  prompt text reveals the target word verbatim. */
  hidePromptText?: boolean;
}

/**
 * A 2x2 grid of answer tiles. Reused by `tani`, `tamamla`, `uyak`, `kategori`.
 *
 * After answer:
 *   - chosen + correct → green
 *   - chosen + wrong   → red, the correct one turns green
 *   - non-chosen tiles → muted
 */
export function MultipleChoiceQuestion({
  question, status, chosen, onChoose, promptSlot, showSpeaker = true, hidePromptText = false,
}: Props) {
  const revealed = status === 'revealed';
  const audioUrl = (question.word as any).tts_url ?? (question.word as any).audio_url ?? null;

  const onTilePress = (option: string) => {
    if (revealed) return;
    Haptics.selectionAsync().catch(() => { /* ignore on web */ });
    onChoose(option);
  };

  return (
    <View style={styles.container}>
      {/* Prompt — caller-provided */}
      {promptSlot ? (
        <View style={styles.promptArea}>
          {promptSlot}
          {showSpeaker && audioUrl ? (
            <View style={styles.speakerOverlay}>
              <SpeakerButton audioUrl={audioUrl} size={48} />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Question prompt text */}
      {question.prompt && !hidePromptText ? <Text style={styles.promptText}>{question.prompt}</Text> : null}

      {/* Options grid */}
      <View style={styles.grid}>
        {(question.options ?? []).map((opt, idx) => {
          const isChosen  = chosen === opt;
          const isCorrect = opt === question.correct;

          let bg: string = theme.colors.background.secondary;
          let bd: string = theme.colors.border.subtle;
          let icon: 'checkmark-circle' | 'close-circle' | null = null;

          if (revealed) {
            if (isCorrect) {
              bg = theme.colors.feedback.successSubtle;
              bd = theme.colors.feedback.success;
              icon = 'checkmark-circle';
            } else if (isChosen && !isCorrect) {
              bg = theme.colors.feedback.errorSubtle;
              bd = theme.colors.feedback.error;
              icon = 'close-circle';
            }
          } else if (isChosen) {
            bd = theme.colors.brand.primary;
          }

          return (
            <Pressable
              key={`${opt}-${idx}`}
              onPress={() => onTilePress(opt)}
              accessibilityRole="button"
              accessibilityLabel={opt}
              accessibilityState={{ selected: isChosen, disabled: revealed }}
              style={[styles.tile, { backgroundColor: bg, borderColor: bd }]}
            >
              <Text style={styles.tileText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{opt}</Text>
              {icon ? (
                <View style={styles.tileIcon}>
                  <Ionicons
                    name={icon}
                    size={20}
                    color={icon === 'checkmark-circle' ? theme.colors.feedback.success : theme.colors.feedback.error}
                  />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  promptArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[6],
  },
  speakerOverlay: {
    marginTop: theme.spacing[3],
  },
  promptText: {
    ...theme.typography.h3,
    textAlign: 'center',
    color: theme.colors.text.primary,
    marginVertical: theme.spacing[3],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: theme.spacing[3],
  },
  tile: {
    width: '48%',
    minHeight: MIN_TOUCH_TARGET * 1.5,
    paddingVertical: theme.spacing[5],
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  tileText: {
    ...theme.typography.h4,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  tileIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
