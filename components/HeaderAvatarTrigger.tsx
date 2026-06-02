import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useSideDrawer } from '@/contexts/SideDrawerContext';

const PRIMARY = '#00B246';
const DEEP = '#1A5C35';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || 'U';
}

interface Props {
  size?: number;
  testID?: string;
}

const HeaderAvatarTrigger = React.memo(function HeaderAvatarTrigger({ size = 36, testID }: Props) {
  const { currentUser } = useAuth();
  const { open } = useSideDrawer();

  const handlePress = useCallback(() => {
    console.log('[HeaderAvatarTrigger] opening drawer');
    open();
  }, [open]);

  const hasAvatar = !!currentUser?.avatar;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityLabel="Open menu"
      accessibilityRole="button"
      testID={testID ?? 'header-avatar-trigger'}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {hasAvatar ? (
          <Image
            source={{ uri: currentUser.avatar }}
            style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.fallback,
              { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 },
            ]}
          >
            <Text style={styles.initials}>{getInitials(currentUser?.name ?? 'U')}</Text>
          </View>
        )}
      </View>
      <View style={[styles.dot, { right: 0, bottom: 0 }]} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default HeaderAvatarTrigger;
