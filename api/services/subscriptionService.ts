import { apiClient, apiRequest, API_BASE_URL } from '@/api/client';

function resolveAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL.replace(/\/$/, '')}${url}`;
}

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

export async function getSubscribedBusinesses(): Promise<any[]> {
  const result = await apiClient.get<any[]>('/subscriptions/my-businesses');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch subscribed businesses');
  return result.data!;
}

export interface BusinessMember {
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  subscribed_at: string;
  current_balance: number | null;
}

export async function getBusinessMembers(businessId: string): Promise<BusinessMember[]> {
  const result = await apiClient.get<BusinessMember[]>(`/subscriptions/members?business_id=${businessId}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch members');
  return result.data ?? [];
}

export async function getMyBusinessMembers(): Promise<BusinessMember[]> {
  const result = await apiClient.get<BusinessMember[]>('/subscriptions/members');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch members');
  return (result.data ?? []).map(m => ({ ...m, avatar_url: resolveAvatarUrl(m.avatar_url) }));
}

export async function removeBusinessMember(businessId: string, memberProfileId: string): Promise<void> {
  const result = await apiRequest<{ removed: boolean }>('DELETE', '/subscriptions/members', {
    business_id: businessId,
    member_profile_id: memberProfileId,
  });
  if (!result.success) throw new Error(result.error ?? 'Failed to remove member');
}

export async function removeMyBusinessMember(memberProfileId: string): Promise<void> {
  const result = await apiRequest<{ removed: boolean }>('DELETE', '/subscriptions/members', {
    member_profile_id: memberProfileId,
  });
  if (!result.success) throw new Error(result.error ?? 'Failed to remove member');
}
