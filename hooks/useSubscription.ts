import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToBusiness,
  unsubscribeFromBusiness,
  getSubscriptionStatus,
} from '@/api/services/subscriptionService';

export function useSubscription(businessId: string) {
  const { authUser } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!businessId || !authUser) return;
    let cancelled = false;
    getSubscriptionStatus(businessId)
      .then((data) => { if (!cancelled) setIsSubscribed(data.isSubscribed); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [businessId, authUser?.id]));

  const subscribe = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    setIsSubscribed(true);
    try {
      await subscribeToBusiness(businessId);
    } catch {
      setIsSubscribed(false);
      Alert.alert('Error', 'Could not subscribe. Please try again.');
    } finally {
      setIsToggling(false);
    }
  }, [businessId, isToggling]);

  const unsubscribe = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    setIsSubscribed(false);
    try {
      await unsubscribeFromBusiness(businessId);
    } catch {
      setIsSubscribed(true);
      Alert.alert('Error', 'Could not unsubscribe. Please try again.');
    } finally {
      setIsToggling(false);
    }
  }, [businessId, isToggling]);

  return { isSubscribed, isToggling, subscribe, unsubscribe };
}
