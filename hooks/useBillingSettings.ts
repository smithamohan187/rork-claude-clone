import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchPlans,
  fetchMySubscription,
  cancelSubscription,
  type SubscriptionPlan,
  type BusinessSubscription,
} from '@/api/services/billingService';
import { useSubscriptionCheckout } from './useSubscriptionCheckout';

export function useBillingSettings() {
  const { authLoading, isAuthenticated } = useAuth();
  const { checkout } = useSubscriptionCheckout();

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

  const cancelPlan = useCallback(async () => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await cancelSubscription();
      setSubscription(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setUpdating(false);
    }
  }, []);

  // Renewal always goes through a fresh Stripe Checkout (no plan-switch/portal flow anymore —
  // tiers are assigned automatically by the daily cron job once a subscription is active).
  const renewWithPlan = useCallback(async (planId: string): Promise<boolean> => {
    setUpdating(true);
    setError(null);
    try {
      const { outcome, subscription: newSubscription } = await checkout(planId);
      if (outcome === 'success' && newSubscription) {
        setSubscription(newSubscription);
        return true;
      }
      if (outcome !== 'redirected') {
        setError('Checkout was not completed. Select a plan and try again.');
      }
      return outcome === 'redirected';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [checkout]);

  return { plans, subscription, loading, updating, error, setError, cancelPlan, renewWithPlan };
}
