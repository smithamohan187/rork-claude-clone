import { useState, useEffect, useCallback } from 'react';
import { getMyBusinessReferral, type MyBusinessReferral } from '@/api/services/businessReferralService';

// Loads the active profile's own standing referral code/link/stats for a business — only called
// while the caller is subscribed (see ReferralCard's isSubscribed render guard in
// business-profile/[id].tsx), matching the backend's own subscription gate.
export function useBusinessReferral(businessId: string, enabled: boolean) {
  const [referral, setReferral] = useState<MyBusinessReferral | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
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
  }, [businessId, enabled]);

  useEffect(() => { load(); }, [load]);

  return { referral, loading };
}
