import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { useAuth }   from '@/store/auth';
import { useForm }   from '@/lib/useForm';
import { registerSchema, type RegisterValues } from '@/lib/schemas';
import { theme }     from '@/theme';
import { t }         from '@/i18n';

export default function RegisterScreen() {
  const signUp = useAuth((s) => s.signUp);
  const [serverError, setServerError] = useState('');

  const form = useForm<RegisterValues>(registerSchema, {
    fullName: '',
    email:    '',
    password: '',
    passwordConfirm: '',
  });

  const handleSubmit = async () => {
    setServerError('');
    await form.submit(async (values) => {
      const res = await signUp(values.email, values.password, values.fullName);
      if (!res.ok) {
        // res.error is either an i18n key (e.g. "auth.register.errors.emailTaken") or raw text
        const localized = res.error.startsWith('auth.') ? t(res.error) : res.error;
        setServerError(localized);
        return;
      }
      // Auth state changes; useProtectedRoute will move us to verify-email.
      router.replace('/(auth)/verify-email');
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
        <Text style={styles.title}>{t('auth.register.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
      </View>

      <ErrorBanner message={serverError} />

      <Input
        label={t('auth.register.parentName')}
        placeholder={t('auth.register.parentNamePh')}
        value={form.values.fullName}
        onChangeText={form.setField('fullName')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        required
        error={form.errors.fullName}
      />
      <Input
        label={t('auth.register.email')}
        placeholder={t('auth.register.emailPh')}
        value={form.values.email}
        onChangeText={form.setField('email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        required
        error={form.errors.email}
      />
      <Input
        label={t('auth.register.password')}
        placeholder={t('auth.register.passwordPh')}
        value={form.values.password}
        onChangeText={form.setField('password')}
        secureTextEntry
        secureToggle
        autoComplete="password-new"
        textContentType="newPassword"
        required
        error={form.errors.password}
      />
      <Input
        label={t('auth.register.passwordConfirm')}
        value={form.values.passwordConfirm}
        onChangeText={form.setField('passwordConfirm')}
        secureTextEntry
        secureToggle
        autoComplete="password-new"
        textContentType="newPassword"
        required
        error={form.errors.passwordConfirm}
      />

      <Text style={styles.terms}>{t('auth.register.terms')}</Text>

      <Button
        label={t('auth.register.submit')}
        variant="cta"
        size="lg"
        fullWidth
        loading={form.submitting}
        onPress={handleSubmit}
        style={styles.submit}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.register.hasAccount')} </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(auth)/login')}
          hitSlop={6}
        >
          <Text style={styles.link}>{t('auth.register.signIn')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  header: {
    marginBottom: theme.spacing[6],
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[1],
  },
  terms: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  submit: {
    marginTop: theme.spacing[2],
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    marginTop:      theme.spacing[6],
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  link: {
    ...theme.typography.body,
    color: theme.colors.text.link,
    fontFamily: theme.typography.bodyLarge.fontFamily,
  },
});
