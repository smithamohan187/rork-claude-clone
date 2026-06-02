import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Linking,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Flashlight,
  FlashlightOff,
  CameraOff,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Ban,
  Camera as CameraIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useCoupons, RedeemResult } from '@/contexts/CouponContext';

const PURPLE = '#1A5C35';
const SCAN_SIZE = 240;

type ResultView =
  | { kind: 'success'; customerName: string; rewardTitle: string; pointsDeducted: number }
  | { kind: 'already_used'; usedAt: number }
  | { kind: 'expired'; expiredAt: number }
  | { kind: 'wrong_business' }
  | { kind: 'not_found' };

function mapResult(result: RedeemResult): ResultView {
  if (result.ok) {
    return {
      kind: 'success',
      customerName: result.coupon.customerName ?? 'Customer',
      rewardTitle: result.coupon.rewardTitle,
      pointsDeducted: result.coupon.pointsDeducted,
    };
  }
  if (result.error === 'already_used') {
    return { kind: 'already_used', usedAt: result.usedAt };
  }
  if (result.error === 'expired') {
    return { kind: 'expired', expiredAt: result.expiredAt };
  }
  if (result.error === 'wrong_business') {
    return { kind: 'wrong_business' };
  }
  return { kind: 'not_found' };
}

function formatManual(raw: string): string {
  const cleaned = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 10);
  const parts: string[] = [];
  if (cleaned.length <= 2) return cleaned;
  parts.push(cleaned.slice(0, 2));
  if (cleaned.length <= 6) {
    parts.push(cleaned.slice(2));
  } else {
    parts.push(cleaned.slice(2, 6));
    parts.push(cleaned.slice(6, 10));
  }
  return parts.join('-');
}

function ResultOverlay({
  view,
  onDismiss,
}: {
  view: ResultView;
  onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    autoDismissRef.current = setTimeout(onDismiss, 4000);
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [opacity, onDismiss]);

  const cfg = useMemo(() => {
    switch (view.kind) {
      case 'success':
        return {
          bg: 'rgba(6,78,59,0.95)',
          icon: <CheckCircle2 size={72} color="#fff" />,
          title: 'Coupon Accepted ✓',
          subtitle: view.customerName,
          reward: view.rewardTitle,
          extra: `−${view.pointsDeducted} pts deducted from customer`,
          cta: 'Done',
        };
      case 'already_used':
        return {
          bg: 'rgba(120,53,15,0.95)',
          icon: <AlertTriangle size={64} color="#fff" />,
          title: 'Already Redeemed',
          subtitle: `Used on ${format(new Date(view.usedAt), 'dd MMM, hh:mm a')}`,
          reward: '',
          extra: '',
          cta: 'OK',
        };
      case 'expired':
        return {
          bg: 'rgba(127,29,29,0.95)',
          icon: <Clock size={64} color="#fff" />,
          title: 'Coupon Expired',
          subtitle: `Expired ${format(new Date(view.expiredAt), 'dd MMM, hh:mm a')}`,
          reward: '',
          extra: '',
          cta: 'OK',
        };
      case 'wrong_business':
        return {
          bg: 'rgba(26,26,46,0.95)',
          icon: <Ban size={64} color="#fff" />,
          title: 'Wrong Business',
          subtitle: 'This coupon is not valid for your business.',
          reward: '',
          extra: '',
          cta: 'OK',
        };
      case 'not_found':
      default:
        return {
          bg: 'rgba(127,29,29,0.95)',
          icon: <XCircle size={64} color="#fff" />,
          title: 'Invalid QR Code',
          subtitle: 'This does not appear to be a valid TouchPoint coupon.',
          reward: '',
          extra: '',
          cta: 'OK',
        };
    }
  }, [view]);

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: cfg.bg, opacity, padding: 28, alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        {cfg.icon}
        <Text style={resStyles.title}>{cfg.title}</Text>
        {cfg.subtitle ? <Text style={resStyles.subtitle}>{cfg.subtitle}</Text> : null}
        {cfg.reward ? <Text style={resStyles.reward}>{cfg.reward}</Text> : null}
        {cfg.extra ? <Text style={resStyles.extra}>{cfg.extra}</Text> : null}
        <TouchableOpacity style={resStyles.doneBtn} onPress={onDismiss} activeOpacity={0.85}>
          <Text style={resStyles.doneText}>{cfg.cta}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Pressable>
  );
}

