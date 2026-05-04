import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button } from '@/components';
import { useAuth } from '@/store/auth';
import { theme } from '@/theme';
import { t } from '@/i18n';

export default function ProfileTab() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);

  const confirmSignOut = () => {
    Alert.alert(
      t('profile.signOut'),
      t('profile.signOutConfirm'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        { text: t('profile.signOut'), style: 'destructive', onPress: () => signOut() },
      ],
    );
  };

  const subscriptionLabel = (() => {
    switch (profile?.subscription_status) {
      case 'trial':   return 'Pro Deneme';
      case 'student': return 'Student';
      case 'expert':  return 'Expert';
      case 'free':    return 'Ücretsiz';
      default:        return '—';
    }
  })();

  return (
    <Screen>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <Section title={t('profile.accountInfo')}>
        <Row icon="person-outline"   label={t('profile.parent')} value={profile?.full_name ?? '—'} />
        <Row icon="mail-outline"     label="E-posta"             value={profile?.email ?? '—'} />
        <Row icon="happy-outline"    label={t('profile.child')}
             value={`${profile?.child_avatar_emoji ?? ''} ${profile?.child_age ?? ''} yaş`} />
      </Section>

      <Section title={t('profile.subscription')}>
        <Row icon="star-outline" label="Plan" value={subscriptionLabel} />
        {profile?.subscription_expires ? (
          <Row icon="calendar-outline" label="Bitiş"
               value={new Date(profile.subscription_expires).toLocaleDateString('tr-TR')} />
        ) : null}
      </Section>

      <Button
        label={t('profile.signOut')}
        variant="secondary"
        size="lg"
        fullWidth
        onPress={confirmSignOut}
        style={{ marginTop: theme.spacing[6] }}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

function Row({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={rowStyles.container}>
      <Ionicons name={icon} size={20} color={theme.colors.text.muted} />
      <View style={rowStyles.text}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.h1, color: theme.colors.text.primary, marginBottom: theme.spacing[5] },
});

const sectionStyles = StyleSheet.create({
  container: { marginBottom: theme.spacing[5] },
  title: {
    ...theme.typography.bodySmall,
    fontFamily: theme.typography.bodyLarge.fontFamily,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing[2],
  },
  body: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[4],
    ...theme.shadow.sm,
  },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  text: { marginLeft: theme.spacing[3], flex: 1 },
  label: { ...theme.typography.caption, color: theme.colors.text.muted },
  value: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bodyLarge.fontFamily,
    marginTop: 2,
  },
});
