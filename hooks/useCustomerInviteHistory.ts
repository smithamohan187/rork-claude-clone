import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessCustomerInvites, CustomerInvite } from '@/api/services/customerInviteService';

export function useCustomerInviteHistory(businessId: string) {
  const { authLoading, isAuthenticated } = useAuth();
  const [invites, setInvites] = useState<CustomerInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated || !businessId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBusinessCustomerInvites(businessId);
      setInvites(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite history');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, businessId]);

  // Opening the modal before auth finishes resolving (e.g. right after a cold page load) used to
  // silently no-op and leave a permanent, incorrect "no invites" empty state with nothing to
  // retry it. Re-fires automatically once auth settles for as long as the modal stays open.
  useEffect(() => {
    if (visible && !authLoading && isAuthenticated) {
      void load();
    }
  }, [visible, authLoading, isAuthenticated, load]);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  return { invites, loading, error, visible, open, close };
}
