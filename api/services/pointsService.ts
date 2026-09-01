import { apiClient, API_BASE_URL } from '@/api/client';

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export interface PointsBreakdownItem {
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  points: number;
}

export interface PointsSummary {
  total: number;
  breakdown: PointsBreakdownItem[];
}

export async function getPointsSummary(): Promise<PointsSummary> {
  const res = await apiClient.get<PointsSummary>('/points/summary');
  const raw = res.data as PointsSummary;
  return {
    ...raw,
    breakdown: raw.breakdown.map(item => ({
      ...item,
      logoUrl: resolveUrl(item.logoUrl),
    })),
  };
}

export type PointsHistoryType =
  | 'earn_welcome' | 'earn_referral' | 'earn_visit' | 'earn_purchase' | 'earn_event'
  | 'redeem_reward' | 'expire' | 'adjust' | 'redemption_refund';

export interface PointsHistoryItem {
  id: string;
  type: PointsHistoryType;
  title: string;
  description: string;
  points: number;
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  timestamp: string;
}

export async function fetchPointsHistory(limit = 20, offset = 0): Promise<PointsHistoryItem[]> {
  const result = await apiClient.get<PointsHistoryItem[]>(
    `/points/history?limit=${limit}&offset=${offset}`
  );
  if (!result.success) throw new Error(result.error ?? 'Failed to load activity');
  return (result.data ?? []).map(item => ({
    ...item,
    businessLogoUrl: resolveUrl(item.businessLogoUrl),
  }));
}
