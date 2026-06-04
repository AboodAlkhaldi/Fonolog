import React, { forwardRef, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, MIN_TOUCH_TARGET } from '@/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?:        string;
  helper?:       string;
  error?:        string | null;
  required?:     boolean;
  containerStyle?: ViewStyle;
  /** Show eye icon for password reveal. */
  secureToggle?: boolean;
}

/** Reusable text input. Forwards ref so callers can imperatively focus. */
export const Input = forwardRef<TextInput, Props>(function Input({
  label,
  helper,
  error,
  required,
  containerStyle,
  secureToggle,
  secureTextEntry,
  ...rest
}, ref) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal]   = useState(false);

  // Keep an internal ref alongside the forwarded one so tapping anywhere in the
  // input box (not just the small TextInput hit area) focuses it.
  const innerRef = useRef<TextInput>(null);
  const setRefs = (node: TextInput | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<TextInput | null>).current = node;
  };

  const isSecure   = secureTextEntry && !reveal;
  const hasError   = Boolean(error);
  const borderColor = hasError
    ? theme.colors.feedback.error
    : focused
      ? theme.colors.border.focus
      : theme.colors.border.default;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        style={[styles.inputWrap, { borderColor }]}
        onPress={() => innerRef.current?.focus()}
      >
        <TextInput
          ref={setRefs}
          style={styles.input}
          placeholderTextColor={theme.colors.text.muted}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
          secureTextEntry={isSecure}
          accessibilityLabel={label}
          accessibilityHint={helper}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setReveal((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Şifreyi gizle' : 'Şifreyi göster'}
            style={styles.iconBtn}
          >
            <Ionicons
              name={reveal ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.text.muted}
            />
          </Pressable>
        ) : null}
      </Pressable>

      {hasError ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing[4],
  },
  label: {
    ...theme.typography.bodySmall,
    fontFamily: theme.typography.bodyLarge.fontFamily,
    color:      theme.colors.text.secondary,
    marginBottom: theme.spacing[2],
  },
  required: {
    color: theme.colors.feedback.error,
  },
  inputWrap: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  theme.colors.background.secondary,
    borderWidth:      2,
    borderRadius:     theme.radius.md,
    paddingHorizontal: theme.spacing[4],
    minHeight:        MIN_TOUCH_TARGET,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing[3],
  },
  iconBtn: {
    padding: theme.spacing[2],
  },
  helper: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginTop: theme.spacing[1],
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.feedback.errorText,
    marginTop: theme.spacing[1],
  },
});
