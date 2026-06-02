import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Copy, Share2, Check } from 'lucide-react-native';
import BusinessQRCard, { buildBusinessQRUrl } from '@/components/business/BusinessQRCard';
import { MOCK_BUSINESS, getBusinessById } from '@/mocks/businessProfile';

const INDIGO = '#00B246';
const TEXT_PRIMARY = '#1A1D2E';
const TEXT_SECONDARY = '#5C5F72';

export default function BusinessQRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [copied, setCopied] = useState<boolean>(false);

  const business = useMemo(
    () => getBusinessById(id ?? '') ?? MOCK_BUSINESS,
    [id],
  );
  const qrUrl = useMemo(() => buildBusinessQRUrl(id ?? business.id), [id, business.id]);

  useEffect(() => {
    let prev: number | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          await activateKeepAwakeAsync('business-qr-screen');
          const { status } = await Brightness.requestPermissionsAsync();
          if (status === 'granted') {
            try {
              prev = await Brightness.getBrightnessAsync();
            } catch (e) {
              console.log('[BusinessQR] getBrightnessAsync failed', e);
            }
            if (!cancelled) {
              await Brightness.setBrightnessAsync(1);
            }
          }
        }
      } catch (e) {
        console.log('[BusinessQR] brightness/keepAwake setup failed', e);
      }
    })();
    return () => {
      cancelled = true;
      if (Platform.OS !== 'web') {
        try {
          deactivateKeepAwake('business-qr-screen');
        } catch (e) {
          console.log('[BusinessQR] deactivateKeepAwake failed', e);
        }
        if (prev != null) {
          Brightness.setBrightnessAsync(prev).catch(() => {});
        } else {
          Brightness.restoreSystemBrightnessAsync?.().catch(() => {});
        }
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(qrUrl);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.log('[BusinessQR] copy failed', e);
    }
  }, [qrUrl]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Subscribe to ${business.name} on TouchPoint and start earning rewards: ${qrUrl}`,
        url: Platform.OS === 'ios' ? qrUrl : undefined,
      });
    } catch (e) {
      console.log('[BusinessQR] share failed', e);
    }
  }, [business.name, qrUrl]);

  return (
    <View style={styles.root} testID="business-qr-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
            testID="business-qr-back"
          >
            <ArrowLeft size={20} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My QR Code</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>SHOW THIS AT YOUR COUNTER</Text>
        <Text style={styles.lead}>
          Customers scan to subscribe and start earning {business.welcomePoints} welcome points.
        </Text>

        <View style={styles.cardWrap}>
          <BusinessQRCard
            businessId={id ?? business.id}
            businessName={business.name}
            businessLogo={business.logo}
            category={business.category}
            qrSize={260}
            onShare={handleShare}
          />
        </View>

        <View style={styles.linkBox}>
          <Text style={styles.linkLabel}>Public link</Text>
          <Text style={styles.linkValue} numberOfLines={1} testID="business-qr-link">
            {qrUrl}
          </Text>
          <View style={styles.linkActions}>
            <TouchableOpacity
              style={[styles.linkBtn, styles.linkBtnGhost]}
              onPress={handleCopy}
              activeOpacity={0.85}
              testID="copy-qr-link"
            >
              {copied ? (
                <Check size={15} color={INDIGO} />
              ) : (
                <Copy size={15} color={INDIGO} />
              )}
              <Text style={styles.linkBtnGhostText}>
                {copied ? 'Copied' : 'Copy link'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkBtn, styles.linkBtnFilled]}
              onPress={handleShare}
              activeOpacity={0.85}
              testID="share-qr-link"
            >
              <Share2 size={15} color="#fff" />
              <Text style={styles.linkBtnFilledText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>Tips</Text>
          <Text style={styles.tipText}>
            • Print and place at the counter, on receipts, or in your shop window.
          </Text>
          <Text style={styles.tipText}>
            • Works with any camera or Google Lens — no app required to scan.
          </Text>
          <Text style={styles.tipText}>
            • Customers without the app are guided to install it, then land here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FB' },
  headerSafe: { backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF8',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F5FB',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: INDIGO,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  lead: {
    fontSize: 15,
    lineHeight: 21,
    color: TEXT_SECONDARY,
    marginBottom: 22,
  },
  cardWrap: {
    marginBottom: 22,
  },
  linkBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEEF8',
    marginBottom: 16,
  },
  linkLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  linkValue: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '600',
    marginBottom: 12,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  linkBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 999,
  },
  linkBtnGhost: {
    backgroundColor: '#ECEEF8',
  },
  linkBtnGhostText: {
    color: INDIGO,
    fontSize: 13,
    fontWeight: '700',
  },
  linkBtnFilled: {
    backgroundColor: INDIGO,
  },
  linkBtnFilledText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  tipsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEEF8',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
});
