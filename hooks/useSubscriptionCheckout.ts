import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createCheckoutSession, createPortalSession, fetchMySubscription, BusinessSubscription } from '../api/services/billingService';

export type CheckoutOutcome = 'success' | 'cancel' | 'dismiss' | 'redirected';

interface CheckoutResult {
  outcome: CheckoutOutcome;
  subscription: BusinessSubscription | null;
}

export function useSubscriptionCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(async (planId: string): Promise<CheckoutResult> => {
    setLoading(true);
    setError(null);
    try {
      const successUrl = Linking.createURL('checkout-success');
      const cancelUrl = Linking.createURL('checkout-cancel');
      const url = await createCheckoutSession(planId, successUrl, cancelUrl);

      if (Platform.OS === 'web') {
        // Popup-based auth flows are unreliable on web (popup blockers, and the button
        // press's "user gesture" window is long gone by the time registerBusiness/uploads/
        // completeOnboarding finish awaiting). A full-page redirect avoids both — the app
        // reloads from scratch when Stripe redirects back to /checkout-success, which is
        // why that screen re-derives everything from the server instead of resuming
        // in-memory state.
        window.location.assign(url);
        // Execution effectively stops here — the page is navigating away.
        return { outcome: 'redirected', subscription: null };
      }

      const result = await WebBrowser.openAuthSessionAsync(url, successUrl);

      if (result.type === 'success' && result.url.startsWith(successUrl)) {
        const subscription = await fetchMySubscription();
        return { outcome: 'success', subscription };
      }
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { outcome: result.type === 'cancel' ? 'cancel' : 'dismiss', subscription: null };
      }
      return { outcome: 'cancel', subscription: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Swap between two already-paid plans: uses the Stripe Customer Portal instead of Checkout —
  // Checkout in mode:'subscription' always creates a brand-new subscription, which would
  // double-bill a business that already has one. The Portal updates the existing subscription
  // in place with a real Stripe-hosted confirm/proration page.
  const openPortal = useCallback(async (planId: string): Promise<CheckoutResult> => {
    setLoading(true);
    setError(null);
    try {
      const returnUrl = Linking.createURL('checkout-success');
      const url = await createPortalSession(planId, returnUrl);

      if (Platform.OS === 'web') {
        window.location.assign(url);
        return { outcome: 'redirected', subscription: null };
      }

      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);

      if (result.type === 'success' && result.url.startsWith(returnUrl)) {
        return { outcome: 'success', subscription: null };
      }
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { outcome: result.type === 'cancel' ? 'cancel' : 'dismiss', subscription: null };
      }
      return { outcome: 'cancel', subscription: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open billing portal';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkout, openPortal, loading, error, setError };
}
