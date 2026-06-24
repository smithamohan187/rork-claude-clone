import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ChevronDown } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext1';
import ProfileSwitcherModal from '@/components/ProfileSwitcherModal';

function firstName(name: string, max: number = 10): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1)}…`;
}

interface Props {
  testID?: string;
}

export default function ActiveProfileBadge({ testID }: Props) {
  const { activeProfile, profiles } = useAuth();
  const [open, setOpen] = useState<boolean>(false);

  const hasMultiple = profiles.length > 1;

  const handlePress = useCallback(() => {
    if (!hasMultiple) return;
    setOpen(true);
  }, [hasMultiple]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={!hasMultiple}
        style={({ pressed }) => [
          styles.badge,
          pressed && hasMultiple && styles.badgePressed,
        ]}
        accessibilityLabel={`Active profile ${activeProfile.displayName}. ${hasMultiple ? 'Tap to switch profile.' : ''}`}
        testID={testID ?? 'active-profile-badge'}
      >
        <Image
          source={{ uri: activeProfile.avatarUrl }}
          style={styles.avatar}
          contentFit="cover"
        />
        <Text style={styles.name} numberOfLines={1}>
          {firstName(activeProfile.displayName)}
        </Text>
        {hasMultiple ? (
          <ChevronDown size={14} color={Colors.textSecondary} style={styles.chevron} />
        ) : null}
      </Pressable>
      <ProfileSwitcherModal visible={open} onDismiss={handleDismiss} />
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 150,
  },
  badgePressed: {
    backgroundColor: Colors.borderLight,
    opacity: 0.85,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 6,
    letterSpacing: -0.1,
  },
  chevron: {
    marginLeft: 2,
  },
});
