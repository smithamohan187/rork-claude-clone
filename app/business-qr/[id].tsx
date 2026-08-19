import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Share,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Copy, Share2, Check } from 'lucide-react-native';
import BusinessQRCard from '@/components/business/BusinessQRCard';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useBusinessScanCode } from '@/hooks/useBusinessScanCode';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRewardConfig } from '@/api/services/rewardConfigService';

const INDIGO = '#00B246';
const TEXT_PRIMARY = '#1A1D2E';
const TEXT_SECONDARY = '#5C5F72';

export default function BusinessQRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authUser, authLoading } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);

  const { business, loading: profileLoading } = useBusinessProfile(id ?? '');

  // Owner-only: the viewer must own this business. The backend scan-code endpoint enforces this too.
  const isOwner = useMemo(
    () => !!authUser && !!business && authUser.id === business.owner_user_id,
    [authUser, business],
  );

  const { url: scanCodeUrl } = useBusinessScanCode(id ?? '', isOwner);

  // Welcome-points value from reward_config — never hardcoded.
  const [welcomePoints, setWelcomePoints] = useState<number>(0);
  useEffect(() => {
    if (!id || !isOwner) return;
    let cancelled = false;
    fetchRewardConfig(id)
      .then((data) => { if (!cancelled) setWelcomePoints(data.config?.welcome_bonus_points ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id, isOwner]);

  // Non-owners are bounced — they must never see the large QR view. Gated on authLoading so a
  // cold/direct navigation (session restore still in flight) doesn't misread the real owner as a
  // non-owner and bounce them before authUser has loaded.
  useEffect(() => {
    if (!authLoading && !profileLoading && business && !isOwner) {
      router.replace({ pathname: '/business-profile/[id]', params: { id: id ?? business.id } } as never);
    }
  }, [authLoading, profileLoading, business, isOwner, id, router]);

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
    if (!scanCodeUrl) return;
    try {
      await Clipboard.setStringAsync(scanCodeUrl);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.log('[BusinessQR] copy failed', e);
    }
  }, [scanCodeUrl]);

  const handleShare = useCallback(async () => {
    if (!scanCodeUrl) return;
    try {
      await Share.share({
        message: `Subscribe to ${business?.name ?? 'us'} on TouchPoint and start earning rewards: ${scanCodeUrl}`,
        url: Platform.OS === 'ios' ? scanCodeUrl : undefined,
      });
    } catch (e) {
      console.log('[BusinessQR] share failed', e);
    }
  }, [business?.name, scanCodeUrl]);

  // While resolving profile/ownership, or bouncing a non-owner, show a spinner rather than any QR.
  if (profileLoading || !business || !isOwner) {
    return (
      <View style={styles.loaderRoot} testID="business-qr-loading">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={INDIGO} />
      </View>
    );
  }

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
          Customers scan to subscribe and start earning {welcomePoints} welcome points.
        </Text>

        <View style={styles.cardWrap}>
          <BusinessQRCard
            businessId={id ?? business.id}
            businessName={business.name}
            businessLogo={business.logo_url ?? ''}
            category={business.category_name ?? undefined}
            qrSize={260}
            qrUrl={scanCodeUrl ?? undefined}
            onShare={handleShare}
          />
        </View>

        <View style={styles.linkBox}>
          <Text style={styles.linkLabel}>Public link</Text>
          <Text style={styles.linkValue} numberOfLines={1} testID="business-qr-link">
            {scanCodeUrl ?? '…'}
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
  loaderRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5FB' },
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
