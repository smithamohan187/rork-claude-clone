import { apiClient } from '@/api/client';

export interface DashboardSummary {
  subscriber_count: number;
  active_offer_count: number;
  upcoming_event_count: number;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const result = await apiClient.get<DashboardSummary>('/businesses/me/dashboard-summary');
  if (!result.success) throw new Error(result.error ?? 'Failed to load dashboard summary');
  return result.data!;
}
