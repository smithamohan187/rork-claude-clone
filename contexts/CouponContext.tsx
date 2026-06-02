import React, { useState, useCallback, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredCoupon {
  id: string;
  businessId: string;
  businessName: string;
  rewardId?: string;
  rewardTitle: string;
  rewardDescription: string;
  rewardType: 'discount' | 'free_item' | 'voucher';
  couponCode: string;
  qrPayload: string;
  pointsDeducted: number;
  customerName?: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'used';
  usedAt?: number;
  scannedByBusinessId?: string;
}

export interface ScanAttemptLog {
  id: string;
  businessId: string;
  scannedPayload: string;
  result: 'success' | 'not_found' | 'already_used' | 'expired' | 'wrong_business';
  couponId?: string;
  couponCode?: string;
  customerName?: string;
  rewardTitle?: string;
  pointsDeducted?: number;
  at: number;
}

export type RedeemResult =
  | { ok: true; coupon: StoredCoupon }
  | { ok: false; error: 'not_found'; message: string }
  | { ok: false; error: 'already_used'; message: string; usedAt: number; coupon: StoredCoupon }
  | { ok: false; error: 'expired'; message: string; expiredAt: number; coupon: StoredCoupon }
  | { ok: false; error: 'wrong_business'; message: string; coupon: StoredCoupon };

const COUPONS_KEY = 'touchpoints_coupons';
const SCANS_KEY = 'touchpoints_scan_attempts';

function computeStatus(c: StoredCoupon, now: number): StoredCoupon['status'] {
  if (c.status === 'used') return 'used';
  if (c.expiresAt <= now) return 'expired';
  return 'active';
}

export const [CouponProvider, useCoupons] = createContextHook(() => {
  const [coupons, setCoupons] = useState<StoredCoupon[]>([]);
  const [scanAttempts, setScanAttempts] = useState<ScanAttemptLog[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const [rawC, rawS] = await Promise.all([
          AsyncStorage.getItem(COUPONS_KEY),
          AsyncStorage.getItem(SCANS_KEY),
        ]);
        if (rawC) {
          const parsed = JSON.parse(rawC) as StoredCoupon[];
          setCoupons(parsed);
          console.log('[CouponContext] Loaded', parsed.length, 'coupons');
        }
        if (rawS) {
          const parsed = JSON.parse(rawS) as ScanAttemptLog[];
          setScanAttempts(parsed);
        }
      } catch (e) {
        console.log('[CouponContext] Failed to load', e);
      }
      setLoaded(true);
    })();
  }, []);

  const persistCoupons = useCallback((updated: StoredCoupon[]) => {
    AsyncStorage.setItem(COUPONS_KEY, JSON.stringify(updated)).catch((e) =>
      console.log('[CouponContext] persist coupons failed', e)
    );
  }, []);

  const persistScans = useCallback((updated: ScanAttemptLog[]) => {
    AsyncStorage.setItem(SCANS_KEY, JSON.stringify(updated)).catch((e) =>
      console.log('[CouponContext] persist scans failed', e)
    );
  }, []);

  const addCoupon = useCallback(
    (
      input: Omit<
        StoredCoupon,
        'id' | 'createdAt' | 'status' | 'qrPayload'
      > & { qrPayload?: string }
    ): StoredCoupon => {
      const now = Date.now();
      const qrPayload =
        input.qrPayload ??
        `tp_${now}_${Math.random().toString(36).slice(2, 10)}${Math.random()
          .toString(36)
          .slice(2, 10)}`;
      const newCoupon: StoredCoupon = {
        rewardId: undefined,
        pointsDeducted: 0,
        ...input,
        qrPayload,
        id: `cpn_${now}_${Math.random().toString(36).substring(2, 8)}`,
        createdAt: now,
        status: 'active',
      };
      console.log('[CouponContext] Adding coupon:', newCoupon.couponCode);
      setCoupons((prev) => {
        const updated = [newCoupon, ...prev];
        persistCoupons(updated);
        return updated;
      });
      return newCoupon;
    },
    [persistCoupons]
  );

  const markUsed = useCallback(
    (couponId: string, scannedByBusinessId?: string) => {
      const now = Date.now();
      setCoupons((prev) => {
        const updated = prev.map((c) =>
          c.id === couponId
            ? { ...c, status: 'used' as const, usedAt: now, scannedByBusinessId }
            : c
        );
        persistCoupons(updated);
        return updated;
      });
    },
    [persistCoupons]
  );

  const getById = useCallback(
    (couponId: string): StoredCoupon | undefined => {
      const c = coupons.find((x) => x.id === couponId);
      if (!c) return undefined;
      return { ...c, status: computeStatus(c, Date.now()) };
    },
    [coupons]
  );

  const findActiveForReward = useCallback(
    (rewardId: string): StoredCoupon | undefined => {
      const now = Date.now();
      return coupons.find(
        (c) =>
          c.rewardId === rewardId &&
          c.status !== 'used' &&
          c.expiresAt > now
      );
    },
    [coupons]
  );

  const logScanAttempt = useCallback(
    (entry: Omit<ScanAttemptLog, 'id' | 'at'>) => {
      const log: ScanAttemptLog = {
        ...entry,
        id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        at: Date.now(),
      };
      setScanAttempts((prev) => {
        const updated = [log, ...prev].slice(0, 200);
        persistScans(updated);
        return updated;
      });
    },
    [persistScans]
  );

  const redeemByPayload = useCallback(
    (payloadOrCode: string, businessId: string): RedeemResult => {
      const trimmed = payloadOrCode.trim();
      const now = Date.now();
      const coupon = coupons.find(
        (c) =>
          c.qrPayload === trimmed ||
          c.couponCode.toUpperCase() === trimmed.toUpperCase()
      );
      if (!coupon) {
        logScanAttempt({
          businessId,
          scannedPayload: trimmed,
          result: 'not_found',
        });
        return {
          ok: false,
          error: 'not_found',
          message: 'This QR code is not valid.',
        };
      }
      if (coupon.status === 'used') {
        logScanAttempt({
          businessId,
          scannedPayload: trimmed,
          result: 'already_used',
          couponId: coupon.id,
          couponCode: coupon.couponCode,
        });
        return {
          ok: false,
          error: 'already_used',
          message: 'This coupon has already been redeemed.',
          usedAt: coupon.usedAt ?? 0,
          coupon,
        };
      }
      if (coupon.expiresAt <= now) {
        const expired = { ...coupon, status: 'expired' as const };
        setCoupons((prev) => {
          const updated = prev.map((c) =>
            c.id === coupon.id ? expired : c
          );
          persistCoupons(updated);
          return updated;
        });
        logScanAttempt({
          businessId,
          scannedPayload: trimmed,
          result: 'expired',
          couponId: coupon.id,
          couponCode: coupon.couponCode,
        });
        return {
          ok: false,
          error: 'expired',
          message: 'This coupon expired.',
          expiredAt: coupon.expiresAt,
          coupon: expired,
        };
      }
      if (coupon.businessId !== businessId) {
        logScanAttempt({
          businessId,
          scannedPayload: trimmed,
          result: 'wrong_business',
          couponId: coupon.id,
          couponCode: coupon.couponCode,
        });
        return {
          ok: false,
          error: 'wrong_business',
          message: 'This coupon is not valid for this business.',
          coupon,
        };
      }

      const used: StoredCoupon = {
        ...coupon,
        status: 'used',
        usedAt: now,
        scannedByBusinessId: businessId,
      };
      setCoupons((prev) => {
        const updated = prev.map((c) => (c.id === coupon.id ? used : c));
        persistCoupons(updated);
        return updated;
      });
      logScanAttempt({
        businessId,
        scannedPayload: trimmed,
        result: 'success',
        couponId: coupon.id,
        couponCode: coupon.couponCode,
        customerName: coupon.customerName,
        rewardTitle: coupon.rewardTitle,
        pointsDeducted: coupon.pointsDeducted,
      });
      return { ok: true, coupon: used };
    },
    [coupons, logScanAttempt, persistCoupons]
  );

  const getSortedCoupons = useCallback((): StoredCoupon[] => {
    const now = Date.now();
    const withStatus = coupons.map((c) => ({
      ...c,
      status: computeStatus(c, now),
    }));
    const active = withStatus.filter((c) => c.status === 'active');
    const rest = withStatus.filter((c) => c.status !== 'active');
    active.sort((a, b) => b.createdAt - a.createdAt);
    rest.sort((a, b) => b.createdAt - a.createdAt);
    return [...active, ...rest];
  }, [coupons]);

  return {
    coupons,
    scanAttempts,
    addCoupon,
    markUsed,
    getById,
    findActiveForReward,
    redeemByPayload,
    logScanAttempt,
    getSortedCoupons,
    loaded,
  };
});
