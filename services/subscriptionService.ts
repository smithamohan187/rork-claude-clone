import apiClient, { ApiResult } from './apiClient';

export type SubscriptionRow = { status: string | null };

export async function getSubscription(
  profileId: string,
  businessId: string,
): Promise<ApiResult<SubscriptionRow>> {
  return apiClient.get<SubscriptionRow>(
    'subscriptions',
    { profile_id: profileId, business_id: businessId },
    { columns: 'status', maybeSingle: true },
  );
}

export async function upsertSubscription(body: {
  profile_id: string;
  business_id: string;
  status: string;
  subscribed_at: string;
}): Promise<ApiResult<null>> {
  return apiClient.upsert('subscriptions', body, {
    onConflict: 'profile_id,business_id',
  });
}
