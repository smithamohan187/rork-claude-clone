import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Smartphone, Download } from 'lucide-react-native';
import { MOCK_BUSINESS, getBusinessById } from '@/mocks/businessProfile';

const INDIGO = '#00B246';
const PURPLE = '#00B246';
const APP_STORE_URL = 'https://apps.apple.com/app/touchpoints/id000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.touchpoints';

export default function BusinessQRRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const business = getBusinessById(id ?? '') ?? MOCK_BUSINESS;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const t = setTimeout(() => {
      router.replace({
        pathname: '/business-profile/[id]',
        params: { id: id ?? business.id, subscribe: '1' },
      } as never);
    }, 250);
    return () => clearTimeout(t);
  }, [id, business.id, router]);

  const openInApp = () => {
    router.replace({
      pathname: '/business-profile/[id]',
      params: { id: id ?? business.id, subscribe: '1' },
    } as never);
  };

  const openStore = () => {
    const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch((e) => console.log('[BusinessQRRedirect] openURL failed', e));
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.loaderRoot}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={INDIGO} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[INDIGO, PURPLE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroLogoWrap}>
          <Image source={{ uri: business.logo }} style={styles.heroLogo} contentFit="cover" />
        </View>
        <Text style={styles.heroEyebrow}>SUBSCRIBE ON TOUCHPOINT</Text>
        <Text style={styles.heroName} numberOfLines={2}>{business.name}</Text>
        <Text style={styles.heroCategory}>{business.category}</Text>
        <View style={styles.welcomePill}>
          <Sparkles size={13} color="#fff" />
          <Text style={styles.welcomePillText}>
            Earn {business.welcomePoints} welcome points
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.bodyTitle}>Open in TouchPoint</Text>
        <Text style={styles.bodySubtitle}>
          Subscribe in one tap and start earning rewards on every visit.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={openInApp} activeOpacity={0.85}>
          <Smartphone size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Open TouchPoint</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={openStore} activeOpacity={0.85}>
          <Download size={18} color={INDIGO} />
          <Text style={styles.secondaryBtnText}>Get the App</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Don&apos;t have the app yet? Install it and we&apos;ll bring you right back here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5FB' },
  root: { flex: 1, backgroundColor: '#F4F5FB' },
  hero: {
    paddingTop: 56,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroLogoWrap: {
    width: 84,
    height: 84,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
    marginBottom: 14,
  },
  heroLogo: { width: '100%', height: '100%' },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  heroName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroCategory: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  welcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 14,
  },
  welcomePillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: {
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: 'center',
  },
  bodyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1D2E',
    letterSpacing: -0.2,
  },
  bodySubtitle: {
    fontSize: 14,
    color: '#5C5F72',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: INDIGO,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    width: '100%',
    maxWidth: 360,
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECEEF8',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    width: '100%',
    maxWidth: 360,
  },
  secondaryBtnText: { color: INDIGO, fontSize: 15, fontWeight: '700' },
  footnote: {
    fontSize: 12,
    color: '#5C5F72',
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 320,
    lineHeight: 18,
  },
});
