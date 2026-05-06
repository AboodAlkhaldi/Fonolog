import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';

import { useAlertStore } from '@/store/alert';
import { theme } from '@/theme';

/**
 * Styled replacement for the native Alert.alert dialog.
 * Mount once inside the root layout — listens to useAlertStore.
 */
export function AlertModal() {
  const { visible, title, message, buttons, dismiss } = useAlertStore();

  const handleButton = (onPress?: () => void) => {
    dismiss();
    onPress?.();
  };

  const cancelBtn  = buttons.find((b) => b.style === 'cancel');
  const actionBtns = buttons.filter((b) => b.style !== 'cancel');

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => cancelBtn ? handleButton(cancelBtn.onPress) : dismiss()}
    >
      <Pressable style={styles.backdrop} onPress={() => cancelBtn ? handleButton(cancelBtn.onPress) : dismiss()}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>

          {/* Header stripe */}
          <View style={styles.header}>
            <Text style={styles.titleText}>{title}</Text>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.messageText}>{message}</Text>
          </View>

          {/* Buttons */}
          <View style={[styles.buttonRow, buttons.length > 2 && styles.buttonColumn]}>
            {/* Cancel always last / left */}
            {cancelBtn ? (
              <Pressable
                style={[styles.btn, styles.btnCancel, buttons.length <= 2 && styles.btnFlex]}
                onPress={() => handleButton(cancelBtn.onPress)}
              >
                <Text style={styles.btnCancelText}>{cancelBtn.text}</Text>
              </Pressable>
            ) : null}

            {actionBtns.map((btn, i) => (
              <Pressable
                key={i}
                style={[
                  styles.btn,
                  buttons.length <= 2 && styles.btnFlex,
                  btn.style === 'destructive' ? styles.btnDestructive : styles.btnPrimary,
                ]}
                onPress={() => handleButton(btn.onPress)}
              >
                <Text style={[
                  styles.btnText,
                  btn.style === 'destructive' ? styles.btnDestructiveText : styles.btnPrimaryText,
                ]}>
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...theme.shadow.md,
  },

  header: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing[5],
    paddingTop:        theme.spacing[5],
    paddingBottom:     theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  titleText: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },

  body: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical:   theme.spacing[4],
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingBottom:     theme.spacing[4],
    paddingTop:        theme.spacing[2],
  },
  buttonColumn: {
    flexDirection: 'column',
  },

  btn: {
    borderRadius: theme.radius.lg,
    paddingVertical:   theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFlex: { flex: 1 },

  btnCancel: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  btnCancelText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.secondary,
  },

  btnPrimary: {
    backgroundColor: theme.colors.brand.primary,
  },
  btnPrimaryText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
  },

  btnDestructive: {
    backgroundColor: theme.colors.feedback.errorSubtle,
    borderWidth: 1,
    borderColor: theme.colors.feedback.error,
  },
  btnDestructiveText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.feedback.errorText,
  },

  btnText: {
    ...theme.typography.bodyMedium,
  },
});
