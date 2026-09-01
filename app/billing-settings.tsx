import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, CreditCard, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useBillingSettings } from '@/hooks/useBillingSettings';
import type { SubscriptionPlan } from '@/api/services/billingService';

export default function BillingSettingsScreen() {
  const router = useRouter();
  const { plans, subscription, loading, updating, error, setError, selectPlan } = useBillingSettings();

  const handleSelectPlan = useCallback((plan: SubscriptionPlan) => {
    if (plan.id === subscription?.plan_id) return;

    const isDowngradeToFree = plan.price_monthly === 0;
    const title = isDowngradeToFree ? 'Cancel your paid plan?' : `Switch to ${plan.name}?`;
    const message = isDowngradeToFree
      ? 'Your plan will move to Free. You can subscribe to a paid plan again anytime.'
      : `Your plan will change to ${plan.name} at $${plan.price_monthly}/mo.`;

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => selectPlan(plan.id) },
    ]);
  }, [subscription, selectPlan]);

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
          {subscription && (
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
              <View style={[
                styles.statusBadge,
                subscription.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeInactive,
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  subscription.status === 'active' ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                ]}>
                  {subscription.status}
                </Text>
              </View>
            </View>
          )}

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <X size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Available plans</Text>
          <View style={styles.planList}>
            {plans.map((plan) => {
              const isCurrent = plan.id === subscription?.plan_id;
              const priceLabel = plan.price_monthly === 0 ? 'Free' : `$${plan.price_monthly}/mo`;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, isCurrent && styles.planCardCurrent]}
                  onPress={() => handleSelectPlan(plan)}
                  disabled={isCurrent || updating}
                  activeOpacity={0.7}
                >
                  <View style={styles.planCardHeader}>
                    <Text style={styles.planCardName}>{plan.name}</Text>
                    <Text style={styles.planCardPrice}>{priceLabel}</Text>
                  </View>
                  {isCurrent && (
                    <View style={styles.currentPill}>
                      <Check size={14} color={Colors.navyDark} />
                      <Text style={styles.currentPillText}>Current</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {updating && (
            <View style={styles.updatingRow}>
              <ActivityIndicator size="small" color={Colors.navyDark} />
              <Text style={styles.updatingText}>Updating your plan...</Text>
            </View>
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
    marginBottom: 20,
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
  statusBadgeInactive: {
    backgroundColor: Colors.error + '15',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'capitalize' as const,
  },
  statusBadgeTextActive: {
    color: Colors.success,
  },
  statusBadgeTextInactive: {
    color: Colors.error,
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
  planCardCurrent: {
    borderColor: Colors.navyDark,
    backgroundColor: Colors.navyDark + '06',
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
  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.navyDark + '10',
  },
  currentPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.navyDark,
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
