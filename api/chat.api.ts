// mobile/src/api/chat.api.ts
import { apiClient, ApiResult } from './client';

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id?: string | null;
  message_type: 'text' | 'offer_share' | 'broadcast';
  content?: string | null;
  offer_share_payload?: Record<string, unknown> | null;
  created_at: string;
};

export type Broadcast = {
  id: string;
  business_id: string;
  content: string;
  audience: 'all' | 'subscribers' | 'referrals';
  created_at: string;
};

export const chatApi = {
  getMessages(conversationId: string): Promise<ApiResult<ChatMessage[]>> {
    return apiClient.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
  },
  sendMessage(payload: {
    conversation_id: string;
    sender_id: string;
    receiver_id?: string;
    message_type?: 'text' | 'offer_share' | 'broadcast';
    content?: string;
    offer_share_payload?: Record<string, unknown>;
  }): Promise<ApiResult<ChatMessage>> {
    return apiClient.post<ChatMessage>('/chat/messages', payload);
  },
  getBroadcasts(businessId: string): Promise<ApiResult<Broadcast[]>> {
    return apiClient.get<Broadcast[]>(`/chat/businesses/${businessId}/broadcasts`);
  },
  createBroadcast(payload: { business_id: string; content: string; audience?: 'all' | 'subscribers' | 'referrals' }): Promise<ApiResult<Broadcast>> {
    return apiClient.post<Broadcast>('/chat/broadcasts', payload);
  },
};
