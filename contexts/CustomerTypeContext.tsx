import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type CustomerType = 'goodwill' | 'incentivized';

const CUSTOMER_TYPE_KEY = 'customer_type_v1';
const PAUSED_POINTS_KEY = 'customer_type_paused_points_v1';

export const [CustomerTypeProvider, useCustomerType] = createContextHook(() => {
  // Default to incentivized so existing accounts don't suddenly hide their points.
  const [customerType, setCustomerTypeState] = useState<CustomerType>('incentivized');
  const [pausedPoints, setPausedPoints] = useState<number>(0);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, p] = await Promise.all([
          AsyncStorage.getItem(CUSTOMER_TYPE_KEY),
          AsyncStorage.getItem(PAUSED_POINTS_KEY),
        ]);
        if (cancelled) return;
        if (t === 'goodwill' || t === 'incentivized') {
          setCustomerTypeState(t);
        }
        if (p) {
          const n = Number(p);
          if (Number.isFinite(n)) setPausedPoints(n);
        }
      } catch (err) {
        console.log('[CustomerType] hydrate error', err);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCustomerType = useCallback(async (next: CustomerType) => {
    console.log('[CustomerType] setCustomerType', next);
    setCustomerTypeState(next);
    try {
      await AsyncStorage.setItem(CUSTOMER_TYPE_KEY, next);
    } catch (err) {
      console.log('[CustomerType] persist error', err);
    }
  }, []);

  /**
   * Switch to goodwill: pause the user's current points balance (preserve, hide).
   */
  const switchToGoodwill = useCallback(async (currentPoints: number) => {
    console.log('[CustomerType] switchToGoodwill, pausing', currentPoints, 'pts');
    setCustomerTypeState('goodwill');
    setPausedPoints(currentPoints);
    try {
      await AsyncStorage.multiSet([
        [CUSTOMER_TYPE_KEY, 'goodwill'],
        [PAUSED_POINTS_KEY, String(currentPoints)],
      ]);
    } catch (err) {
      console.log('[CustomerType] switchToGoodwill persist error', err);
    }
  }, []);

  /**
   * Switch back to incentivized: clear pause marker (points are restored from
   * their original source by callers).
   */
  const switchToIncentivized = useCallback(async () => {
    console.log('[CustomerType] switchToIncentivized, restoring paused', pausedPoints);
    setCustomerTypeState('incentivized');
    setPausedPoints(0);
    try {
      await AsyncStorage.multiSet([
        [CUSTOMER_TYPE_KEY, 'incentivized'],
        [PAUSED_POINTS_KEY, '0'],
      ]);
    } catch (err) {
      console.log('[CustomerType] switchToIncentivized persist error', err);
    }
  }, [pausedPoints]);

  const isGoodwill = customerType === 'goodwill';

  return {
    customerType,
    isGoodwill,
    pausedPoints,
    isHydrated,
    setCustomerType,
    switchToGoodwill,
    switchToIncentivized,
  };
});
