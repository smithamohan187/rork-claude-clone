import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  PanResponder,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  ChevronRight,
  User as UserIcon,
  Star,
  CreditCard,
  Bookmark,
  Heart,
  Users,
  Store,
  Gift,
  Settings as SettingsIcon,
  HelpCircle,
  Shield,
  FileText,
  LogOut,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSideDrawer } from '@/contexts/SideDrawerContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.round(SCREEN_WIDTH * 0.82);
const PRIMARY = '#00B246';
const DEEP = '#1A5C35';
const DEEP_DARKER = '#0D3D20';
const TEXT = '#1A1A1A';
const MUTED = '#6B6B6B';
const SEP = '#F2F2F2';
const CHEVRON = '#C0C0C0';
const SECTION_LABEL = '#9E9E9E';

type IconType = React.ComponentType<{ size?: number; color?: string }>;

interface MenuItem {
  key: string;
  label: string;
  Icon: IconType;
  route: string;
}

const ACCOUNT_ITEMS: MenuItem[] = [
  { key: 'edit-profile', label: 'Edit Profile', Icon: UserIcon, route: '/edit-profile' },
  { key: 'rewards', label: 'My Rewards & Points', Icon: Star, route: '/(tabs)/rewards' },
  { key: 'memberships', label: 'My Memberships', Icon: CreditCard, route: '/business-list' },
  { key: 'saved-businesses', label: 'Saved Businesses', Icon: Bookmark, route: '/saved-activity' },
  { key: 'saved-offers', label: 'Saved Offers', Icon: Heart, route: '/saved-activity' },
];

const COMMUNITY_ITEMS: MenuItem[] = [
  { key: 'referrals', label: 'My Referrals', Icon: Users, route: '/my-referrals' },
  { key: 'following', label: 'Businesses I Follow', Icon: Store, route: '/business-list' },
  { key: 'coupons', label: 'Coupons & Redemptions', Icon: Gift, route: '/(tabs)/rewards/coupons' },
];

