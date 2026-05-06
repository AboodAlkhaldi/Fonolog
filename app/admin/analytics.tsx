import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart} from 'react-native-chart-kit';

import { Screen, Loading } from '@/components';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';

const SCREEN_W = Dimensions.get('window').width - 40;

export default function AdminAnalytics() {
  const [signups, setSignups] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [subSummary, setSubSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, b, c] = await Promise.all([
        supabase.rpc('admin_get_signups'),
        supabase.rpc('admin_get_daily_sessions'),
        supabase.rpc('admin_get_subscription_summary'),
      ]);
      setSignups((a.data ?? []).slice(0, 14));     // last 14 days
      setSessions((b.data ?? []).slice(0, 14));
      setSubSummary(c.data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Screen><Loading /></Screen>;

  // Compute summary stats
  const totalSubscribed = subSummary
    .filter((s) => s.subscription_status !== 'free' && s.subscription_status !== 'trial')
    .reduce((sum, s) => sum + Number(s.count), 0);
  const totalTrial = subSummary
    .filter((s) => s.subscription_status === 'trial')
    .reduce((sum, s) => sum + Number(s.count), 0);
  const totalUsers = subSummary.reduce((sum, s) => sum + Number(s.count), 0);

  // Estimate monthly revenue (rough — assume student plan)
  const estMonthly = totalSubscribed * 99;

  // Chart data
  const sessionData = sessions.slice().reverse();
  const sessionLabels = sessionData.map((d) => new Date(d.day).getDate().toString());
  const sessionValues = sessionData.map((d) => Number(d.sessions));

  const chartConfig = {
    backgroundGradientFrom: theme.colors.background.secondary,
    backgroundGradientTo:   theme.colors.background.secondary,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(36, 107, 95, ${opacity})`,
    labelColor: () => theme.colors.text.muted,
    propsForDots: { r: '4', strokeWidth: '2' },
  };

  return (
    <Screen>
      <Text style={styles.title}>Analiz</Text>

      <View style={styles.statsRow}>
        <Stat label="Toplam Kullanıcı" value={String(totalUsers)} />
        <Stat label="Aktif Abone"      value={String(totalSubscribed)} />
        <Stat label="Deneme"           value={String(totalTrial)} />
      </View>

      <View style={[styles.statsRow, { marginTop: theme.spacing[2] }]}>
        <Stat label="Tahmini Aylık" value={`₺${estMonthly}`} highlight />
      </View>

      {sessionValues.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Son 14 Gün Oturumları</Text>
          <LineChart
            data={{
              labels: sessionLabels,
              datasets: [{ data: sessionValues.length > 0 ? sessionValues : [0] }],
            }}
            width={SCREEN_W}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: theme.radius.md }}
          />
        </View>
      )}

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Abonelik Dağılımı</Text>
        {subSummary.map((row) => (
          <View key={`${row.role}-${row.subscription_status}`} style={styles.distRow}>
            <Text style={styles.distLabel}>{row.role} · {row.subscription_status}</Text>
            <Text style={styles.distValue}>{row.count}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueH]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
  statsRow: { flexDirection: 'row', gap: theme.spacing[2] },
  stat: {
    flex: 1, padding: theme.spacing[3], alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.md, ...theme.shadow.sm,
  },
  statHighlight: { backgroundColor: theme.colors.brand.primary },
  statValue: { ...theme.typography.h3, color: theme.colors.text.primary },
  statValueH: { color: theme.colors.text.primary },
  statLabel: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  chartCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing[3],
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing[4],
    ...theme.shadow.sm,
  },
  chartTitle: { ...theme.typography.h4, color: theme.colors.text.primary, marginBottom: theme.spacing[2] },
  distRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1, borderBottomColor: theme.colors.border.subtle,
  },
  distLabel: { ...theme.typography.body, color: theme.colors.text.primary },
  distValue: { ...theme.typography.body, fontFamily: theme.typography.bodyLarge.fontFamily, color: theme.colors.text.primary },
});
