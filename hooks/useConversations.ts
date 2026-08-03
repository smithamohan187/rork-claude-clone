import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getConversations,
  Conversation,
  ConversationType,
} from '@/api/services/chatService';

// List hook for the messages-page tabs. Fetches the caller's conversations of a
// given type and refetches on screen focus — mirrors the useMyReferrals pattern.
export function useConversations(type: ConversationType) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConversations(type);
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const data = await getConversations(type);
          if (active) setConversations(data);
        } catch (err) {
          if (active) setError(err instanceof Error ? err.message : 'Failed to load conversations');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [type]),
  );

  return { conversations, loading, error, refetch: load };
}
