import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getConversations,
  Conversation,
  ConversationType,
} from '@/api/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';

// List hook for the messages-page tabs. Fetches the caller's conversations of a
// given type, refetches on screen focus (correctness fallback), and refetches in
// real time whenever the socket reports a conversation update (new message /
// read-state change) for this profile.
export function useConversations(type: ConversationType) {
  const { authLoading, isAuthenticated } = useAuth();
  const socket = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
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
  }, [type, authLoading, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !isAuthenticated) return;
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
    }, [type, authLoading, isAuthenticated]),
  );

  useEffect(() => {
    if (!socket || authLoading || !isAuthenticated) return;
    const onConversationUpdated = () => {
      getConversations(type).then(setConversations).catch(() => {});
    };
    socket.on('conversation_updated', onConversationUpdated);
    return () => {
      socket.off('conversation_updated', onConversationUpdated);
    };
  }, [socket, type, authLoading, isAuthenticated]);

  return { conversations, loading, error, refetch: load };
}
