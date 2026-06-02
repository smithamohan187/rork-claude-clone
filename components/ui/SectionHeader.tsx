import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { THEME } from '@/theme/tokens';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

const SectionHeader = React.memo(function SectionHeader({
  title,
  actionLabel,
  onAction,
  testID,
}: SectionHeaderProps) {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          {({ pressed }) => (
            <Text style={[styles.action, pressed && styles.actionPressed]}>{actionLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  title: {
    ...THEME.type.titleMedium,
    color: THEME.colors.textPrimary,
  },
  action: {
    ...THEME.type.labelMedium,
    color: THEME.colors.primary,
  },
  actionPressed: {
    opacity: 0.6,
  },
});

export default SectionHeader;
