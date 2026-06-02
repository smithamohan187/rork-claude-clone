import React from 'react';
import { Pressable, Text, StyleSheet, View, ViewStyle, StyleProp, ActivityIndicator } from 'react-native';
import { THEME } from '@/theme/tokens';

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const SecondaryButton = React.memo(function SecondaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  testID,
}: SecondaryButtonProps) {
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
        <ActivityIndicator color={THEME.colors.primaryDark} size="small" />
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
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: THEME.colors.primaryDark,
    paddingHorizontal: THEME.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9, backgroundColor: THEME.colors.rippleTint },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: THEME.spacing.sm },
  label: {
    ...THEME.type.labelLarge,
    color: THEME.colors.primaryDark,
  },
});

export default SecondaryButton;
