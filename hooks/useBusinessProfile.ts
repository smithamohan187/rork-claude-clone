import { useState, useEffect, useCallback } from 'react';
import { fetchBusinessProfile, type BusinessProfile } from '@/api/services/businessProfileService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface UseBusinessProfileResult {
  business: BusinessProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  formattedHours: string;    // e.g. "Mon 09:00–18:00, Tue 09:00–18:00, Sun Closed"
  formattedAddress: string;  // address, city, state, country joined by ", "
}

export function useBusinessProfile(id: string): UseBusinessProfileResult {
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBusinessProfile(id);
      setBusiness(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const formattedHours = business?.hours?.length
    ? business.hours
        .map((h) => {
          const day = DAYS[h.day_of_week];
          if (h.is_closed) return `${day} Closed`;
          return `${day} ${h.open_time ?? ''}–${h.close_time ?? ''}`;
        })
        .join(', ')
    : 'Hours not available';

  const formattedAddress = business
    ? [business.address, business.city, business.state, business.country]
        .filter(Boolean)
        .join(', ')
    : '';

  return { business, loading, error, refresh: load, formattedHours, formattedAddress };
}
