import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, CreditCard, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useBillingSettings } from '@/hooks/useBillingSettings';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { SubscriptionPlan } from '@/api/services/billingService';

export default function BillingSettingsScreen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { plans, subscription, loading, updating, error, setError, cancelPlan, renewWithPlan } = useBillingSettings();

  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel your subscription?',
      "If you cancel, your business will no longer be listed in the app and you won't be able to view your subscribers.",
      [
        { text: 'Keep subscription', style: 'cancel' },
        { text: 'Cancel subscription', style: 'destructive', onPress: cancelPlan },
      ],
    );
  }, [cancelPlan]);

  const handleRenew = useCallback(async (plan: SubscriptionPlan) => {
    const success = await renewWithPlan(plan.id);
    if (success) {
      showSnackbar('Subscription renewed — your business is live!');
      router.replace('/(tabs)/feed' as never);
    }
  }, [renewWithPlan, showSnackbar, router]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan & Billing</Text>
          <View style={styles.headerBtn} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.navyDark} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <X size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}

          {isActive && subscription ? (
            <>
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

              <Text style={styles.tierNote}>
                Your plan tier is set automatically based on your subscriber count — no need to switch plans manually.
              </Text>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={updating}
                activeOpacity={0.7}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.warningBanner}>
                <AlertTriangle size={20} color={Colors.error} />
                <Text style={styles.warningText}>
                  Your subscription is cancelled — your business isn't listed in the app and you can't view your subscribers. Renew to go live again.
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Choose a plan to renew</Text>
              <View style={styles.planList}>
                {plans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.planCard}
                    onPress={() => handleRenew(plan)}
                    disabled={updating}
                    activeOpacity={0.7}
                  >
                    <View style={styles.planCardHeader}>
                      <Text style={styles.planCardName}>{plan.name}</Text>
                      <Text style={styles.planCardPrice}>£{plan.price_monthly}/mo</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {updating && (
                <View style={styles.updatingRow}>
                  <ActivityIndicator size="small" color={Colors.navyDark} />
                  <Text style={styles.updatingText}>Starting checkout...</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.error + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
    marginRight: 8,
  },
  tierNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.error + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  planList: {
    gap: 10,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    padding: 16,
    backgroundColor: Colors.surface,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  planCardName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planCardPrice: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  updatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    marginTop: 20,
  },
  updatingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
