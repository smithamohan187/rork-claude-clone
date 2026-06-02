import React, { useCallback, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';

export type ReferralChatContextType = 'app' | 'business';

export interface OfferSharePayload {
  offerId: string;
  businessId: string;
  businessName: string;
  businessLogoUrl?: string;
  offerTitle: string;
  offerDescription?: string;
  offerImageUrl?: string;
  discountLabel?: string;
  validUntil?: string;
  deepLink?: string;
}

export interface ReferralChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
  kind?: 'text' | 'offer_share';
  offerPayload?: OfferSharePayload;
}

export interface ReferralChatParticipant {
  profileId: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface ReferralChat {
  id: string;
  friend: ReferralChatParticipant;
  contextType: ReferralChatContextType;
  businessName?: string;
  businessColor?: string;
  lastMessageAt: string;
  unreadCount: number;
}

const CURRENT_USER_ID = 'me';

const nowMinus = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();

const INITIAL_CHATS: ReferralChat[] = [
  {
    id: 'rc-priya',
    friend: {
      profileId: 'profile-priya',
      name: 'Priya Nair',
      initials: 'PN',
      avatarColor: '#0F6E56',
    },
    contextType: 'business',
    businessName: "Richard's Pastry",
    businessColor: '#1A5C35',
    lastMessageAt: nowMinus(3),
    unreadCount: 2,
  },
  {
    id: 'rc-rahul',
    friend: {
      profileId: 'profile-rahul',
      name: 'Rahul Menon',
      initials: 'RM',
      avatarColor: '#185FA5',
    },
    contextType: 'app',
    lastMessageAt: nowMinus(60 * 4),
    unreadCount: 0,
  },
  {
    id: 'rc-arun',
    friend: {
      profileId: 'profile-arun',
      name: 'Arun Kumar',
      initials: 'AK',
      avatarColor: '#854F0B',
    },
    contextType: 'app',
    lastMessageAt: nowMinus(60 * 26),
    unreadCount: 1,
  },
];

const INITIAL_MESSAGES: ReferralChatMessage[] = [
  {
    id: 'm1',
    chatId: 'rc-priya',
    senderId: 'profile-priya',
    body: "Hey! Thanks for the Richard's Pastry referral 🥐",
    createdAt: nowMinus(60 * 26),
    status: 'read',
  },
  {
    id: 'm2',
    chatId: 'rc-priya',
    senderId: CURRENT_USER_ID,
    body: 'Anytime! Their almond croissant is amazing, you have to try it.',
    createdAt: nowMinus(60 * 25),
    status: 'read',
  },
  {
    id: 'm3',
    chatId: 'rc-priya',
    senderId: 'profile-priya',
    body: 'Just went this morning — the subscriber discount worked!',
    createdAt: nowMinus(20),
    status: 'read',
  },
  {
    id: 'm4',
    chatId: 'rc-priya',
    senderId: 'profile-priya',
    body: 'We both got the bonus points too 🎉',
    createdAt: nowMinus(3),
    status: 'delivered',
  },
  {
    id: 'm5',
    chatId: 'rc-rahul',
    senderId: CURRENT_USER_ID,
    body: 'Welcome to TouchPoint! Let me know if you need anything.',
    createdAt: nowMinus(60 * 48),
    status: 'read',
  },
  {
    id: 'm6',
    chatId: 'rc-rahul',
    senderId: 'profile-rahul',
    body: 'Thanks Sam, loving it so far!',
    createdAt: nowMinus(60 * 4),
    status: 'read',
  },
  {
    id: 'm7',
    chatId: 'rc-arun',
    senderId: 'profile-arun',
    body: 'Saw your referral — welcome aboard 👋',
    createdAt: nowMinus(60 * 26),
    status: 'delivered',
  },
];

export const [ReferralChatProvider, useReferralChat] = createContextHook(() => {
  const [chats, setChats] = useState<ReferralChat[]>(INITIAL_CHATS);
  const [messages, setMessages] = useState<ReferralChatMessage[]>(INITIAL_MESSAGES);

  const currentUserId = CURRENT_USER_ID;

  const ensureChat = useCallback(
    (input: {
      friend: ReferralChatParticipant;
      contextType: ReferralChatContextType;
      businessName?: string;
      businessColor?: string;
    }): string => {
      const existing = chats.find((c) => c.friend.profileId === input.friend.profileId);
      if (existing) return existing.id;
      const newChat: ReferralChat = {
        id: `rc-${input.friend.profileId}`,
        friend: input.friend,
        contextType: input.contextType,
        businessName: input.businessName,
        businessColor: input.businessColor,
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
      };
      setChats((prev) => [newChat, ...prev]);
      return newChat.id;
    },
    [chats]
  );

  const sendMessage = useCallback((chatId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const message: ReferralChatMessage = {
      id: `m-${Date.now()}`,
      chatId,
      senderId: CURRENT_USER_ID,
      body: trimmed,
      createdAt: new Date().toISOString(),
      status: 'delivered',
      kind: 'text',
    };
    setMessages((prev) => [...prev, message]);
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, lastMessageAt: message.createdAt } : c
      )
    );
  }, []);

  const sendOfferShare = useCallback(
    (chatId: string, payload: OfferSharePayload, body?: string): string => {
      const message: ReferralChatMessage = {
        id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        chatId,
        senderId: CURRENT_USER_ID,
        body: body?.trim() || "I found this offer and thought you'd love it! \uD83C\uDF89",
        createdAt: new Date().toISOString(),
        status: 'delivered',
        kind: 'offer_share',
        offerPayload: payload,
      };
      setMessages((prev) => [...prev, message]);
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, lastMessageAt: message.createdAt } : c
        )
      );
      console.log('[ReferralChat] sendOfferShare', { chatId, offerId: payload.offerId });
      return message.id;
    },
    []
  );

  const markChatRead = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    );
    setMessages((prev) =>
      prev.map((m) =>
        m.chatId === chatId && m.senderId !== CURRENT_USER_ID
          ? { ...m, status: 'read' }
          : m
      )
    );
  }, []);

  const getChat = useCallback(
    (chatId: string): ReferralChat | undefined =>
      chats.find((c) => c.id === chatId),
    [chats]
  );

  const getChatByProfile = useCallback(
    (profileId: string): ReferralChat | undefined =>
      chats.find((c) => c.friend.profileId === profileId),
    [chats]
  );

  const getMessages = useCallback(
    (chatId: string): ReferralChatMessage[] =>
      messages
        .filter((m) => m.chatId === chatId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  );

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + c.unreadCount, 0),
    [chats]
  );

  const sortedChats = useMemo(
    () =>
      [...chats].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    [chats]
  );

  return {
    currentUserId,
    chats: sortedChats,
    totalUnread,
    ensureChat,
    sendMessage,
    sendOfferShare,
    markChatRead,
    getChat,
    getChatByProfile,
    getMessages,
  };
});

export function getLastMessagePreview(
  messages: ReferralChatMessage[],
  currentUserId: string
): { text: string; isYou: boolean } | null {
  if (messages.length === 0) return null;
  const last = messages[messages.length - 1];
  return { text: last.body, isYou: last.senderId === currentUserId };
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export function formatClockTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
