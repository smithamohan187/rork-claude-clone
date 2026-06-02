import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenScrollViewProps extends ScrollViewProps {
  /** Extra padding added below the safe area inset. Defaults to 20. */
  extraBottomPadding?: number;
  /** If true (default), inset.bottom is added to paddingBottom. Disable for screens that already have a sticky BottomActionBar. */
  respectBottomInset?: boolean;
}

/**
 * ScrollView wrapper that automatically pads its bottom content area above
 * the iPhone home indicator / Android nav bar, so the last item is never
 * hidden behind the tab bar.
 *
 * Usage:
 *   <ScreenScrollView>...</ScreenScrollView>
 *   <ScreenScrollView extraBottomPadding={40}>...</ScreenScrollView>
 *   <ScreenScrollView respectBottomInset={false}>...</ScreenScrollView>  // when a sticky CTA sits below
 */
const ScreenScrollView = React.forwardRef<ScrollView, ScreenScrollViewProps>(function ScreenScrollView(
  { extraBottomPadding = 20, respectBottomInset = true, contentContainerStyle, children, ...rest },
  ref,
) {
  const insets = useSafeAreaInsets();
  const paddingBottom = (respectBottomInset ? insets.bottom : 0) + extraBottomPadding;
  return (
    <ScrollView
      ref={ref}
      contentContainerStyle={[{ paddingBottom }, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
});

export default ScreenScrollView;

// Re-export StyleSheet so consumers don't have to import RN just for this file.
export { StyleSheet };
