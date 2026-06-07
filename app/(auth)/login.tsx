import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { Screen, Button, Input, ErrorBanner } from '@/components';
import { useAuth }  from '@/store/auth';
import { useAlert } from '@/store/alert';
import { useForm }  from '@/lib/useForm';
import { loginSchema, type LoginValues } from '@/lib/schemas';
import { theme } from '@/theme';
import { t }     from '@/i18n';

export default function LoginScreen() {
  const signIn = useAuth((s) => s.signIn);
  const alert  = useAlert();

  const form = useForm<LoginValues>(loginSchema, { email: '', password: '' });

  const mutation = useMutation({
    mutationFn: (values: LoginValues) => signIn(values.email, values.password),
    onError: alert.setAlert,
    // Navigation handled by useProtectedRoute on auth state change.
  });

  const handleSubmit = () => {
    alert.clearAlert();
    const validated = form.validate();
    if (!validated) return;
    mutation.mutate(validated);
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
        <Text style={styles.title}>{t('auth.login.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
      </View>

      <ErrorBanner message={alert.error?.message ?? ''} />

      <Input
        label={t('auth.login.email')}
        value={form.values.email}
        onChangeText={form.setField('email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={form.errors.email}
        required
      />
      <Input
        label={t('auth.login.password')}
        value={form.values.password}
        onChangeText={form.setField('password')}
        secureTextEntry
        secureToggle
        autoComplete="current-password"
        textContentType="password"
        error={form.errors.password}
        required
      />

      <Button
        label={t('auth.login.submit')}
        variant="cta"
        size="lg"
        fullWidth
        loading={mutation.isPending}
        onPress={handleSubmit}
        style={styles.submit}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.login.noAccount')} </Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/register')} hitSlop={6}>
          <Text style={styles.link}>{t('auth.login.signUp')}</Text>
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
  title:    { ...theme.typography.h1, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.body, color: theme.colors.text.secondary, marginTop: theme.spacing[1] },
  link: {
    ...theme.typography.body,
    color: theme.colors.text.link,
    fontFamily: theme.typography.bodyLarge.fontFamily,
  },
  submit: {
    marginTop: theme.spacing[4],
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
});
