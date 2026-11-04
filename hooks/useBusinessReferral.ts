import { useState, useEffect, useCallback } from 'react';
import { getMyBusinessReferral, type MyBusinessReferral } from '@/api/services/businessReferralService';
import { useAuth } from '@/contexts/AuthContext';

// Loads the active profile's own standing referral code/link/stats for a business — only called
// while the caller is subscribed (see ReferralCard's isSubscribed render guard in
// business-profile/[id].tsx), matching the backend's own subscription gate.
//
// `refreshKey` lets the caller force a refetch once a subscribe action actually confirms
// server-side. ReferralCard mounts the instant the subscribe button's optimistic UI flips
// isSubscribed to true (see useSubscription.ts) — well before the subscribe POST itself has
// committed — so a fetch fired purely on mount can race ahead of the real subscription and get a
// 403. Bumping refreshKey only after the subscribe call resolves retries the fetch once the
// subscription genuinely exists.
export function useBusinessReferral(businessId: string, enabled: boolean, refreshKey?: number) {
  const { authLoading } = useAuth();
  const [referral, setReferral] = useState<MyBusinessReferral | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!businessId || !enabled) return;
    setLoading(true);
    try {
      const data = await getMyBusinessReferral(businessId);
      setReferral(data);
    } catch (err) {
      if (__DEV__) console.error('[useBusinessReferral] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, enabled, authLoading]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return { referral, loading };
}
