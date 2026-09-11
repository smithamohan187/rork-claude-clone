import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyProfile } from '@/api/services/profileService';

export function useProfileStats(): { subscribedCount: number; redeemedCount: number; loading: boolean } {
  const { isAuthenticated, authLoading } = useAuth();
  const [subscribedCount, setSubscribedCount] = useState(0);
  const [redeemedCount, setRedeemedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    try {
      const profile = await fetchMyProfile();
      setSubscribedCount(profile.subscribed_count ?? 0);
      setRedeemedCount(profile.redeemed_count ?? 0);
    } catch {
      setSubscribedCount(0);
      setRedeemedCount(0);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { subscribedCount, redeemedCount, loading };
}
