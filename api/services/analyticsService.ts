import { apiClient } from '@/api/client';

export type AnalyticsPeriod = 7 | 30 | 90;

export interface AnalyticsMetric {
  value: number;
  changePct: number;
}

export interface AnalyticsSummary {
  new_subscribers: AnalyticsMetric;
  offers_shared: AnalyticsMetric;
  points_awarded: AnalyticsMetric;
  coupons_redeemed: AnalyticsMetric;
}

export interface AnalyticsSeriesPoint {
  date: string;
  count: number;
}

export interface PointsBreakdownSlice {
  label: string;
  value: number;
}

export interface TopSharedOffer {
  id: string;
  name: string;
  shares: number;
}

export interface BusinessAnalytics {
  period: AnalyticsPeriod;
  summary: AnalyticsSummary;
  redemptionTrend: AnalyticsSeriesPoint[];
  subscriberGrowth: AnalyticsSeriesPoint[];
  pointsBreakdown: PointsBreakdownSlice[];
  topSharedOffers: TopSharedOffer[];
}

export async function fetchBusinessAnalytics(period: AnalyticsPeriod): Promise<BusinessAnalytics> {
  const result = await apiClient.get<BusinessAnalytics>(`/analytics/summary?period=${period}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load analytics');
  return result.data!;
}
