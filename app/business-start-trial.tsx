import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Check, CreditCard } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { fetchPlans, fetchMySubscription, type SubscriptionPlan, type BusinessSubscription } from '@/api/services/billingService';
import { useSubscriptionCheckout } from '@/hooks/useSubscriptionCheckout';

// Entry point for the dashboard checklist's "Start Stripe Trial" step. Deliberately a small,
// standalone plan picker rather than re-entering create-business-profile's 6-step wizard — the
// same checkout flow (with its built-in 30-day trial for a business with no prior subscription,
// see billing.service.js) is reused via useSubscriptionCheckout, unchanged.
export default function BusinessStartTrialScreen() {
  const router = useRouter();
  const { checkout, loading: checkingOut, error: checkoutError } = useSubscriptionCheckout();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(null);

  useEffect(() => {
    fetchPlans()
      .then(setPlans)
      .catch(() => {})
      .finally(() => setPlansLoading(false));
    fetchMySubscription()
      .then(setSubscription)
      .catch(() => {});
  }, []);

  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';

  const handleSelect = useCallback(async (planId: string) => {
    setSelectingId(planId);
    try {
      const result = await checkout(planId);
      if (result.outcome === 'success') {
        router.back();
      }
      // 'redirected' (web) navigates away entirely; 'cancel'/'dismiss' just let the user retry.
    } catch {
      // checkoutError below already surfaces the message
    } finally {
      setSelectingId(null);
    }
  }, [checkout, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start your Stripe trial</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isActive && subscription ? (
          <View style={styles.currentCard}>
            <View style={styles.currentCardIcon}>
              <CreditCard size={22} color={Colors.navyDark} />
            </View>
            <View style={styles.currentCardInfo}>
              <Text style={styles.currentCardLabel}>Current plan</Text>
              <Text style={styles.currentCardName}>{subscription.plan_name}</Text>
              {subscription.current_period_end && (
                <Text style={styles.currentCardMeta}>
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, styles.statusBadgeActive]}>
              <Text style={[styles.statusBadgeText, styles.statusBadgeTextActive]}>
                {subscription.status}
              </Text>
            </View>
          </View>
        ) : (
        <>
        <Text style={styles.introText}>
          Pick a plan to start your 30-day trial. You won't be charged until the trial ends, and posting offers/events and inviting customers unlock right away.
        </Text>

        {plansLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
        ) : (
          plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              onPress={() => handleSelect(plan.id)}
              activeOpacity={0.85}
              disabled={checkingOut}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>
                  {plan.price_cents ? `$${(plan.price_cents / 100).toFixed(2)}/mo` : 'Custom'}
                </Text>
              </View>
              <Text style={styles.planSub}>after a 30-day free trial</Text>
              {selectingId === plan.id && checkingOut ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 10 }} />
              ) : (
                <View style={styles.planCta}>
                  <Check size={14} color={Colors.primaryDark} />
                  <Text style={styles.planCtaText}>Start free trial</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {!!checkoutError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{checkoutError}</Text>
          </View>
        )}
        </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, flex: 1, textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 48 },
  introText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 20 },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 16,
    padding: 16,
  },
  currentCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navyDark + '10',
  },
  currentCardInfo: {
    flex: 1,
  },
  currentCardLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  currentCardName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 2,
  },
  currentCardMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: Colors.success + '15',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'capitalize' as const,
  },
  statusBadgeTextActive: {
    color: Colors.success,
  },
  planCard: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16,
    padding: 16, marginBottom: 14,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  planPrice: { fontSize: 15, fontWeight: '700' as const, color: Colors.primaryDark },
  planSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  planCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  planCtaText: { fontSize: 13, fontWeight: '600' as const, color: Colors.primaryDark },
  errorBox: { backgroundColor: '#FCEAEA', borderRadius: 12, padding: 12, marginTop: 8 },
  errorText: { color: Colors.error, fontSize: 13 },
});
