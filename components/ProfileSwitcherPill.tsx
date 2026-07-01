import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { ProfileEntry } from '@/types';

function truncate(name: string, max: number = 14): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1).trimEnd()}…`;
}

interface PillProps {
  profile: ProfileEntry;
  isActive: boolean;
  isSwitching: boolean;
  onPress: (profile: ProfileEntry) => void;
}

const Pill = React.memo(function Pill({ profile, isActive, isSwitching, onPress }: PillProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress(profile);
  }, [profile, onPress]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isActive || isSwitching}
        style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
        testID={`profile-pill-${profile.id}`}
      >
        <View style={[styles.pillAvatarWrap, isActive && styles.pillAvatarWrapActive]}>
          <Image source={{ uri: profile.avatarUrl }} style={styles.pillAvatar} contentFit="cover" />
        </View>
        <Text
          style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}
          numberOfLines={1}
        >
          {truncate(profile.displayName)}
        </Text>
        {isSwitching ? (
          <ActivityIndicator
            size="small"
            color={isActive ? '#fff' : Colors.primary}
            style={styles.pillSpinner}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

export default function ProfileSwitcherPill() {
  const { activeProfile, profiles, switchProfile } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSelect = useCallback(
    async (profile: ProfileEntry) => {
      if (profile.id === activeProfile?.id) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSwitchingId(profile.id);
      try {
        await switchProfile(profile.id);
        showSnackbar(`Switched to ${profile.displayName}`);
      } catch (err) {
        console.log('[ProfileSwitcherPill] switch error', err);
      } finally {
        setSwitchingId(null);
      }
    },
    [activeProfile?.id, switchProfile, showSnackbar],
  );

  if (profiles.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      testID="profile-switcher-pill-row"
    >
      {profiles.map((profile) => (
        <Pill
          key={profile.id}
          profile={profile}
          isActive={profile.id === activeProfile?.id}
          isSwitching={switchingId === profile.id}
          onPress={handleSelect}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 40,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderColor: Colors.primary,
  },
  pillAvatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: Colors.surfaceVariant,
  },
  pillAvatarWrapActive: {
    borderWidth: 2,
    borderColor: '#fff',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  pillAvatar: {
    width: '100%',
    height: '100%',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  pillTextActive: {
    color: '#fff',
  },
  pillTextInactive: {
    color: Colors.primary,
  },
  pillSpinner: {
    marginLeft: 6,
  },
});
