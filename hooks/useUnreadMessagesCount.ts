import { useEffect, useState } from 'react';
import { getConversations } from '@/api/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';

// Real, backend-derived unread count for the Chat tab badge — sums unread_count
// across both business and friend conversations. Loads once on auth and then
// re-derives in real time from the socket's conversation_updated event (fired on
// every new message / read-state change for this profile), rather than polling.
export function useUnreadMessagesCount(): number {
  const { isAuthenticated, authLoading } = useAuth();
  const socket = useSocket();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    // Wait for session restore to finish and a token to actually be in memory —
    // otherwise this fires on a cold page load before the access token is
    // restored and silently 401s (see BusinessInviteBanner for the same fix).
    if (authLoading || !isAuthenticated) return;

    let active = true;

    const load = async () => {
      try {
        const [businessConvos, friendConvos] = await Promise.all([
          getConversations('business'),
          getConversations('friend'),
        ]);
        if (!active) return;
        const total = [...businessConvos, ...friendConvos].reduce(
          (sum, c) => sum + (c.unread_count ?? 0),
          0,
        );
        setCount(total);
      } catch {
        /* transient error — next conversation_updated event (or next mount) retries */
      }
    };

    load();
    if (!socket) return () => { active = false; };

    socket.on('conversation_updated', load);
    return () => {
      active = false;
      socket.off('conversation_updated', load);
    };
  }, [authLoading, isAuthenticated, socket]);

  return count;
}
