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

// ── Content-share referral (per-recipient deep links) ─────────────────────────

export interface ShareRecipientResult {
  recipient_contact: string | null;
  referral_code: string;
  url: string;
}

export interface ResolvedShareReferral {
  // 'business' is returned when the code belongs to a customer invite (Invite Customers).
  // 'app_referral' is returned when the code belongs to an app-level Invite Friends referral.
  // 'business_invite' is returned when the code belongs to an Invite-a-Business referral.
  // None of these are content-shares — all resolved via the same /s/<code> link shape.
  content_type: ShareContentType | 'business' | 'app_referral' | 'business_invite';
  content_id: string;
  business_id: string;
  route: string;      // e.g. '/view-post' or '/business-profile/[id]'
  id_param: string;   // e.g. 'postId' or 'id'
}

// Creates one share_recipients row per recipient (or a single null-contact row when `recipients`
// is empty, for social/native single-link shares) and returns the referral_code + url for each.
export async function createShareRecipients(payload: {
  content_type: ShareContentType;
  content_id: string;
  business_id: string;
  recipients?: { contact: string | null }[];
}): Promise<ShareRecipientResult[]> {
  const result = await apiClient.post<{ recipients: ShareRecipientResult[] }>(
    '/feed/share-recipients',
    payload,
  );
  return result.data?.recipients ?? [];
}

// Resolves a referral code (public, no auth) to its content + the detail route to open.
export async function resolveShareReferral(referral_code: string): Promise<ResolvedShareReferral | null> {
  const result = await apiClient.post<ResolvedShareReferral>(
    '/feed/share/resolve-share-referral',
    { referral_code },
  );
  return result.success && result.data ? result.data : null;
}

// ── Refer an offer to trusted friends via chat ────────────────────────────────

export interface ShareOfferToFriendsResultItem {
  targetProfileId: string;
  ok: boolean;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

export async function shareOfferToFriends(
  offerId: string,
  targetProfileIds: string[],
): Promise<ShareOfferToFriendsResultItem[]> {
  const result = await apiClient.post<{ results: ShareOfferToFriendsResultItem[] }>(
    '/feed/share/offer-to-friends',
    { offerId, targetProfileIds },
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to share offer');
  return result.data!.results ?? [];
}
