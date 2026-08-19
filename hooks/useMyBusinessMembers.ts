import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMyBusinessMembers, removeMyBusinessMember, type BusinessMember } from '@/api/services/subscriptionService';
import { useAuth } from '@/contexts/AuthContext';

export function useMyBusinessMembers() {
  const { authLoading, isAuthenticated } = useAuth();
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setIsLoading(true);
    try {
      setMembers(await getMyBusinessMembers());
    } catch {
      /* stay empty */
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const removeMember = useCallback(async (memberProfileId: string) => {
    setMembers((prev) => prev.filter((m) => m.profile_id !== memberProfileId));
    try {
      await removeMyBusinessMember(memberProfileId);
    } catch {
      refresh();
    }
  }, [refresh]);

  return { members, isLoading, removeMember, refresh };
}
