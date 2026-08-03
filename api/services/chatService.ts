// Service layer — wraps apiClient calls for the direct-chat endpoints.
// Screens never call apiClient directly; they go through hooks, which call these.
import { apiClient, API_BASE_URL } from '@/api/client';

export type ConversationType = 'business' | 'friend';

export interface Conversation {
  id: string;
  type: 'direct_business' | 'direct_friend';
  created_at: string;
  other_profile_id: string;
  other_name: string;
  other_avatar_url: string | null;
  other_business_id: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
}

// getOrCreateConversation's response — decorated with the other party's real display
// info, but without the list-only fields (last message/unread) listConversationsForProfile
// provides. Kept as its own type rather than Partial<Conversation> so callers can rely on
// other_name/other_avatar_url actually being present (or explicitly null).
export interface ConversationWithParty {
  id: string;
  type: 'direct_business' | 'direct_friend';
  created_at: string;
  other_profile_id: string;
  other_name: string | null;
  other_avatar_url: string | null;
  other_business_id: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

export interface ChatFriend {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function resolveAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url}`;
}

export async function getConversations(type: ConversationType): Promise<Conversation[]> {
  const result = await apiClient.get<{ conversations: Conversation[] }>('/conversations', {
    query: { type },
  });
  if (!result.success) throw new Error(result.error ?? 'Failed to load conversations');
  return (result.data!.conversations ?? []).map((c) => ({
    ...c,
    other_avatar_url: resolveAvatarUrl(c.other_avatar_url),
  }));
}

export async function getFriends(): Promise<ChatFriend[]> {
  const result = await apiClient.get<{ friends: ChatFriend[] }>('/conversations/friends');
  if (!result.success) throw new Error(result.error ?? 'Failed to load friends');
  return (result.data!.friends ?? []).map((f) => ({
    ...f,
    avatar_url: resolveAvatarUrl(f.avatar_url),
  }));
}

export async function getOrCreateConversation(
  targetProfileId: string,
  type: ConversationType,
): Promise<{ conversation: ConversationWithParty; created: boolean }> {
  const result = await apiClient.post<{ conversation: ConversationWithParty; created: boolean }>(
    '/conversations',
    { targetProfileId, type },
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to open conversation');
  return {
    ...result.data!,
    conversation: {
      ...result.data!.conversation,
      other_avatar_url: resolveAvatarUrl(result.data!.conversation.other_avatar_url),
    },
  };
}

export async function getMessages(conversationId: string, after?: string): Promise<ChatMessage[]> {
  const result = await apiClient.get<{ messages: ChatMessage[] }>(
    `/conversations/${conversationId}/messages`,
    { query: { after: after || undefined } },
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to load messages');
  return result.data!.messages ?? [];
}

export async function sendMessage(conversationId: string, body: string): Promise<ChatMessage> {
  const result = await apiClient.post<{ message: ChatMessage }>(
    `/conversations/${conversationId}/messages`,
    { body },
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to send message');
  return result.data!.message;
}

export async function markRead(conversationId: string): Promise<void> {
  const result = await apiClient.post<{ read: boolean }>(`/conversations/${conversationId}/read`);
  if (!result.success) throw new Error(result.error ?? 'Failed to mark read');
}
