import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ProgressBar, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, Circle, Lock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useBusinessUnlockStatus } from '@/hooks/useBusinessUnlockStatus';
import type { DashboardSummary } from '@/api/services/businessDashboardService';

// Row ids that require the profile+trial gate before their destination screen is usable
// (posting content, inviting customers) — kept in sync with the backend's isBusinessUnlocked gate.
const GATED_ITEM_IDS = new Set(['post', 'invite']);

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  route: string;
  params?: Record<string, string>;
}

interface SetupChecklistProps {
  summary: DashboardSummary | null;
  businessId?: string | null;
  businessName?: string;
}

// The dashboard's first-run "getting started" module. Deliberately a flat 5-item checklist with a
// single completeness bar rather than separate percentages per feature — a new business owner
// should see one clear number ("2 of 5") and one obvious next tap, not several competing signals.
// Data comes from the same GET /businesses/me/dashboard-summary call the rest of the dashboard
// already uses (extended with post/invite counts, has_rewards, onboarding_complete, and
// subscription_status) so this adds no extra network round-trip.
//
// Every destination is pushed with returnTo=dashboard so it can navigate straight back here once
// that step is actually satisfied, instead of leaving the owner to find their own way back.
export default function SetupChecklist({ summary, businessId, businessName }: SetupChecklistProps) {
  const router = useRouter();
  const { unlocked: businessUnlocked, lockMessage } = useBusinessUnlockStatus();
  const [snackVisible, setSnackVisible] = useState(false);

  const handlePress = useCallback((item: ChecklistItem) => {
    if (GATED_ITEM_IDS.has(item.id) && !businessUnlocked) {
      setSnackVisible(true);
      return;
    }
    router.push({
      pathname: item.route,
      params: { returnTo: 'dashboard', ...item.params },
    } as never);
  }, [businessUnlocked, router]);

  const items = useMemo<ChecklistItem[]>(() => {
    const trialStarted = summary?.subscription_status === 'trial' || summary?.subscription_status === 'active';
    return [
      { id: 'profile', label: 'Complete your profile', done: !!summary?.onboarding_complete, route: '/business-complete-profile' },
      // "Prizes", not "Tiers" — reward tiers are a global, admin-set concept (not something a
      // business owner configures here); this step is specifically about the rewards catalog.
      { id: 'rewards', label: 'Add rewards & prizes', done: !!summary?.has_rewards, route: '/reward-configuration' },
      { id: 'trial', label: 'Start your Stripe trial', done: trialStarted, route: '/business-start-trial' },
      { id: 'post', label: 'Add a post', done: (summary?.post_count ?? 0) > 0, route: '/create-post' },
      {
        id: 'invite', label: 'Invite a customer', done: (summary?.invite_count ?? 0) > 0, route: '/invite-customers',
        params: { businessId: businessId ?? '', businessName: businessName ?? '' },
      },
    ];
  }, [summary, businessId, businessName]);

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) return null; // fades away once fully set up — nothing left to nudge the owner about

  return (
    <View style={styles.card} testID="setup-checklist">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Finish setting up your business</Text>
        <Text style={styles.count}>{doneCount} of {items.length}</Text>
      </View>
      <ProgressBar
        progress={doneCount / items.length}
        color={Colors.primary}
        style={styles.progressBar}
      />
      <View style={styles.list}>
        {items.map((item) => {
          const isLocked = GATED_ITEM_IDS.has(item.id) && !businessUnlocked && !item.done;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.row}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
              testID={`checklist-item-${item.id}`}
            >
              <View style={[styles.iconWrap, item.done && styles.iconWrapDone]}>
                {item.done ? (
                  <Check size={14} color="#FFFFFF" />
                ) : isLocked ? (
                  <Lock size={10} color={Colors.textTertiary} />
                ) : (
                  <Circle size={10} color={Colors.textTertiary} />
                )}
              </View>
              <Text style={[styles.rowLabel, item.done && styles.rowLabelDone, isLocked && styles.rowLabelLocked]}>{item.label}</Text>
              {!item.done && !isLocked && <ChevronRight size={16} color={Colors.textTertiary} />}
            </TouchableOpacity>
          );
        })}
      </View>
      {!(items.find(i => i.id === 'profile')?.done && items.find(i => i.id === 'trial')?.done) && (
        <Text style={styles.lockNote}>
          Complete your profile and start your Stripe trial to unlock posting offers/events and inviting customers.
        </Text>
      )}
      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
      >
        {lockMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  count: { fontSize: 13, fontWeight: '600' as const, color: Colors.primaryDark },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 14 },
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  iconWrap: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rowLabel: { flex: 1, fontSize: 13.5, fontWeight: '500' as const, color: Colors.text },
  rowLabelDone: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  rowLabelLocked: { color: Colors.textTertiary },
  lockNote: {
    fontSize: 11.5,
    color: Colors.textTertiary,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    lineHeight: 16,
  },
});