const resStyles = StyleSheet.create({
  title: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 22,
    marginTop: 18,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  reward: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  extra: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  doneText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default function ScanCouponScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { redeemByPayload } = useCoupons();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<boolean>(false);
  const [result, setResult] = useState<ResultView | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [manualOpen, setManualOpen] = useState<boolean>(false);
  const [manualValue, setManualValue] = useState<string>('');

  const businessId = currentUser?.id ?? '';
  const businessName = currentUser?.name ?? 'Your business';

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  const handleValidate = useCallback(
    (payload: string) => {
      if (processing) return;
      if (!payload || !payload.trim()) return;
      setProcessing(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      }
      const res = redeemByPayload(payload, businessId);
      const view = mapResult(res);
      if (Platform.OS !== 'web') {
        if (view.kind === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        } else if (view.kind === 'already_used') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        }
      }
      setResult(view);
    },
    [processing, redeemByPayload, businessId]
  );

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (processing || result) return;
      handleValidate(data);
    },
    [processing, result, handleValidate]
  );

  const dismissResult = useCallback(() => {
    setResult(null);
    setProcessing(false);
  }, []);

  const openSettings = useCallback(() => {
    try { const p = (Linking as any).openSettings?.(); if (p && typeof p.catch === 'function') p.catch(() => undefined); } catch {}
  }, []);

  const submitManual = useCallback(() => {
    const code = manualValue.replace(/-/g, '');
    if (code.length < 4) return;
    setManualOpen(false);
    const fullCode = manualValue.startsWith('TP')
      ? manualValue
      : `TP-${manualValue}`;
    handleValidate(fullCode);
    setManualValue('');
  }, [manualValue, handleValidate]);

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_SIZE - 4],
  });

  const cameraSupported = Platform.OS !== 'web';

  const renderBody = () => {
    if (!cameraSupported) {
      return (
        <View style={styles.webNotice}>
          <CameraIcon size={44} color="rgba(255,255,255,0.6)" />
          <Text style={styles.webNoticeTitle}>Camera not supported here</Text>
          <Text style={styles.webNoticeText}>
            Use the manual code entry below. On a real device the camera will scan QR codes automatically.
          </Text>
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionTitle}>Loading camera…</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionWrap}>
          <View style={styles.permissionIcon}>
            <CameraOff size={36} color="#fff" />
          </View>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionText}>
            Allow camera access to scan customer coupons.
          </Text>
          {permission.canAskAgain ? (
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestPermission}
              activeOpacity={0.85}
              testID="request-camera-btn"
            >
              <Text style={styles.permissionBtnText}>Allow Camera</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={openSettings}
              activeOpacity={0.85}
              testID="open-settings-btn"
            >
              <Text style={styles.permissionBtnText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onBarcodeScanned={processing || result ? undefined : handleBarcode}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.vignetteTop} />
          <View style={styles.middleRow}>
            <View style={styles.vignetteSide} />
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY }] },
                ]}
              />
            </View>
            <View style={styles.vignetteSide} />
          </View>
          <View style={styles.vignetteBottom}>
            <Text style={styles.hint}>Align QR code within the frame</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.torchBtn}
          onPress={() => setTorch((v) => !v)}
          activeOpacity={0.8}
          testID="torch-toggle"
        >
          {torch ? (
            <FlashlightOff size={22} color="#fff" />
          ) : (
            <Flashlight size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            testID="scan-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>Scan Customer Coupon</Text>
            <Text style={styles.topSub} numberOfLines={1}>
              {businessName}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.scannerArea}>{renderBody()}</View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.manualBtn}
          activeOpacity={0.8}
          onPress={() => setManualOpen(true)}
          testID="manual-entry-btn"
        >
          <Keyboard size={16} color="#fff" />
          <Text style={styles.manualBtnText}>Enter code manually</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {result ? (
        <ResultOverlay view={result} onDismiss={dismissResult} />
      ) : null}

      <Modal
        visible={manualOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setManualOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={manualStyles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setManualOpen(false)} />
          <View style={manualStyles.sheet}>
            <Text style={manualStyles.title}>Enter coupon code</Text>
            <Text style={manualStyles.sub}>Format: TP-XXXX-XXXX</Text>
            <TextInput
              value={manualValue}
              onChangeText={(v) => setManualValue(formatManual(v))}
              placeholder="TP-XXXX-XXXX"
              placeholderTextColor="#9E9EB4"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              maxLength={12}
              style={manualStyles.input}
              testID="manual-input"
            />
            <TouchableOpacity
              style={[
                manualStyles.submit,
                manualValue.replace(/-/g, '').length < 4 && manualStyles.submitDisabled,
              ]}
              disabled={manualValue.replace(/-/g, '').length < 4}
              onPress={submitManual}
              activeOpacity={0.85}
              testID="manual-submit"
            >
              <Text style={manualStyles.submitText}>Verify Coupon</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManualOpen(false)} style={{ marginTop: 10 }}>
              <Text style={manualStyles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const manualStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1730',
  },
  sub: {
    fontSize: 12,
    color: '#8E8E9A',
    marginTop: 4,
    marginBottom: 18,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E6E3F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1730',
    letterSpacing: 3,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  submit: {
    marginTop: 16,
    backgroundColor: PURPLE,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancel: {
    fontSize: 13,
    color: '#8E8E9A',
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  safeTop: {
    backgroundColor: '#0a0a0a',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  topSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  scannerArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  vignetteTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_SIZE,
  },
  vignetteSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  frame: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: PURPLE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: PURPLE,
    opacity: 0.7,
    shadowColor: PURPLE,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  vignetteBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 22,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
  torchBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bottomBar: {
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    paddingVertical: 12,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  manualBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: PURPLE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  webNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  webNoticeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  webNoticeText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
});
