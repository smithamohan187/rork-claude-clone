import { apiClient, API_BASE_URL } from '@/api/client';

const BASE_URL = API_BASE_URL.replace(/\/$/, '');

function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export interface TierInfo {
  id: string;
  name: string;
  minPoints: number;
  color: string | null;
}

export interface PointsBreakdownItem {
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  points: number;
  tiers: TierInfo[];
  currentTier: TierInfo | null;
  nextTier: TierInfo | null;
  pointsToNextTier: number | null;
  progressPercent: number;
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
