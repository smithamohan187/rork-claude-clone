import { apiClient } from '@/api/client';

export type ShareContentType = 'post' | 'offer' | 'event' | 'broadcast';
export type ShareChannel =
  | 'facebook' | 'twitter' | 'instagram' | 'tiktok'
  | 'whatsapp' | 'messenger' | 'sms' | 'email' | 'native' | 'contacts';

export async function logShare(
  content_type: ShareContentType,
  content_id: string,
  channel: ShareChannel,
): Promise<void> {
  await apiClient.post('/shares', { content_type, content_id, channel });
}
