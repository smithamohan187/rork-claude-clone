import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface InviteFriendsBannerProps {
  onPress?: () => void;
}

const InviteFriendsBanner = React.memo(function InviteFriendsBanner({ onPress }: InviteFriendsBannerProps) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    console.log('[InviteFriendsBanner] pressed -> invite-friends/contacts');
    router.push('/invite-friends/contacts' as never);
  }, [onPress, router]);

  return (
    <View style={styles.wrap} testID="invite-friends-banner">
      <LinearGradient
        colors={['#1A5C35', '#1A5C35', '#00B246']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.bgCircle, styles.bgCircle1]} />
        <View style={[styles.bgCircle, styles.bgCircle2]} />
        <View style={[styles.bgCircle, styles.bgCircle3]} />

        <Text style={styles.title}>Invite Friends to TouchPoint 🎉</Text>
        <Text style={styles.body}>
          Every friend you bring to TouchPoint adds to your total points score. Rack up enough points and earn exclusive badges — Silver, Gold, or Platinum — based on your all-time points total.
        </Text>
        <Text style={styles.tagline}>
          No cash, no payouts — just recognition, perks, and bragging rights!
        </Text>

        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          testID="invite-friends-banner-cta"
        >
          <Text style={styles.ctaText}>Invite Now</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#1A5C35',
        shadowOpacity: 0.32,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  gradient: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
    overflow: 'hidden',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  body: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  tagline: {
    color: '#FFD580',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 10,
    lineHeight: 18,
  },
  cta: {
    marginTop: 18,
    backgroundColor: '#FF7043',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bgCircle1: {
    width: 140,
    height: 140,
    top: -50,
    right: -40,
  },
  bgCircle2: {
    width: 80,
    height: 80,
    bottom: -30,
    left: -20,
  },
  bgCircle3: {
    width: 40,
    height: 40,
    top: 30,
    right: 80,
  },
});

export default InviteFriendsBanner;
