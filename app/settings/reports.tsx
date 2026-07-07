import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Screen, Button, Loading } from '@/components';
import { useAuth } from '@/store/auth';
import { showAlert } from '@/store/alert';
import { checkUsage, recordUsage } from '@/lib/entitlements';
import { supabase } from '@/lib/supabase';
import { storeGeneratedReportPdf } from '@/lib/reports';
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

export default function ReportsSettings() {
  const realProfile = useAuth((s) => s.profile);
  const impersonating = useAuth((s) => s.impersonating);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = async () => {
    if (!realProfile || impersonating) {
      setReports([]);
      setLoading(false);
      return;
    }
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .or(`user_id.eq.${realProfile.id},created_by.eq.${realProfile.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        showAlert(t('app.error_title'), error.message);
        setReports([]);
        return;
      }

      setReports((data ?? []) as ReportRow[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, [realProfile?.id, impersonating]);

  const onCreateReport = async () => {
    if (!realProfile || impersonating) {
      showAlert(t('reports.previewTitle'), t('profile.previewActionMsg'));
      return;
    }
    if (realProfile.role !== 'student') {
      showAlert(t('reports.title'), 'Bu bölüm henüz sadece öğrenci raporları için aktif.');
      return;
    }

    const usage = await checkUsage(realProfile, 'pdf_student');
    if (!usage.allowed) {
      showAlert(
        t('profile.pdfQuotaTitle'),
        t('profile.pdfQuotaMsg', { limit: usage.limit }),
        [
          { text: t('app.cancel'), style: 'cancel' },
          { text: t('profile.pdfUpgradeBtn'), onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-pdf-report`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id: realProfile.id }),
      });

      if (!res.ok) {
        showAlert(t('app.error_title'), await res.text());
        return;
      }

      const { html, report } = await res.json();
      const { uri } = await Print.printToFileAsync({ html });
      const saved = await storeGeneratedReportPdf({
        pdfUri: uri,
        ownerId: realProfile.id,
        createdById: realProfile.id,
        title: report?.title ?? `${realProfile.full_name} · ${t('reports.title')}`,
        fileNamePrefix: report?.fileNamePrefix ?? `${realProfile.full_name}-report`,
        accessToken: session?.access_token ?? '',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }

      await recordUsage(realProfile, 'pdf_student');
      showAlert(t('reports.savedTitle'), t('profile.pdfSuccess', { remaining: usage.remaining - 1, limit: usage.limit }));
      setReports((prev) => [saved, ...prev.filter((report) => report.id !== saved.id)]);
    } catch (error) {
      showAlert(t('app.error_title'), t('profile.pdfError', { error: error instanceof Error ? error.message : String(error) }));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Screen><Loading message={t('reports.loading')} /></Screen>;

  const canCreate = Boolean(realProfile && !impersonating && realProfile.role === 'student');

  return (
    <Screen scroll={false} contentStyle={styles.outer}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>{t('reports.title')}</Text>
        <Text style={styles.subtitle}>{t('reports.subtitle')}</Text>
      </View>

      {canCreate ? (
        <Button
          label={t('reports.createBtn')}
          variant="cta"
          size="lg"
          fullWidth
          onPress={onCreateReport}
          loading={creating}
          style={{ marginBottom: theme.spacing[4] }}
        />
      ) : null}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadReports} />}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={32} color={theme.colors.text.muted} />
            <Text style={styles.emptyTitle}>{t('reports.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('reports.emptyMsg')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/settings/reports/${item.id}` as any)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
            </View>
            <Text style={styles.cardMeta}>{formatDate(item.created_at)}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.created_by === item.user_id ? 'Kendi raporun' : 'Paylaşılan rapor'}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  headerBlock: { marginBottom: theme.spacing[1] },
  title: { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  list: { flex: 1 },
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...theme.typography.h4, color: theme.colors.text.primary, flex: 1, paddingRight: theme.spacing[2] },
  cardMeta: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: theme.spacing[1] },
  cardDesc: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[2] },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[6],
    marginTop: theme.spacing[2],
  },
  emptyTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginTop: theme.spacing[2] },
  emptyText: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1], textAlign: 'center' },
});
