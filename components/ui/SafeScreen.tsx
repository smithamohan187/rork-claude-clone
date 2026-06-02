import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { THEME } from '@/theme/tokens';

interface SafeScreenProps {
  children: React.ReactNode;
  /** Which edges of the safe area to respect. Defaults to top/left/right (bottom is usually handled by tab bar or sticky CTA). */
  edges?: Edge[];
  /** Background color of the safe area root. Defaults to theme background. */
  backgroundColor?: string;
  /** StatusBar style. 'auto' picks based on backgroundColor brightness. */
  statusBarStyle?: 'light-content' | 'dark-content' | 'auto';
  /** Wraps children in KeyboardAvoidingView with platform-correct behavior. */
  keyboardAvoiding?: boolean;
  /** Extra style on the outer SafeAreaView. */
  style?: StyleProp<ViewStyle>;
  /** Inner content style (applied to the View or KeyboardAvoidingView child). */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

function isLight(hex: string): boolean {
  // crude luminance check, good enough for picking status bar
  const m = hex.replace('#', '');
  if (m.length < 6) return true;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/**
 * Drop-in safe area wrapper used by every screen.
 *
 * - Uses SafeAreaView from `react-native-safe-area-context` (not core RN).
 * - Sets an explicit StatusBar style based on the background.
 * - Optionally enables KeyboardAvoidingView with iOS/Android-correct behavior.
 */
const SafeScreen = React.memo(function SafeScreen({
  children,
  edges = ['top', 'left', 'right'],
  backgroundColor = THEME.colors.background,
  statusBarStyle = 'auto',
  keyboardAvoiding = false,
  style,
  contentStyle,
  testID,
}: SafeScreenProps) {
  const resolvedBarStyle =
    statusBarStyle === 'auto' ? (isLight(backgroundColor) ? 'dark-content' : 'light-content') : statusBarStyle;

  const inner = (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor }, style]} testID={testID}>
      <StatusBar barStyle={resolvedBarStyle} backgroundColor={Platform.OS === 'android' ? backgroundColor : undefined} />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default SafeScreen;
