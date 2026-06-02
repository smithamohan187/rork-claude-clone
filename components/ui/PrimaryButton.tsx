import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View, ViewStyle, StyleProp } from 'react-native';
import { THEME } from '@/theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const PrimaryButton = React.memo(function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
  testID,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={THEME.colors.textOnPrimary} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.primaryDark,
    paddingHorizontal: THEME.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: THEME.spacing.sm },
  label: {
    ...THEME.type.labelLarge,
    color: THEME.colors.textOnPrimary,
  },
});

export default PrimaryButton;
