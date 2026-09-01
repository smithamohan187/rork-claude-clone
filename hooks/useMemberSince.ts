import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyProfile } from '@/api/services/profileService';
import { fetchMyBusiness } from '@/api/services/businessService';

function formatMonthYear(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function useMemberSince(): { memberSince: string; loading: boolean } {
  const { isAuthenticated, authLoading, accountType } = useAuth();
  const [memberSince, setMemberSince] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (accountType === 'business') {
          const business = await fetchMyBusiness();
          if (!cancelled && business) {
            setMemberSince(`Business since ${formatMonthYear(business.created_at)}`);
          }
        } else {
          const profile = await fetchMyProfile();
          if (!cancelled) {
            setMemberSince(`Member since ${formatMonthYear(profile.created_at)}`);
          }
        }
      } catch {
        if (!cancelled) setMemberSince('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, accountType]);

  return { memberSince, loading };
}
