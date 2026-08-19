import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMessages,
  sendMessage as sendMessageApi,
  markRead,
  getOrCreateConversation,
  ChatMessage,
  ConversationType,
} from '@/api/services/chatService';

const POLL_INTERVAL_MS = 3000;

interface UseConversationParams {
  conversationId?: string;
  targetProfileId?: string;
  type?: ConversationType;
}

export interface OtherParty {
  name: string | null;
  avatarUrl: string | null;
  businessId: string | null;
}

// Detail + polling hook for chat-detail. Resolves the conversation id (creating
// it on demand from targetProfileId + type), loads + marks read, then polls for
// new messages every 3s while the screen is focused. All timers and state writes
// are torn down on blur/unmount so no update fires on an unmounted component.
export function useConversation({ conversationId: initialId, targetProfileId, type }: UseConversationParams) {
  const { activeProfileId, authLoading, isAuthenticated } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(initialId ?? null);
  const [otherParty, setOtherParty] = useState<OtherParty | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);

  const activeRef = useRef<boolean>(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const lastIdRef = useRef<string | null>(null);
  const convIdRef = useRef<string | null>(initialId ?? null);

  const ingest = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return false;
    let added = false;
    setMessages((prev) => {
      const fresh = incoming.filter((m) => !knownIdsRef.current.has(m.id));
      if (fresh.length === 0) return prev;
      fresh.forEach((m) => knownIdsRef.current.add(m.id));
      lastIdRef.current = fresh[fresh.length - 1].id;
      added = true;
      return [...prev, ...fresh];
    });
    return added;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !isAuthenticated) return;
      activeRef.current = true;
      let interval: ReturnType<typeof setInterval> | null = null;

      const poll = async () => {
        const cid = convIdRef.current;
        if (!cid) return;
        try {
          const newer = await getMessages(cid, lastIdRef.current ?? undefined);
          if (!activeRef.current) return;
          const added = ingest(newer);
          if (added) markRead(cid).catch(() => {});
        } catch {
          /* transient poll error — next tick retries */
        }
      };

      (async () => {
        setLoading(true);
        setError(null);
        try {
          let cid = convIdRef.current;
          if (!cid) {
            if (!targetProfileId || !type) throw new Error('Conversation not specified');
            const { conversation } = await getOrCreateConversation(targetProfileId, type);
            cid = conversation.id;
            if (activeRef.current) {
              setOtherParty({
                name: conversation.other_name,
                avatarUrl: conversation.other_avatar_url,
                businessId: conversation.other_business_id,
              });
            }
          }
          if (!activeRef.current) return;
          convIdRef.current = cid;
          setConversationId(cid);

          const initial = await getMessages(cid);
          if (!activeRef.current) return;
          knownIdsRef.current = new Set(initial.map((m) => m.id));
          lastIdRef.current = initial.length ? initial[initial.length - 1].id : null;
          setMessages(initial);
          markRead(cid).catch(() => {});
        } catch (err) {
          if (activeRef.current) setError(err instanceof Error ? err.message : 'Failed to load chat');
        } finally {
          if (activeRef.current) setLoading(false);
        }

        if (activeRef.current) {
          interval = setInterval(poll, POLL_INTERVAL_MS);
        }
      })();

      return () => {
        activeRef.current = false;
        if (interval) clearInterval(interval);
      };
    }, [targetProfileId, type, ingest, authLoading, isAuthenticated]),
  );

  // Returns whether the send succeeded, so the caller (chat-detail) can restore
  // the typed text into the input and surface a toast on failure — otherwise a
  // failed send silently discards the user's message with no way to recover it.
  const send = useCallback(
    async (body: string): Promise<boolean> => {
      const text = body.trim();
      const cid = convIdRef.current;
      if (!text || !cid) return false;

      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversation_id: cid,
        sender_profile_id: activeProfileId ?? 'me',
        body: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      try {
        const saved = await sendMessageApi(cid, text);
        if (!activeRef.current) return true;
        knownIdsRef.current.add(saved.id);
        lastIdRef.current = saved.id;
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        return true;
      } catch (err) {
        if (activeRef.current) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setError(err instanceof Error ? err.message : 'Failed to send message');
        }
        return false;
      } finally {
        if (activeRef.current) setSending(false);
      }
    },
    [activeProfileId],
  );

  return { conversationId, otherParty, messages, loading, error, sending, send, myProfileId: activeProfileId };
}
