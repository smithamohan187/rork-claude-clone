import { apiClient } from '../client';

export interface SubscriptionPlan {
  id: string
  name: string
  price_monthly: number
  price_yearly?: number | null
  price_cents: number | null
  max_offers?: number | null
  max_events?: number | null
  max_subscribers?: number | null
  can_broadcast: boolean
  can_run_rewards: boolean
  priority_listing: boolean
}

export interface BusinessSubscription {
  id: string
  business_id: string
  plan_id: string
  plan_name: string
  status: 'active' | 'cancelled' | 'expired' | 'trial'
  current_period_end?: string | null
  stripe_subscription_id?: string | null
}

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const result = await apiClient.get<SubscriptionPlan[]>('/billing/plans');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch plans');
  return result.data ?? [];
}

export async function createCheckoutSession(
  planId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const result = await apiClient.post<{ url: string }>('/billing/checkout-session', {
    plan_id: planId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to start checkout');
  return result.data.url;
}

export async function selectFreePlan(): Promise<BusinessSubscription> {
  const result = await apiClient.post<BusinessSubscription>('/billing/select-free-plan');
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to select free plan');
  return result.data;
}

export async function changePlan(planId: string): Promise<{ pending: boolean }> {
  const result = await apiClient.post<{ pending: boolean }>('/billing/change-plan', { plan_id: planId });
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to change plan');
  return result.data;
}

export async function createPortalSession(
  planId: string,
  returnUrl: string,
): Promise<string> {
  const result = await apiClient.post<{ url: string }>('/billing/portal-session', {
    plan_id: planId,
    return_url: returnUrl,
  });
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to open billing portal');
  return result.data.url;
}

export async function cancelSubscription(): Promise<BusinessSubscription> {
  const result = await apiClient.post<BusinessSubscription>('/billing/cancel');
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to cancel subscription');
  return result.data;
}

export async function fetchMySubscription(): Promise<BusinessSubscription | null> {
  const result = await apiClient.get<BusinessSubscription | null>('/billing/my-subscription');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch subscription');
  return result.data ?? null;
}
