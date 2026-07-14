import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getBusinessMembers, removeBusinessMember, type BusinessMember } from '@/api/services/subscriptionService';

export function useBusinessMembers(businessId: string) {
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      setMembers(await getBusinessMembers(businessId));
    } catch {
      /* silently fail — list stays empty */
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const removeMember = useCallback(async (memberProfileId: string) => {
    setMembers((prev) => prev.filter((m) => m.profile_id !== memberProfileId));
    try {
      await removeBusinessMember(businessId, memberProfileId);
    } catch {
      refresh();
    }
  }, [businessId, refresh]);

  return { members, isLoading, removeMember, refresh };
}
