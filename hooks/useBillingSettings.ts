import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchPlans,
  fetchMySubscription,
  selectFreePlan,
  cancelSubscription,
  type SubscriptionPlan,
  type BusinessSubscription,
} from '@/api/services/billingService';
import { useSubscriptionCheckout } from './useSubscriptionCheckout';

const CHANGE_POLL_ATTEMPTS = 5;
const CHANGE_POLL_INTERVAL_MS = 1500;

export function useBillingSettings() {
  const { authLoading, isAuthenticated } = useAuth();
  const { checkout, openPortal } = useSubscriptionCheckout();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansResult, subscriptionResult] = await Promise.all([
        fetchPlans(),
        fetchMySubscription(),
      ]);
      setPlans(plansResult);
      setSubscription(subscriptionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    load();
  }, [authLoading, isAuthenticated, load]);

  // After changePlan(), business_subscriptions only updates once Stripe's
  // customer.subscription.updated webhook lands — poll briefly, then just leave it for the
  // next natural refetch rather than blocking the user on a background upgrade.
  const pollForPlan = useCallback(async (planId: string) => {
    for (let attempt = 0; attempt < CHANGE_POLL_ATTEMPTS; attempt++) {
      const latest = await fetchMySubscription().catch(() => null);
      if (latest?.plan_id === planId) {
        setSubscription(latest);
        return;
      }
      if (attempt < CHANGE_POLL_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, CHANGE_POLL_INTERVAL_MS));
      }
    }
  }, []);

  const selectPlan = useCallback(async (planId: string) => {
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) return;

    setUpdating(true);
    setError(null);
    try {
      const hasActivePaidSubscription = subscription?.status === 'active' && !!subscription.stripe_subscription_id;

      if (targetPlan.price_monthly === 0) {
        const updated = hasActivePaidSubscription ? await cancelSubscription() : await selectFreePlan();
        setSubscription(updated);
      } else if (hasActivePaidSubscription) {
        const { outcome } = await openPortal(planId);
        if (outcome === 'success' || outcome === 'redirected') {
          await pollForPlan(planId);
        } else {
          setError('Plan change was not completed. Select a plan and try again.');
        }
      } else {
        const { outcome, subscription: newSubscription } = await checkout(planId);
        if (outcome === 'success' && newSubscription) {
          setSubscription(newSubscription);
        } else if (outcome !== 'redirected') {
          setError('Checkout was not completed. Select a plan and try again.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setUpdating(false);
    }
  }, [plans, subscription, checkout, openPortal, pollForPlan]);

  return { plans, subscription, loading, updating, error, setError, selectPlan };
}
