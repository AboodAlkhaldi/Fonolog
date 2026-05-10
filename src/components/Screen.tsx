import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';

interface Props {
  children:        React.ReactNode;
  /** Whether to wrap content in a ScrollView. Default: true. */
  scroll?:         boolean;
  /** Disable safe-area top inset (e.g. when a header handles it). Default: false. */
  edges?:          ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?:   ViewStyle;
  scrollProps?:    ScrollViewProps;
  backgroundColor?:string;
}

/** Standard screen wrapper. Use this on every route. */
export function Screen({
  children,
  scroll        = true,
  edges         = ['top', 'bottom', 'left', 'right'],
  contentStyle,
  scrollProps,
  backgroundColor = theme.colors.background.primary,
}: Props) {
  const Inner = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.viewContent, contentStyle]}>{children}</View>
  );

  const safeAreaStyle: StyleProp<ViewStyle> = [styles.safeArea, { backgroundColor }];

  return (
    <SafeAreaView edges={edges} style={safeAreaStyle}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {Inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex:     { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[5],
    paddingVertical:   theme.spacing[4],
  },
  viewContent: {
    flex: 1,
    paddingHorizontal: theme.spacing[5],
    paddingVertical:   theme.spacing[4],
  },
});
