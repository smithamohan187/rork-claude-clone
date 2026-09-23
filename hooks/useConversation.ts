import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import {
  getMessages,
  getOrCreateConversation,
  ChatMessage,
  ConversationType,
} from '@/api/services/chatService';

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

// Detail hook for chat-detail. Resolves the conversation id (creating it on
// demand from targetProfileId + type) and loads initial history over REST, then
// joins the conversation's socket room for real-time send/receive/read while the
// screen is focused. All listeners/state writes are torn down on blur/unmount so
// no update fires on an unmounted component.
export function useConversation({ conversationId: initialId, targetProfileId, type }: UseConversationParams) {
  const { activeProfileId, authLoading, isAuthenticated } = useAuth();
  const socket = useSocket();
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
      if (authLoading || !isAuthenticated || !socket) return;
      activeRef.current = true;
      let joinedId: string | null = null;

      const onNewMessage = (message: ChatMessage) => {
        if (!activeRef.current || message.conversation_id !== convIdRef.current) return;
        const added = ingest([message]);
        if (added) socket.emit('mark_read', { conversationId: convIdRef.current });
      };
      socket.on('new_message', onNewMessage);

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

          joinedId = cid;
          socket.emit('join_conversation', { conversationId: cid });
          socket.emit('mark_read', { conversationId: cid });
        } catch (err) {
          if (activeRef.current) setError(err instanceof Error ? err.message : 'Failed to load chat');
        } finally {
          if (activeRef.current) setLoading(false);
        }
      })();

      return () => {
        activeRef.current = false;
        socket.off('new_message', onNewMessage);
        if (joinedId) socket.emit('leave_conversation', { conversationId: joinedId });
      };
    }, [targetProfileId, type, ingest, authLoading, isAuthenticated, socket]),
  );

  // Returns whether the send succeeded, so the caller (chat-detail) can restore
  // the typed text into the input and surface a toast on failure — otherwise a
  // failed send silently discards the user's message with no way to recover it.
  const send = useCallback(
    async (body: string): Promise<boolean> => {
      const text = body.trim();
      const cid = convIdRef.current;
      if (!text || !cid || !socket) return false;

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
        const ack = await new Promise<{ success: boolean; message?: ChatMessage; error?: string }>((resolve) => {
          socket.emit('send_message', { conversationId: cid, body: text }, resolve);
        });
        if (!ack.success || !ack.message) throw new Error(ack.error ?? 'Failed to send message');
        const saved = ack.message;
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
    [activeProfileId, socket],
  );

  return { conversationId, otherParty, messages, loading, error, sending, send, myProfileId: activeProfileId };
}
