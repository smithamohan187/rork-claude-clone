import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { fetchMySubscription } from '@/api/services/billingService';

// Landing page for the web checkout redirect (see hooks/useSubscriptionCheckout.ts). A full-page
// redirect to Stripe reloads the app from scratch, so this screen re-derives everything from the
// server (via AuthContext's own session restore) instead of resuming any in-memory create-business
// state — the business itself was already created before checkout started.
const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 1500;

type ScreenStatus = 'polling' | 'timedOut';

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const { authLoading, isAuthenticated, updateAuthUser, refreshProfiles } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [status, setStatus] = useState<ScreenStatus>('polling');

  const proceedToApp = useCallback(async () => {
    updateAuthUser({ role: 'business' });
    try { await refreshProfiles(); } catch { /* non-fatal */ }
    router.replace('/(tabs)/feed' as never);
  }, [updateAuthUser, refreshProfiles, router]);

  const pollForActiveSubscription = useCallback(async (isCancelled: () => boolean) => {
    // The Stripe webhook that actually creates the business_subscriptions row can land a
    // moment after the redirect — poll briefly rather than assuming it's already there.
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (isCancelled()) return;
      try {
        const subscription = await fetchMySubscription();
        if (subscription?.status === 'active') {
          if (isCancelled()) return;
          showSnackbar('Payment completed — your business is live!');
          await proceedToApp();
          return;
        }
      } catch {
        // Keep retrying — a transient failure here shouldn't stop the poll loop.
      }
      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }
    if (isCancelled()) return;
    // Stripe hasn't confirmed the subscription yet — don't silently pretend it worked.
    setStatus('timedOut');
  }, [proceedToApp, showSnackbar]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/(auth)/sign-in' as never);
      return;
    }

    let cancelled = false;
    pollForActiveSubscription(() => cancelled);
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, router, pollForActiveSubscription]);

  const handleCheckAgain = useCallback(() => {
    setStatus('polling');
    let cancelled = false;
    pollForActiveSubscription(() => cancelled);
  }, [pollForActiveSubscription]);

  if (status === 'timedOut') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Still confirming your plan</Text>
        <Text style={styles.text}>
          We're still confirming your subscription with Stripe. This can take a few seconds
          longer — you can check again, or continue and it'll finish activating shortly.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleCheckAgain} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Check again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={proceedToApp} activeOpacity={0.7}>
          <Text style={styles.link}>Continue to app anyway</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.navyDark} />
      <Text style={styles.text}>Finishing setup...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: Colors.background,
  },
  text: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.navyDark,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  link: {
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline' as const,
  },
});
