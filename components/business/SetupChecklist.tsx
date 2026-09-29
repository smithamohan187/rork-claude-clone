import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Check,
  ChevronRight,
  Store,
  Gift,
  CreditCard,
  PenSquare,
  UserPlus,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import type { DashboardSummary } from '@/api/services/businessDashboardService';

interface ChecklistItem {
  id: string;
  label: string;
  sublabel: string;
  done: boolean;
  route: string;
  icon: React.ElementType;
  accent: string;
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

  const items = useMemo<ChecklistItem[]>(() => {
    const trialStarted = summary?.subscription_status === 'trial' || summary?.subscription_status === 'active';
    return [
      {
        id: 'profile', label: 'Complete your profile', sublabel: 'Address, contact & business type',
        done: !!summary?.onboarding_complete, route: '/business-complete-profile',
        icon: Store, accent: '#1A5C35',
      },
      // "Prizes", not "Tiers" — reward tiers are a global, admin-set concept (not something a
      // business owner configures here); this step is specifically about the rewards catalog.
      {
        id: 'rewards', label: 'Add rewards & prizes', sublabel: 'Points settings + at least one prize',
        done: !!summary?.has_rewards, route: '/reward-configuration',
        icon: Gift, accent: '#7C3AED',
      },
      {
        id: 'trial', label: 'Start your Stripe trial', sublabel: 'Unlocks posting & inviting customers',
        done: trialStarted, route: '/business-start-trial',
        icon: CreditCard, accent: '#E0A52E',
      },
      {
        id: 'post', label: 'Add a post', sublabel: 'Share an update with subscribers',
        done: (summary?.post_count ?? 0) > 0, route: '/create-post',
        icon: PenSquare, accent: '#3B82F6',
      },
      {
        id: 'invite', label: 'Invite a customer', sublabel: 'Grow your subscriber base',
        done: (summary?.invite_count ?? 0) > 0, route: '/invite-customers',
        icon: UserPlus, accent: '#EF4444',
        params: { businessId: businessId ?? '', businessName: businessName ?? '' },
      },
    ];
  }, [summary, businessId, businessName]);

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;
  const progress = doneCount / items.length;

  if (allDone) return null; // fades away once fully set up — nothing left to nudge the owner about

  return (
    <View style={styles.card} testID="setup-checklist">
      <LinearGradient
        colors={['#1A5C35', '#00B246']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.title}>Finish setting up your business</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{doneCount}/{items.length}</Text>
          </View>
        </View>
        <ProgressBar
          progress={progress}
          color="#FFFFFF"
          style={styles.progressBar}
        />
      </LinearGradient>

      <View style={styles.list}>
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.row, index < items.length - 1 && styles.rowDivider]}
              onPress={() => router.push({
                pathname: item.route,
                params: { returnTo: 'dashboard', ...item.params },
              } as never)}
              activeOpacity={0.65}
              testID={`checklist-item-${item.id}`}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: item.done ? item.accent : `${item.accent}18` },
                ]}
              >
                {item.done ? (
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Icon size={16} color={item.accent} />
                )}
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowLabel, item.done && styles.rowLabelDone]}>{item.label}</Text>
                <Text style={styles.rowSublabel} numberOfLines={1}>
                  {item.done ? 'Done' : item.sublabel}
                </Text>
              </View>
              {!item.done && <ChevronRight size={18} color={Colors.textTertiary} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {!(items.find(i => i.id === 'profile')?.done && items.find(i => i.id === 'trial')?.done) && (
        <View style={styles.lockNoteWrap}>
          <Text style={styles.lockNote}>
            🔒 Complete your profile and start your Stripe trial to unlock posting and inviting customers.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  title: { fontSize: 14.5, fontWeight: '700' as const, color: '#FFFFFF', flexShrink: 1 },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: { fontSize: 12.5, fontWeight: '800' as const, color: '#FFFFFF' },
  progressBar: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  list: { paddingHorizontal: 8, paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 13.5, fontWeight: '600' as const, color: Colors.text },
  rowLabelDone: { color: Colors.textTertiary },
  rowSublabel: { fontSize: 11.5, color: Colors.textTertiary },
  lockNoteWrap: {
    backgroundColor: '#FFF8E7',
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
    borderRadius: 12,
    padding: 10,
  },
  lockNote: {
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 16,
  },
});
