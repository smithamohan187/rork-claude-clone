import { apiClient, API_BASE_URL } from '@/api/client';

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export type ActivityType = 'redemption' | 'subscriber' | 'like' | 'comment' | 'referral';

export interface RecentActivityItem {
  type: ActivityType;
  actorName: string | null;
  actorAvatar: string | null;
  message: string;
  timestamp: string;
  referenceId: string;
}

export interface RecentRedemption {
  referenceId: string;
  customerName: string | null;
  customerAvatar: string | null;
  rewardName: string;
  pointsCost: number | null;
  redeemedAt: string;
}

export async function fetchRecentActivity(limit = 20, offset = 0): Promise<RecentActivityItem[]> {
  const result = await apiClient.get<RecentActivityItem[]>(
    `/dashboard/feed/recent-activity?limit=${limit}&offset=${offset}`
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to load recent activity');
  return (result.data ?? []).map((item) => ({ ...item, actorAvatar: resolveUrl(item.actorAvatar) }));
}

export async function fetchRecentRedemptions(limit = 20, offset = 0): Promise<RecentRedemption[]> {
  const result = await apiClient.get<RecentRedemption[]>(
    `/dashboard/feed/redemptions?limit=${limit}&offset=${offset}`
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to load redemptions');
  return (result.data ?? []).map((item) => ({ ...item, customerAvatar: resolveUrl(item.customerAvatar) }));
}
