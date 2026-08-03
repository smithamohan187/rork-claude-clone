import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSubscribedBusinesses } from '@/api/services/subscriptionService';
import { getFriends, ChatFriend } from '@/api/services/chatService';

export interface SubscribedBusiness {
  id: string;
  business_profile_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  logo_url: string | null;
  category_name: string | null;
  subscribed_at: string;
}

// Roster of businesses the caller is subscribed to (the Messages "Businesses" tab
// source). Refetches on focus — same pattern as useMyReferrals / useConversations.
export function useSubscribedBusinesses() {
  const [businesses, setBusinesses] = useState<SubscribedBusiness[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const data = await getSubscribedBusinesses();
          if (active) setBusinesses(data as SubscribedBusiness[]);
        } catch (err) {
          if (active) setError(err instanceof Error ? err.message : 'Failed to load businesses');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return { businesses, loading, error };
}

// Roster of the caller's trusted friends (the Messages "Friends" tab source).
export function useFriends() {
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const data = await getFriends();
          if (active) setFriends(data);
        } catch (err) {
          if (active) setError(err instanceof Error ? err.message : 'Failed to load friends');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return { friends, loading, error };
}
