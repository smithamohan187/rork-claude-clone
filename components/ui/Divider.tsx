import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { THEME } from '@/theme/tokens';

interface DividerProps {
  inset?: number;
  style?: StyleProp<ViewStyle>;
}

const Divider = React.memo(function Divider({ inset = 0, style }: DividerProps) {
  return <View style={[styles.divider, { marginLeft: inset }, style]} />;
});

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.colors.divider,
  },
});

export default Divider;
