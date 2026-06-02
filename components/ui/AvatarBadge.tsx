import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { THEME } from '@/theme/tokens';

interface AvatarBadgeProps {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  badgeCount?: number;
  testID?: string;
}

const SIZE_MAP = { sm: 32, md: 44, lg: 64 } as const;

const initialsOf = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('');
};

const AvatarBadge = React.memo(function AvatarBadge({
  uri,
  name,
  size = 'md',
  badgeCount,
  testID,
}: AvatarBadgeProps) {
  const dim = SIZE_MAP[size];
  const fontSize = dim * 0.4;
  const [failed, setFailed] = React.useState<boolean>(false);
  const showImage = !!uri && !failed;

  return (
    <View style={{ width: dim, height: dim }} testID={testID}>
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initialsOf(name)}</Text>
        </View>
      )}
      {badgeCount && badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    backgroundColor: THEME.colors.surfaceVariant,
  },
  fallback: {
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.colors.error,
    borderWidth: 2,
    borderColor: THEME.colors.surface,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AvatarBadge;
