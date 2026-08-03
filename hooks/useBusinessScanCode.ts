import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchBusinessScanCode } from '@/api/services/businessScanService';

/**
 * Fetches the owner-only QR deep-link URL for a business.
 * Only fetches when `enabled` (i.e. the viewer is the confirmed owner) is true — this avoids a
 * flash of QR UI for non-owners. The backend 403 is the real enforcement.
 */
export function useBusinessScanCode(businessId: string, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!businessId || !enabled) {
        setUrl(null);
        return;
      }
      let cancelled = false;
      setLoading(true);
      setError(null);
      fetchBusinessScanCode(businessId)
        .then((data) => { if (!cancelled) setUrl(data.url); })
        .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load scan code'); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [businessId, enabled]),
  );

  return { url, loading, error };
}
