import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchDashboardSummary } from '@/api/services/businessDashboardService';
import { useAuth } from '@/contexts/AuthContext';

export interface BusinessUnlockStatus {
  unlocked: boolean;
  loading: boolean;
  lockMessage: string;
}

const LOCK_MESSAGE = 'Complete your business profile and start your Stripe trial to unlock this.';

// Shared by every entry point that needs to know whether a business may post content or invite
// customers yet (app/(tabs)/content.tsx's create buttons, business-profile's invite entry).
// Reuses the same GET /businesses/me/dashboard-summary call the dashboard checklist already
// makes — no new endpoint — so "unlocked" here always matches what the backend gate itself
// enforces (onboarding_complete + an active/trialing Stripe subscription).
export function useBusinessUnlockStatus(): BusinessUnlockStatus {
  const { authLoading, isAuthenticated, accountType } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authLoading || !isAuthenticated || accountType !== 'business') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const summary = await fetchDashboardSummary();
      const trialStarted = summary.subscription_status === 'trial' || summary.subscription_status === 'active';
      setUnlocked(!!summary.onboarding_complete && trialStarted);
    } catch {
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, accountType]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { unlocked, loading, lockMessage: LOCK_MESSAGE };
}
