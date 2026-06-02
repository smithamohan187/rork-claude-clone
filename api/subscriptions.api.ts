// mobile/src/api/subscriptions.api.ts
import { apiClient, ApiResult } from './client';

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features?: string[];
};

export type BusinessSubscription = {
  id: string;
  user_id: string;
  business_id: string;
  plan_id?: string | null;
  created_at: string;
};

export const subscriptionsApi = {
  getPlans(): Promise<ApiResult<SubscriptionPlan[]>> {
    return apiClient.get<SubscriptionPlan[]>('/subscriptions/plans');
  },
  subscribe(payload: { user_id: string; business_id: string; plan_id?: string }): Promise<ApiResult<BusinessSubscription>> {
    return apiClient.post<BusinessSubscription>('/subscriptions/subscribe', payload);
  },
  getMySubscriptions(userId: string): Promise<ApiResult<BusinessSubscription[]>> {
    return apiClient.get<BusinessSubscription[]>(`/subscriptions/users/${userId}`);
  },
  getBusinessSubscribers(businessId: string): Promise<ApiResult<unknown[]>> {
    return apiClient.get<unknown[]>(`/subscriptions/businesses/${businessId}/subscribers`);
  },
};
