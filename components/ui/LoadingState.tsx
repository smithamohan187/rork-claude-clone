import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { THEME } from '@/theme/tokens';

interface LoadingStateProps {
  label?: string;
  testID?: string;
}

const LoadingState = React.memo(function LoadingState({ label = 'Loading…', testID }: LoadingStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <ActivityIndicator size="large" color={THEME.colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  label: {
    ...THEME.type.bodySmall,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.sm,
  },
});

export default LoadingState;
