import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle2, Circle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { ProfileEntry } from '@/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function ProfileSwitcherModal({ visible, onDismiss }: Props) {
  const { activeProfile, profiles, switchProfile } = useAuth();
  const { showSnackbar } = useSnackbar();
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(sheetAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
      sheetAnim.setValue(0);
    }
  }, [visible, backdropAnim, sheetAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [backdropAnim, sheetAnim, onDismiss]);

  const handleSelect = useCallback(
    async (profile: ProfileEntry) => {
      if (profile.id === activeProfile.id) {
        handleClose();
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      handleClose();
      setTimeout(async () => {
        try {
          await switchProfile(profile.id);
          showSnackbar(`Switched to ${profile.displayName}`);
        } catch (err) {
          console.log('[ProfileSwitcherModal] switch error', err);
        }
      }, 220);
    },
    [activeProfile.id, switchProfile, showSnackbar, handleClose],
  );

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <View style={styles.positioner} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>Switch Profile</Text>
            <View style={styles.divider} />

            {profiles.map((profile) => {
              const isActive = profile.id === activeProfile.id;
              const isPersonal = profile.type === 'personal';
              return (
                <TouchableOpacity
                  key={profile.id}
                  style={styles.row}
                  onPress={() => handleSelect(profile)}
                  activeOpacity={0.7}
                  testID={`switcher-modal-row-${profile.id}`}
                >
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {profile.displayName}
                    </Text>
                    <Text style={styles.subtitle}>
                      {isPersonal ? 'Personal Account' : 'Business Profile'}
                    </Text>
                  </View>
                  {isActive ? (
                    <CheckCircle2 size={24} color={Colors.primary} />
                  ) : (
                    <Circle size={24} color={Colors.textTertiary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  positioner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: -16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceVariant,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
