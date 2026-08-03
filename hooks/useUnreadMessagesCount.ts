import { useEffect, useState } from 'react';
import { getConversations } from '@/api/services/chatService';

const POLL_INTERVAL_MS = 15000;

// Real, backend-derived unread count for the Chat tab badge — sums unread_count
// across both business and friend conversations. Polls at a slower cadence than the
// in-chat message poll (useConversation.ts) since this only drives a tab-bar badge.
export function useUnreadMessagesCount(): number {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
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
        /* transient poll error — next tick retries */
      }
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}
