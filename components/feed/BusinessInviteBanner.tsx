import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ChevronRight,
  Mail,
  MessageSquare,
  Store,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';

const PURPLE = '#00B246';
const PURPLE_DEEP = '#1A5C35';
const PURPLE_LIGHT = '#00B246';
const ORANGE = '#1A5C35';
const WHATSAPP = '#25D366';

const SHEET_HEIGHT = 420;

export interface BusinessInviteBannerProps {
  style?: object;
}

/**
 * Build the business-invite referral code from the current user id.
 * Mirrors the spec: BIZ_<first6 of userId, uppercased>.
 */
export function buildBusinessReferralCode(userId: string | undefined): string {
  const slug = (userId ?? 'guest').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'GUEST';
  return `BIZ_${slug}`;
}

export function buildBusinessReferralLink(userId: string | undefined): string {
  return `https://touchpoint.app/business/join?ref=${buildBusinessReferralCode(userId)}`;
}

const WhatsAppGlyph = ({ size = 22 }: { size?: number }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: WHATSAPP,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text style={{ color: '#fff', fontSize: size * 0.55, fontWeight: '800' }}>W</Text>
  </View>
);

export default function BusinessInviteBanner({ style }: BusinessInviteBannerProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  const referralCode = useMemo(() => buildBusinessReferralCode(currentUser?.id), [currentUser?.id]);
  const referralLink = useMemo(() => buildBusinessReferralLink(currentUser?.id), [currentUser?.id]);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdrop, translateY]);

  const animateOut = useCallback(
    (cb?: () => void) => {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        cb?.();
      });
    },
    [backdrop, translateY],
  );

  const openSheet = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSheetOpen(true);
    requestAnimationFrame(() => animateIn());
  }, [animateIn]);

  const closeSheet = useCallback(() => {
    animateOut(() => setSheetOpen(false));
  }, [animateOut]);

  const navTo = useCallback(
    (path: '/business-invite-sms' | '/business-invite-email' | '/business-invite-whatsapp') => {
      animateOut(() => {
        setSheetOpen(false);
        router.push({ pathname: path, params: { referralCode, referralLink } });
      });
    },
    [animateOut, router, referralCode, referralLink],
  );

  return (
    <>
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel="Know a business? Invite them to join TouchPoint."
        style={[styles.cardWrap, style]}
        testID="business-invite-banner"
      >
        <LinearGradient
          colors={[PURPLE, PURPLE_LIGHT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconCircle}>
            <Store size={26} color="#fff" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.heading}>Know a Business? Invite Them!</Text>
            <Text style={styles.body} numberOfLines={3}>
              Earn loyalty points every time a new business joins TouchPoint through your referral
              link. Help your community grow and get rewarded!
            </Text>
            <View style={styles.btnRow}>
              <Pressable
                onPress={openSheet}
                style={styles.cta}
                hitSlop={6}
                testID="business-invite-cta"
              >
                <Text style={styles.ctaText}>Invite a Business</Text>
                <ArrowRight size={14} color="#fff" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSheet}
      >
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(15,12,40,0.55)',
                opacity: backdrop,
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY }] },
            ]}
          >
            <SafeAreaView edges={['bottom']}>
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <View style={{ width: 32 }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.sheetTitle}>Invite via</Text>
                  <Text style={styles.sheetSubtitle}>
                    Your referral code is embedded in every invite link
                  </Text>
                </View>
                <Pressable onPress={closeSheet} hitSlop={10} style={styles.closeIcon}>
                  <X size={18} color="#5C5F72" />
                </Pressable>
              </View>

              <View style={styles.tilesWrap}>
                <OptionTile
                  icon={<MessageSquare size={22} color={PURPLE} />}
                  title="SMS"
                  subtitle="Send a text to phone contacts"
                  onPress={() => navTo('/business-invite-sms')}
                  testID="invite-tile-sms"
                />
                <OptionTile
                  icon={<Mail size={22} color={PURPLE} />}
                  title="Email"
                  subtitle="Compose an invite email"
                  onPress={() => navTo('/business-invite-email')}
                  testID="invite-tile-email"
                />
                <OptionTile
                  icon={<WhatsAppGlyph />}
                  title="WhatsApp"
                  subtitle="Share via WhatsApp contacts"
                  onPress={() => navTo('/business-invite-whatsapp')}
                  testID="invite-tile-whatsapp"
                />
              </View>

              <Pressable onPress={closeSheet} style={styles.cancelBtn} testID="invite-sheet-cancel">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function OptionTile({
  icon,
  title,
  subtitle,
  onPress,
  testID,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
      testID={testID}
    >
      <View style={styles.tileStrip} />
      <View style={styles.tileIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color="#9aa0b3" />
    </Pressable>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
void SCREEN_WIDTH;

const styles = StyleSheet.create({
  cardWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: PURPLE_DEEP,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, minWidth: 0 },
  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  body: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.92)',
  },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E0EA',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: PURPLE_DEEP, letterSpacing: -0.2 },
  sheetSubtitle: { fontSize: 12, color: '#1A5C35', marginTop: 2, textAlign: 'center' },
  closeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F1FA',
  },
  tilesWrap: { gap: 10 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 18,
    borderWidth: 1,
    borderColor: '#E8F5EE',
    overflow: 'hidden',
  },
  tileStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: PURPLE,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { fontSize: 15, fontWeight: '800', color: '#1A5C35' },
  tileSubtitle: { fontSize: 12, color: '#1A5C35', marginTop: 2 },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F3F1FA',
  },
  cancelText: { color: PURPLE_DEEP, fontWeight: '800', fontSize: 14 },
});
