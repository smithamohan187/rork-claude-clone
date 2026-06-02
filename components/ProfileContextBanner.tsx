import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserCircle, Store } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface Props {
  profileType: 'personal' | 'business';
}

const PRIMARY_TINT = '#E8EBF8';

export default function ProfileContextBanner({ profileType }: Props) {
  const isPersonal = profileType === 'personal';
  const Icon = isPersonal ? UserCircle : Store;
  const text = isPersonal ? 'Viewing as Personal Account' : 'Managing Business Profile';
  const bg = isPersonal ? Colors.surfaceVariant : PRIMARY_TINT;
  const fg = isPersonal ? Colors.textSecondary : Colors.primaryDark;

  return (
    <View
      style={[styles.banner, { backgroundColor: bg }]}
      testID="profile-context-banner"
    >
      <Icon size={16} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
