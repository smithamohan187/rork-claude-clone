import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '@/theme/tokens';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Override the bottom padding inside the ScrollView. Defaults to insets.bottom + 24. */
  extraBottomPadding?: number;
  testID?: string;
}

const ScreenWrapper = React.memo(function ScreenWrapper({
  children,
  scrollable = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  style,
  contentStyle,
  extraBottomPadding = 24,
  testID,
}: ScreenWrapperProps) {
  const innerPadding = padded ? { paddingHorizontal: THEME.spacing.md } : null;
  const insets = useSafeAreaInsets();
  const dynamicBottom = { paddingBottom: insets.bottom + extraBottomPadding };

  if (scrollable) {
    return (
      <SafeAreaView edges={edges} style={[styles.root, style]} testID={testID}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[dynamicBottom, innerPadding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.root, style]} testID={testID}>
      <View style={[styles.flex, innerPadding, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  flex: { flex: 1 },
});

export default ScreenWrapper;
