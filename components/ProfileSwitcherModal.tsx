import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';


interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function ProfileSwitcherModal({ visible, onDismiss }: Props) {
  const { authUser, accountType, switchAccount } = useAuth();
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

            {/* Personal Profile Row — always visible */}
            <TouchableOpacity
              style={[styles.row, accountType === 'personal' && styles.rowActive]}
              onPress={async () => {
                await switchAccount('personal');
                handleClose();
              }}
              activeOpacity={0.7}
              testID="switcher-personal"
            >
              <View style={styles.avatarWrap}>
                {authUser?.avatar ? (
                  <Image source={{ uri: authUser.avatar }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {(authUser?.name ?? authUser?.email ?? 'P').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.info}>
                <Text style={styles.name}>{authUser?.name ?? authUser?.email ?? 'Personal'}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, styles.badgePersonal]}>
                    <Text style={[styles.badgeText, styles.badgeTextPersonal]}>Personal</Text>
                  </View>
                </View>
              </View>

              {accountType === 'personal' && (
                <View style={styles.checkWrap}>
                  <Check size={16} color="#1A5C35" />
                </View>
              )}
            </TouchableOpacity>

            {/* Business Profile Row — only if user has a business account */}
            {(authUser?.role === 'business' || authUser?.role === 'owner') && (
              <>
                <View style={styles.rowDivider} />
                <TouchableOpacity
                  style={[styles.row, accountType === 'business' && styles.rowActive]}
                  onPress={async () => {
                    await switchAccount('business');
                    handleClose();
                  }}
                  activeOpacity={0.7}
                  testID="switcher-business"
                >
                  <View style={styles.avatarWrap}>
                    {authUser?.avatar ? (
                      <Image source={{ uri: authUser.avatar }} style={styles.avatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback, styles.avatarFallbackBusiness]}>
                        <Text style={styles.avatarInitial}>
                          {(authUser?.name ?? 'B').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.info}>
                    <Text style={styles.name}>{authUser?.name ?? 'Business'}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, styles.badgeBusiness]}>
                        <Text style={[styles.badgeText, styles.badgeTextBusiness]}>Business</Text>
                      </View>
                    </View>
                  </View>

                  {accountType === 'business' && (
                    <View style={styles.checkWrap}>
                      <Check size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Add Business prompt — shown when user has no business profile yet */}
            {authUser?.role !== 'business' && authUser?.role !== 'owner' && (
              <>
                <View style={styles.rowDivider} />
                <TouchableOpacity
                  style={styles.createBusinessRow}
                  onPress={() => {
                    handleClose();
                  }}
                  activeOpacity={0.7}
                  testID="switcher-create-business"
                >
                  <View style={styles.avatarWrap}>
                    <View style={[styles.avatar, styles.avatarFallback, styles.avatarCreate]}>
                      <Text style={styles.avatarCreateText}>+</Text>
                    </View>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>Add Business Profile</Text>
                    <Text style={styles.subtitle}>Register your business on TouchPoint</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
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
  rowActive: {
    backgroundColor: '#F0FBF4',
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackBusiness: {
    backgroundColor: '#1A5C35',
  },
  avatarCreate: {
    backgroundColor: '#F3F4F6',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A5C35',
  },
  avatarCreateText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgePersonal: {
    backgroundColor: '#E6FAF5',
  },
  badgeBusiness: {
    backgroundColor: '#1A5C35',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  badgeTextPersonal: {
    color: '#0D9488',
  },
  badgeTextBusiness: {
    color: '#fff',
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A5C3514',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBusinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
});
