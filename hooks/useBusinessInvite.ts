import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  createBusinessInvite,
  getBusinessInvites,
  type BusinessInvite,
  type CreateInvitePayload,
} from '@/api/services/businessInviteService';

export function useBusinessInvite() {
  const [invites, setInvites] = useState<BusinessInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const data = await getBusinessInvites();
      setInvites(data);
    } catch (e) {
      if (__DEV__) console.log('[useBusinessInvite] fetchInvites error:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { void fetchInvites(); }, [fetchInvites]));

  const submitInvite = useCallback(async (payload: CreateInvitePayload): Promise<BusinessInvite | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const invite = await createBusinessInvite(payload);
      await fetchInvites();
      return invite;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send invite';
      setError(msg);
      if (__DEV__) console.log('[useBusinessInvite] submitInvite error:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvites]);

  return { invites, isLoading, error, submitInvite };
}
