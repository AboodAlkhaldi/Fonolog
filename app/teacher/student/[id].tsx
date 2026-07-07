import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Modal, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Screen, Loading, Button, Badge, Input } from '@/components';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import { checkUsage, recordUsage } from '@/lib/entitlements';
import { storeGeneratedReportPdf, getReportUrl } from '@/lib/reports';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function TeacherStudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const impersonating = useAuth((s) => s.impersonating);
  const teacherProfile = useAuth((s) => s.profile);
  const [profile,   setProfile]   = useState<any>(null);
  const [character, setCharacter] = useState<any>(null);
  const [sessions,  setSessions]  = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!id) return;
    // Preview mode — render placeholder data instead of fetching real student.
    if (impersonating === 'teacher') {
      setProfile({
        full_name: 'Öğrenci Adı',
        email: 'ornek@okumadedektifi.com',
        child_avatar_emoji: '🦁',
      });
      setCharacter({ level: 1, total_xp: 0, current_streak: 0 });
      setSessions([]);
      setTemplates([]);
      return;
    }
    const [p, c, s, t] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('student_character').select('*').eq('student_id', id).maybeSingle(),
      supabase.from('session_logs').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('notification_templates').select('*').eq('is_active', true).order('display_order'),
    ]);
    setProfile(p.data);
    setCharacter(c.data);
    setSessions(s.data ?? []);
    setTemplates(t.data ?? []);
  };

  useEffect(() => { load(); }, [id, impersonating]);

  const onUnlink = () => {
    if (impersonating === 'teacher' || id === '__preview__') {
      showAlert(t('profile.previewAction'), t('teacher.studentDetail.previewMsg'));
      return;
    }
    showAlert(t('teacher.studentDetail.unlinkTitle'), t('teacher.studentDetail.unlinkMsg'), [
      { text: t('app.cancel'), style: 'cancel' },
      {
        text: t('teacher.studentDetail.unlinkBtn'), style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('unlink_student', { p_student_id: id });
          if (error) { showAlert(t('app.error_title'), error.message); return; }
          router.back();
        },
      },
    ]);
  };

  const onSendNotification = () => {
    if (impersonating === 'teacher' || id === '__preview__') {
      showAlert(t('profile.previewAction'), t('teacher.studentDetail.previewMsg'));
      return;
    }
    if (templates.length === 0) { showAlert(t('app.ok'), t('teacher.studentDetail.notifNoTemplates')); return; }
    showAlert(
      t('teacher.studentDetail.notifTitle'),
      t('teacher.studentDetail.notifMsg'),
      [
        ...templates.map((tpl) => ({
          text: tpl.title,
          onPress: () => sendNotif(tpl),
        })),
        { text: t('app.cancel'), style: 'cancel' as const },
      ],
    );
  };

  const sendNotif = async (tpl: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: id,
        title:   tpl.title,
        body:    tpl.body,
      }),
    });
    if (res.ok) showAlert(t('teacher.studentDetail.notifSentTitle'), t('teacher.studentDetail.notifSentMsg'));
    else showAlert(t('app.error_title'), await res.text());
  };

  const onAssignHomework = () => {
    if (impersonating === 'teacher' || id === '__preview__') {
      showAlert(t('profile.previewAction'), t('teacher.studentDetail.assignPreview'));
      return;
    }
    router.push(`/teacher/assignments/new?studentId=${id}`);
  };

  const onOpenNotes = () => {
    if (impersonating === 'teacher' || id === '__preview__') {
      showAlert(t('profile.previewAction'), t('teacher.studentDetail.pdfPreview'));
      return;
    }
    setNotesOpen(true);
  };

  const onGenerateReport = async () => {
    // Quota check first (trial: 2 / hafta).
    const usage = await checkUsage(teacherProfile, 'pdf_teacher');
    if (!usage.allowed) {
      showAlert(
        t('teacher.studentDetail.pdfQuotaTitle'),
        t('teacher.studentDetail.pdfQuotaMsg'),
        [
          { text: t('app.cancel'), style: 'cancel' },
          { text: t('teacher.studentDetail.upgradeBtn'), onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-pdf-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id:    id,
          teacher_notes: teacherNotes || undefined,
        }),
      });
      if (!res.ok) { showAlert(t('app.error_title'), await res.text()); return; }
      const { html, report } = await res.json();

      const { uri } = await Print.printToFileAsync({ html });

      const savedReport = await storeGeneratedReportPdf({
        pdfUri: uri,
        ownerId: id,
        createdById: teacherProfile?.id,
        title: report?.title ?? `${profile.full_name} · ${t('reports.title')}`,
        fileNamePrefix: report?.fileNamePrefix ?? `${profile.full_name}-report`,
        accessToken: session?.access_token ?? '',
      });

      const publicUrl = savedReport.file_url ?? getReportUrl(savedReport);
      await supabase.from('notifications').insert({
        user_id: id,
        type:    'teacher_note',
        title:   t('teacher.studentDetail.pdfNotifTitle'),
        body:    t('teacher.studentDetail.pdfNotifBody'),
        payload: { report_url: publicUrl, report_id: savedReport.id, teacher_id: teacherProfile?.id, has_notes: !!teacherNotes },
      });

      await recordUsage(teacherProfile, 'pdf_teacher');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }

      setNotesOpen(false);
      setTeacherNotes('');
      showAlert(
        t('teacher.studentDetail.reportDoneTitle'),
        publicUrl
          ? t('teacher.studentDetail.reportDoneMsg')
          : t('teacher.studentDetail.reportDoneMsgNoUpload'),
      );
    } catch (e) {
      showAlert(t('app.error_title'), 'PDF oluşturulurken hata: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGenerating(false);
    }
  };

  if (!profile) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll={false}>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
        ListEmptyComponent={<Text style={styles.empty}>{t('teacher.studentDetail.noSessions')}</Text>}
        ListHeaderComponent={
          <View>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.avatar}>{profile.child_avatar_emoji ?? '🦁'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{profile.full_name}</Text>
                <Text style={styles.meta}>{profile.email}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <Badge label={`Sv ${character?.level ?? 1}`} variant="info" />
                  <Badge label={`${character?.total_xp ?? 0} XP`} variant="success" />
                  <Badge label={`🔥 ${character?.current_streak ?? 0}`} variant="warning" />
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <ActionBtn icon="clipboard-outline"   label={t('teacher.studentDetail.actionAssign')}  onPress={onAssignHomework} />
              <ActionBtn icon="chatbubble-outline"  label={t('teacher.studentDetail.actionNotify')}  onPress={onSendNotification} />
              <ActionBtn icon="document-outline"    label={t('teacher.studentDetail.actionPdf')}     onPress={onOpenNotes} />
              <ActionBtn icon="trash-outline"       label={t('teacher.studentDetail.actionDelete')}  onPress={onUnlink} danger />
            </View>

            <Text style={styles.sectionTitle}>{t('teacher.studentDetail.recentSessions')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionMod}>{item.module_id}</Text>
            <Text style={styles.sessionMeta}>
              {item.questions_correct}/{item.questions_total} · {item.xp_earned} XP
            </Text>
          </View>
        )}
      />

      {/* Teacher-notes modal for PDF report */}
      <Modal
        visible={notesOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !generating && setNotesOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => !generating && setNotesOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('teacher.studentDetail.notesTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('teacher.studentDetail.notesSubtitle')}</Text>
            <Input
              value={teacherNotes}
              onChangeText={setTeacherNotes}
              placeholder={t('teacher.studentDetail.notesPlaceholder')}
              multiline
              numberOfLines={5}
              editable={!generating}
              containerStyle={{ marginBottom: theme.spacing[3] }}
            />
            <View style={styles.modalActions}>
              <Button
                label={t('app.cancel')}
                variant="secondary"
                fullWidth
                onPress={() => setNotesOpen(false)}
                disabled={generating}
                style={{ flex: 1 }}
              />
              <Button
                label={t('teacher.studentDetail.notesSubmit')}
                variant="cta"
                fullWidth
                onPress={onGenerateReport}
                loading={generating}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function ActionBtn({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, danger && styles.actionDanger]}
    >
      <Ionicons name={icon} size={22} color={danger ? theme.colors.feedback.errorText : theme.colors.text.primary} />
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[3] },
  avatar: { fontSize: 56 },
  name: { ...theme.typography.h2, color: theme.colors.text.primary },
  meta: { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginVertical: theme.spacing[3] },
  action: {
    flex: 1, minWidth: '47%',
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
  },
  actionDanger: { backgroundColor: theme.colors.feedback.errorSubtle },
  actionLabel: { ...theme.typography.bodyMedium, color: theme.colors.text.primary },
  actionLabelDanger: { color: theme.colors.feedback.errorText },
  sectionTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginVertical: theme.spacing[2] },
  sessionCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3], borderRadius: theme.radius.md,
    marginBottom: theme.spacing[2],
  },
  sessionMod: { ...theme.typography.bodyLarge, fontFamily: theme.typography.bodyLarge.fontFamily, color: theme.colors.text.primary },
  sessionMeta: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  empty: { ...theme.typography.body, color: theme.colors.text.muted, textAlign: 'center', paddingVertical: theme.spacing[6] },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
  },
  modalCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    width: '100%',
    maxHeight: '70%',
    ...theme.shadow.md,
  },
  modalTitle: { ...theme.typography.h2, color: theme.colors.text.primary, marginBottom: theme.spacing[1] },
  modalSubtitle: { ...theme.typography.bodySmall, color: theme.colors.text.muted, marginBottom: theme.spacing[3] },
  modalActions: { flexDirection: 'row', gap: theme.spacing[2] },
});
