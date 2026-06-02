import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '@/theme/tokens';

export type StatusType = 'active' | 'expired' | 'upcoming' | 'disabled' | 'cancelled' | 'used' | 'pending';

interface StatusPillProps {
  status: StatusType | string;
  label?: string;
  testID?: string;
}

const COLOR_BY_STATUS: Record<string, { bg: string; fg: string }> = {
  active: { bg: '#E6F7EC', fg: '#1A5C35' },
  upcoming: { bg: '#FCEFCF', fg: '#8A6A1B' },
  expired: { bg: '#EFEFEF', fg: '#6B6B6B' },
  used: { bg: '#E6F7EC', fg: '#1A5C35' },
  disabled: { bg: '#EFEFEF', fg: '#9E9E9E' },
  cancelled: { bg: '#FCEFCF', fg: '#8A6A1B' },
  pending: { bg: '#FCEFCF', fg: '#8A6A1B' },
};

const StatusPill = React.memo(function StatusPill({ status, label, testID }: StatusPillProps) {
  const key = String(status).toLowerCase();
  const palette = COLOR_BY_STATUS[key] ?? { bg: THEME.colors.surfaceVariant, fg: THEME.colors.textSecondary };
  const text = (label ?? status).toString();
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]} testID={testID}>
      <Text style={[styles.label, { color: palette.fg }]}>{text.charAt(0).toUpperCase() + text.slice(1)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    ...THEME.type.labelSmall,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default StatusPill;
