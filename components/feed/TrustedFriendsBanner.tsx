import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Users, ArrowRight } from 'lucide-react-native';
import { getTrustedFriendsSummary } from '@/app/my-referrals';

const TrustedFriendsBanner = React.memo(function TrustedFriendsBanner() {
  const router = useRouter();
  const { count, pointsEarned } = getTrustedFriendsSummary();

  const handlePress = useCallback(() => {
    console.log('[TrustedFriendsBanner] tap -> /my-referrals');
    router.push('/my-referrals' as never);
  }, [router]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
      testID="trusted-friends-banner"
    >
      <LinearGradient
        colors={['#00B246', '#00B246']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconWrap}>
          <Users size={20} color="#FFFFFF" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Your Trusted Friends</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {count} {count === 1 ? 'friend' : 'friends'} referred · {pointsEarned} points earned
          </Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>View</Text>
          <ArrowRight size={13} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#00B246',
        shadowOpacity: 0.22,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  wrapPressed: {
    opacity: 0.92,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11.5,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A5C35',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default TrustedFriendsBanner;
