import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import { supabase } from '@/lib/supabase';
import { downloadReportToLocal, getReportPreviewUrl, saveReportToDevice } from '@/lib/reports';
import { theme } from '@/theme';
import { t } from '@/i18n';

type ReportRow = {
  id: string;
  user_id: string;
  created_by: string | null;
  title: string;
  file_name: string;
  file_path: string;
  file_url: string | null;
  mime_type: string;
  size_bytes: number | null;
  created_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuth((s) => s.profile);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id || !profile) return;
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!alive) return;

      if (error || !data) {
        const message = error?.message ?? t('reports.previewError');
        setErrorText(message);
        showAlert(t('app.error_title'), message);
        setLoading(false);
        return;
      }

      const row = data as ReportRow;
      if (row.user_id !== profile.id && row.created_by !== profile.id) {
        const message = t('reports.previewError');
        setErrorText(message);
        showAlert(t('app.error_title'), message);
        router.back();
        return;
      }

      setReport(row);
      setLoading(false);
    })();

    return () => { alive = false; };
  }, [id, profile?.id]);

  const onShare = async () => {
    if (!report) return;
    setBusy('share');
    try {
      const localUri = await downloadReportToLocal(report);
      await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch (error) {
      showAlert(t('app.error_title'), error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (!report) return;
    setBusy('save');
    try {
      await saveReportToDevice(report);
      showAlert(t('reports.savedTitle'), t('reports.savedMsg'));
    } catch (error) {
      showAlert(t('app.error_title'), error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
          <Text style={styles.loadingText}>{t('reports.loading')}</Text>
        </View>
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen>
        <View style={styles.loadingBox}>
          <Ionicons name="alert-circle-outline" size={36} color={theme.colors.feedback.errorText} />
          <Text style={styles.loadingText}>{errorText ?? t('reports.previewError')}</Text>
          <Button label={t('app.back')} variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={styles.outer}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.subtitle}>{formatDate(report.created_at)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('reports.shareBtn')}
          variant="secondary"
          size="md"
          onPress={onShare}
          loading={busy === 'share'}
          style={styles.actionBtn}
        />
        <Button
          label={t('reports.saveBtn')}
          variant="cta"
          size="md"
          onPress={onSave}
          loading={busy === 'save'}
          style={styles.actionBtn}
        />
      </View>

      <View style={styles.previewCard}>
        <WebView
          source={{ uri: getReportPreviewUrl(report) }}
          style={styles.webview}
          originWhitelist={["*"]}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.previewLoading}>
              <ActivityIndicator size="large" color={theme.colors.brand.primary} />
              <Text style={styles.loadingText}>{t('reports.loading')}</Text>
            </View>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[2], marginBottom: theme.spacing[4] },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  titleWrap: { flex: 1 },
  title: { ...theme.typography.h2, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.bodySmall, color: theme.colors.text.secondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: theme.spacing[2], marginBottom: theme.spacing[4] },
  actionBtn: { flex: 1 },
  previewCard: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  webview: { flex: 1, backgroundColor: theme.colors.background.secondary },
  previewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing[3] },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing[3] },
  loadingText: { ...theme.typography.body, color: theme.colors.text.secondary },
});
