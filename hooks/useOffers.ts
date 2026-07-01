import { useState, useCallback, useEffect } from 'react';
import {
  fetchMyOffers,
  fetchOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  type Offer,
  type CreateOfferPayload,
} from '@/api/services/offersService';

export function useOffers(initialFilter?: 'active' | 'expired' | 'disabled') {
  const [offers, setOffers]   = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (filter?: 'active' | 'expired' | 'disabled') => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyOffers(filter ?? initialFilter);
      setOffers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, [initialFilter]);

  useEffect(() => { load(); }, [load]);

  const addOffer = useCallback(async (payload: CreateOfferPayload): Promise<Offer> => {
    const offer = await createOffer(payload);
    setOffers(prev => [offer, ...prev]);
    return offer;
  }, []);

  const editOffer = useCallback(async (id: string, payload: Partial<CreateOfferPayload>): Promise<Offer> => {
    const updated = await updateOffer(id, payload);
    setOffers(prev => prev.map(o => o.id === id ? updated : o));
    return updated;
  }, []);

  const toggleStatus = useCallback(async (id: string, status: 'active' | 'disabled'): Promise<void> => {
    const updated = await toggleOfferStatus(id, status);
    setOffers(prev => prev.map(o => o.id === id ? updated : o));
  }, []);

  const removeOffer = useCallback(async (id: string): Promise<void> => {
    await deleteOffer(id);
    setOffers(prev => prev.filter(o => o.id !== id));
  }, []);

  return { offers, loading, error, refresh: load, addOffer, editOffer, toggleStatus, removeOffer };
}

export function useOffer(id: string) {
  const [offer, setOffer]     = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchOfferById(id);
        if (!cancelled) setOffer(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load offer');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { offer, loading, error };
}
