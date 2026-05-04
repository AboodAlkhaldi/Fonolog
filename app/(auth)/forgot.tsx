import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { supabase } from '@/lib/supabase';
import { useForm }  from '@/lib/useForm';
import { forgotSchema, type ForgotValues } from '@/lib/schemas';
import { theme }    from '@/theme';
import { t }        from '@/i18n';

export default function ForgotScreen() {
  const [serverError, setServerError] = useState('');
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotValues>(forgotSchema, { email: '' });

  const handleSubmit = async () => {
    setServerError('');
    await form.submit(async (values) => {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        // The mobile deep-link the user lands on from the email
        redirectTo: 'okuma://reset-password',
      });
      if (error) {
        setServerError(error.message);
        return;
      }
      setSent(true);
    });
  };

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.back')}
        onPress={() => router.back()}
        style={styles.backBtn}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.forgot.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.forgot.subtitle')}</Text>
      </View>

      <ErrorBanner message={serverError} />

      {sent ? (
        <View style={styles.successCard}>
          <Text style={styles.successText}>{t('auth.forgot.sent')}</Text>
        </View>
      ) : (
        <>
          <Input
            label={t('auth.forgot.email')}
            value={form.values.email}
            onChangeText={form.setField('email')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={form.errors.email}
            required
          />
          <Button
            label={t('auth.forgot.submit')}
            variant="cta"
            size="lg"
            fullWidth
            loading={form.submitting}
            onPress={handleSubmit}
            style={styles.submit}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 44, height: 44,
    justifyContent: 'center',
    marginLeft: -theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  header: { marginBottom: theme.spacing[6] },
  title: { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[1],
  },
  submit: { marginTop: theme.spacing[2] },
  successCard: {
    backgroundColor: theme.colors.feedback.successSubtle,
    padding:    theme.spacing[5],
    borderRadius: theme.radius.md,
  },
  successText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.feedback.successText,
    textAlign: 'center',
  },
});
