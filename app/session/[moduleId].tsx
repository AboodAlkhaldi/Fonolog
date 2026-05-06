import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Loading, ErrorBanner } from '@/components';
import { showAlert } from '@/store/alert';
import { MultipleChoiceQuestion } from '@/components/session/MultipleChoiceQuestion';
import { BuilderQuestion }        from '@/components/session/BuilderQuestion';
import { PronunciationQuestion }  from '@/components/session/PronunciationQuestion';
import { AudioPairQuestion }      from '@/components/session/AudioPairQuestion';
import { QuestionPrompt }         from '@/components/session/QuestionPrompt';
import { useSession, sessionProgress } from '@/store/session';
import { getModule } from '@/domain';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function SessionScreen() {
  // Route: /session/[moduleId]?categoryId=xxx&assignmentId=xxx
  const { moduleId, categoryId, assignmentId } = useLocalSearchParams<{
    moduleId:      string;
    categoryId?:   string;
    assignmentId?: string;
  }>();

  const status        = useSession((s) => s.status);
  const errorMessage  = useSession((s) => s.errorMessage);
  const questions     = useSession((s) => s.questions);
  const index         = useSession((s) => s.index);
  const lastVerdict   = useSession((s) => s.lastVerdict);
  const lastChosen    = useSession((s) => s.lastChosen);
  const start         = useSession((s) => s.start);
  const answer        = useSession((s) => s.answer);
  const next          = useSession((s) => s.next);
  const reset         = useSession((s) => s.reset);
  const progress      = useSession(sessionProgress);

  // Boot the session whenever route params change
  useEffect(() => {
    if (!moduleId) return;
    const opts: { categoryId?: string; assignmentId?: string } = {};
    if (categoryId)   opts.categoryId   = categoryId;
    if (assignmentId) opts.assignmentId = assignmentId;
    start(moduleId, opts);
    // Cleanup on unmount: leave state alone — finish-screen reads from it
  }, [moduleId, categoryId, assignmentId, start]);

  // When session marks itself finished, navigate to results
  useEffect(() => {
    if (status === 'finished') {
      router.replace('/session/result');
    }
  }, [status]);

  if (!moduleId) {
    return (
      <Screen>
        <ErrorBanner message="Modül belirtilmemiş." />
        <Button label={t('app.back')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const moduleDef  = getModule(moduleId);
  const screenType = moduleDef?.screenType;

  const handleQuit = () => {
    showAlert(
      t('session.quit'),
      t('session.quitConfirm'),
      [
        { text: t('app.no'),  style: 'cancel' },
        { text: t('app.yes'), style: 'destructive', onPress: () => { reset(); router.back(); } },
      ],
    );
  };

  if (status === 'loading') return <Screen><Loading message={t('session.loading')} /></Screen>;

  if (status === 'error') {
    return (
      <Screen>
        <ErrorBanner message={errorMessage ?? t('session.error')} />
        <Button label={t('app.back')} variant="secondary" fullWidth onPress={() => router.back()} />
      </Screen>
    );
  }

  if (status === 'idle' || questions.length === 0) {
    return <Screen><Loading /></Screen>;
  }

  const question = questions[index];
  if (!question) return <Screen><Loading /></Screen>;

  const qStatus = status === 'revealed' ? 'revealed' : 'ready';

  return (
    <Screen scroll={false} contentStyle={styles.outer}>
      {/* ─── Top bar: progress + quit ─── */}
      <View style={styles.topBar}>
        <Pressable
          onPress={handleQuit}
          accessibilityRole="button"
          accessibilityLabel={t('session.quit')}
          hitSlop={10}
          style={styles.quitBtn}
        >
          <Ionicons name="close" size={28} color={theme.colors.text.muted} />
        </Pressable>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {index + 1} / {questions.length}
        </Text>
      </View>

      {/* ─── Question body ─── */}
      <View style={styles.body}>
        {screenType === 'builder' ? (
          <BuilderQuestion
            question={question}
            status={qStatus}
            chosen={lastChosen}
            onChoose={answer}
          />
        ) : screenType === 'audio-pair' ? (
          <AudioPairQuestion
            question={question}
            status={qStatus}
            chosen={lastChosen}
            onChoose={answer}
          />
        ) : (
          screenType === 'pronunciation' ||
          screenType === 'phoneme' ||
          screenType === 'explore' ||
          screenType === 'memory' ||
          !question.options || question.options.length === 0
        ) ? (
          <PronunciationQuestion
            question={question}
            status={qStatus}
            chosen={lastChosen}
            onChoose={answer}
          />
        ) : (
          <MultipleChoiceQuestion
            question={question}
            status={qStatus}
            chosen={lastChosen}
            onChoose={answer}
            promptSlot={<QuestionPrompt moduleId={moduleId} question={question} />}
          />
        )}
      </View>

      {/* ─── Verdict + next button ─── */}
      {status === 'revealed' ? (
        <View style={styles.verdictBar}>
          <View style={styles.verdictRow}>
            <Ionicons
              name={lastVerdict === 'correct' ? 'checkmark-circle' : 'close-circle'}
              size={28}
              color={lastVerdict === 'correct' ? theme.colors.feedback.success : theme.colors.feedback.error}
            />
            <Text style={[
              styles.verdictText,
              { color: lastVerdict === 'correct' ? theme.colors.feedback.successText : theme.colors.feedback.errorText },
            ]}>
              {lastVerdict === 'correct' ? t('session.correct') : `${t('session.wrong')} — ${question.correct}`}
            </Text>
          </View>
          <Button
            label={index + 1 >= questions.length ? t('app.done') : t('session.next')}
            variant="cta"
            size="lg"
            fullWidth
            onPress={next}
            hapticImpact={lastVerdict === 'correct' ? 'medium' : 'light'}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    paddingHorizontal: theme.spacing[5],
    paddingTop:        theme.spacing[2],
  },
  topBar: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  theme.spacing[4],
  },
  quitBtn: {
    width:  44,
    height: 44,
    alignItems:     'center',
    justifyContent: 'center',
    marginRight: theme.spacing[2],
    marginLeft:  -theme.spacing[2],
  },
  progressBarTrack: {
    flex:            1,
    height:          8,
    borderRadius:    4,
    backgroundColor: theme.colors.background.tertiary,
    overflow:        'hidden',
  },
  progressBarFill: {
    height:          '100%',
    backgroundColor: theme.colors.brand.primary,
  },
  progressLabel: {
    ...theme.typography.caption,
    color:     theme.colors.text.muted,
    marginLeft: theme.spacing[3],
    minWidth:   50,
    textAlign:  'right',
  },
  body: {
    flex:           1,
    justifyContent: 'center',
  },
  verdictBar: {
    paddingVertical: theme.spacing[4],
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  theme.spacing[3],
  },
  verdictText: {
    ...theme.typography.h4,
    marginLeft: theme.spacing[2],
    flex:       1,
  },
});
