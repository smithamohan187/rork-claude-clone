import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyProfile } from '@/api/services/profileService';

export function useProfileStats(): { subscribedCount: number; redeemedCount: number; loading: boolean } {
  const { isAuthenticated, authLoading } = useAuth();
  const [subscribedCount, setSubscribedCount] = useState(0);
  const [redeemedCount, setRedeemedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const profile = await fetchMyProfile();
        if (!cancelled) {
          setSubscribedCount(profile.subscribed_count ?? 0);
          setRedeemedCount(profile.redeemed_count ?? 0);
        }
      } catch {
        if (!cancelled) {
          setSubscribedCount(0);
          setRedeemedCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated]);

  return { subscribedCount, redeemedCount, loading };
}
