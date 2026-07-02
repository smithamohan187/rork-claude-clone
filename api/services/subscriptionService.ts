import { apiClient } from '@/api/client';

export async function subscribeToBusiness(businessId: string): Promise<{ subscribed: boolean }> {
  const result = await apiClient.post<{ subscribed: boolean }>('/subscriptions/subscribe', { business_id: businessId });
  if (!result.success) throw new Error(result.error ?? 'Subscribe failed');
  return result.data!;
}

export async function unsubscribeFromBusiness(businessId: string): Promise<{ subscribed: boolean }> {
  const result = await apiClient.post<{ subscribed: boolean }>('/subscriptions/unsubscribe', { business_id: businessId });
  if (!result.success) throw new Error(result.error ?? 'Unsubscribe failed');
  return result.data!;
}

export async function getSubscriptionStatus(businessId: string): Promise<{ isSubscribed: boolean }> {
  const result = await apiClient.get<{ isSubscribed: boolean }>(`/subscriptions/status?business_id=${businessId}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch subscription status');
  return result.data!;
}