const SUPPORT_ITEMS: MenuItem[] = [
  { key: 'settings', label: 'Settings', Icon: SettingsIcon, route: '/notification-preferences' },
  { key: 'help', label: 'Help & Support', Icon: HelpCircle, route: '/help-support' },
  { key: 'privacy', label: 'Privacy Policy', Icon: Shield, route: '/privacy-policy' },
  { key: 'terms', label: 'Terms of Service', Icon: FileText, route: '/terms-conditions' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || 'U';
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function MenuRow({
  item,
  onPress,
}: {
  item: MenuItem;
  onPress: (route: string) => void;
}) {
  const handle = useCallback(() => onPress(item.route), [item.route, onPress]);
  return (
    <Pressable
      onPress={handle}
      android_ripple={{ color: 'rgba(0,178,70,0.12)' }}
      style={({ pressed }) => [
        styles.row,
        pressed && Platform.OS === 'ios' ? styles.rowPressed : null,
      ]}
      testID={`drawer-row-${item.key}`}
    >
      <item.Icon size={22} color={DEEP} />
      <Text style={styles.rowLabel} numberOfLines={1}>{item.label}</Text>
      <ChevronRight size={18} color={CHEVRON} />
    </Pressable>
  );
}

const SideDrawer = React.memo(function SideDrawer() {
  const router = useRouter();
  const { isOpen, close } = useSideDrawer();
  const { currentUser, hasBusinessProfile, accountType, switchAccount } = useAuth();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -DRAWER_WIDTH,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, translateX, overlayOpacity]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => {
          if (g.dx <= 0) {
            translateX.setValue(g.dx);
            const progress = 1 - Math.min(1, Math.abs(g.dx) / DRAWER_WIDTH);
            overlayOpacity.setValue(progress);
          }
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -DRAWER_WIDTH / 3 || g.vx < -0.5) {
            close();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              tension: 65,
              friction: 11,
              useNativeDriver: true,
            }).start();
            Animated.timing(overlayOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [translateX, overlayOpacity, close],
  );

  const navigate = useCallback(
    (route: string) => {
      close();
      setTimeout(() => {
        router.push(route as never);
      }, 180);
    },
    [close, router],
  );

  const handlePointsPress = useCallback(() => {
    navigate('/(tabs)/rewards');
  }, [navigate]);

  const handleSwitchToBusiness = useCallback(async () => {
    close();
    await switchAccount(accountType === 'business' ? 'personal' : 'business');
  }, [close, switchAccount, accountType]);

  const handleLogout = useCallback(() => {
    close();
    setTimeout(() => {
      router.replace('/sign-in' as never);
    }, 180);
  }, [close, router]);

  if (!isOpen && (translateX as unknown as { _value: number })._value <= -DRAWER_WIDTH + 1) {
    // optimization: don't render if fully closed (but allow during animation)
  }

  const hasAvatar = !!currentUser?.avatar;
  const initials = getInitials(currentUser?.name ?? 'U');
  const totalPoints = currentUser?.points ?? 0;
  const isBusinessActive = accountType === 'business';

  return (
    <View
      style={[styles.root, { pointerEvents: isOpen ? 'auto' : 'none' }]}
      testID="side-drawer-root"
    >
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} testID="side-drawer-overlay" />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_WIDTH, transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          {/* Hero */}
          <LinearGradient
            colors={[DEEP_DARKER, DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroCircleLarge} />
            <View style={styles.heroCircleSmall} />

            <Pressable
              onPress={close}
              hitSlop={10}
              style={styles.closeBtn}
              testID="drawer-close"
              accessibilityLabel="Close menu"
            >
              <X size={20} color="#FFFFFF" />
            </Pressable>

            <View style={styles.heroAvatar}>
              {hasAvatar ? (
                <Image
                  source={{ uri: currentUser.avatar }}
                  style={styles.heroAvatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.heroAvatarImage, styles.heroAvatarFallback]}>
                  <Text style={styles.heroAvatarInitials}>{initials}</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroName} numberOfLines={1}>
              {currentUser?.name ?? 'Welcome'}
            </Text>
            <Text style={styles.heroEmail} numberOfLines={1}>
              {currentUser?.email ?? (currentUser?.username ? `@${currentUser.username}` : '')}
            </Text>

            <Pressable
              onPress={handlePointsPress}
              style={({ pressed }) => [styles.pointsPill, pressed && { opacity: 0.85 }]}
              testID="drawer-points-pill"
            >
              <Sparkles size={14} color="#FFFFFF" />
              <Text style={styles.pointsText}>{totalPoints.toLocaleString()} pts</Text>
            </Pressable>

            {hasBusinessProfile ? (
              <Pressable
                onPress={handleSwitchToBusiness}
                style={({ pressed }) => [styles.switchPill, pressed && { opacity: 0.85 }]}
                testID="drawer-switch-business"
              >
                <Store size={14} color="#FFFFFF" />
                <Text style={styles.switchText}>
                  {isBusinessActive ? 'Switch to Personal' : 'Switch to Business'}
                </Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </LinearGradient>

          {/* Menu */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel label="MY ACCOUNT" />
            {ACCOUNT_ITEMS.map((item, idx) => (
              <View key={item.key}>
                <MenuRow item={item} onPress={navigate} />
                {idx < ACCOUNT_ITEMS.length - 1 ? <View style={styles.separator} /> : null}
              </View>
            ))}

            <SectionLabel label="COMMUNITY" />
            {COMMUNITY_ITEMS.map((item, idx) => (
              <View key={item.key}>
                <MenuRow item={item} onPress={navigate} />
                {idx < COMMUNITY_ITEMS.length - 1 ? <View style={styles.separator} /> : null}
              </View>
            ))}

            <SectionLabel label="SUPPORT" />
            {SUPPORT_ITEMS.map((item, idx) => (
              <View key={item.key}>
                <MenuRow item={item} onPress={navigate} />
                {idx < SUPPORT_ITEMS.length - 1 ? <View style={styles.separator} /> : null}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>TouchPoint v1.0</Text>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
              testID="drawer-logout"
            >
              <LogOut size={16} color="#DC2626" />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  safe: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 220,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  heroCircleLarge: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroCircleSmall: {
    position: 'absolute',
    bottom: 20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 2,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    backgroundColor: DEEP,
    marginTop: 8,
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
  },
  heroAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DEEP,
  },
  heroAvatarInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  heroName: {
    marginTop: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  heroEmail: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '400',
  },
  pointsPill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pointsText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  switchPill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  switchText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  sectionLabel: {
    color: SECTION_LABEL,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  rowPressed: {
    backgroundColor: 'rgba(0,178,70,0.08)',
  },
  rowLabel: {
    flex: 1,
    color: TEXT,
    fontWeight: '600',
    fontSize: 15,
  },
  separator: {
    height: 1,
    backgroundColor: SEP,
    marginLeft: 56,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: SEP,
    backgroundColor: '#FFFFFF',
  },
  versionText: {
    color: CHEVRON,
    fontSize: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SideDrawer;

export { MUTED };
