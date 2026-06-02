import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HeroDiscoveryBannerProps {
  onExplorePress: () => void;
}

export function HeroDiscoveryBanner({ onExplorePress }: HeroDiscoveryBannerProps) {
  return (
    <View style={styles.outer} testID="hero-discovery-banner">
      <LinearGradient
        colors={["#0D3D20", "#1A5C35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View pointerEvents="none" style={styles.circleLarge} />
        <View pointerEvents="none" style={styles.circleSmall} />

        {/* Soft center glow */}
        <View pointerEvents="none" style={styles.centerGlow} />

        <View style={styles.pill}>
          <Text style={styles.pillText}>✦ Discover & Follow</Text>
        </View>

        <Text style={styles.heading1}>Follow the businesses</Text>
        <Text style={styles.heading2}>that matter most to you</Text>

        <Text style={styles.subtext}>
          Goodwill, loyalty, referrals and rewards{'\n'}All in one place.
        </Text>

        <View style={styles.ctaRow}>
          <Pressable
            onPress={onExplorePress}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            testID="hero-explore-btn"
          >
            <Text style={styles.primaryBtnText}>Explore Businesses</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color="#1A5C35" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    minHeight: 200,
    position: 'relative',
  },
  circleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: -50,
    top: -60,
  },
  circleSmall: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
    left: -20,
    bottom: -25,
  },
  centerGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0,178,70,0.15)',
    alignSelf: 'center',
    top: '20%',
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  heading1: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4ADE80',
    lineHeight: 30,
  },
  subtext: {
    marginTop: 10,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  ctaRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A5C35',
  },

});

export default HeroDiscoveryBanner;
