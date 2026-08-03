import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { CheckCircle2, X } from 'lucide-react-native';
import TierBadge, { getTierGradient } from '@/components/TierBadge';
import type { GlobalTierInfo } from '@/api/services/globalRewardTierService';

const POINTS_DISCLAIMER =
  'Points are non-monetary. TouchPoint does not pay cash or transfer monetary value.';

interface TierDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  tiers: GlobalTierInfo[];
  currentTierId: string | null;
  netBalance: number;
}

export default function TierDetailModal({
  visible,
  onDismiss,
  tiers,
  currentTierId,
  netBalance,
}: TierDetailModalProps) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Reward Tiers</Text>
            <Text style={styles.subtitle}>
              Earn points across every business you follow to level up your tier.
            </Text>
          </View>
          <Pressable onPress={onDismiss} hitSlop={10} style={styles.closeBtn} testID="tier-modal-close">
            <X size={18} color="#1B2A4A" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {tiers.map((tier) => {
            const isAchieved = netBalance >= tier.min_points;
            const isCurrent = tier.id === currentTierId;
            const color = getTierGradient(tier.tier_name)[0];

            return (
              <View
                key={tier.id}
                style={[
                  styles.row,
                  {
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? color : '#F0EDF5',
                    backgroundColor: isAchieved ? color + '12' : '#FAFAFA',
                  },
                ]}
              >
                <TierBadge tierName={tier.tier_name} size="medium" locked={!isAchieved} testID={`tier-modal-badge-${tier.id}`} />

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.rowTitleRow}>
                    <Text style={[styles.rowTitle, { color: isAchieved ? color : '#9E9E9E' }]}>
                      {tier.tier_name}
                    </Text>
                    {isCurrent && <Text style={styles.youAreHere}>← You are here</Text>}
                  </View>
                  <Text style={styles.rowRange}>{tier.min_points.toLocaleString()}+ points</Text>
                </View>

                {isAchieved && <CheckCircle2 size={20} color={color} style={styles.check} />}
              </View>
            );
          })}

          <Text style={styles.disclaimer}>{POINTS_DISCLAIMER}</Text>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 16,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#1B2A4A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6B7A8D',
    lineHeight: 17,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F0F8',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    marginBottom: 10,
    borderRadius: 14,
  },
  rowTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  rowTitle: { fontSize: 15, fontWeight: '700' as const },
  youAreHere: {
    fontSize: 11,
    color: '#1A5C35',
    fontWeight: '700' as const,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowRange: { fontSize: 11.5, color: '#9E9E9E', marginTop: 2 },
  check: { marginLeft: 6 },
  disclaimer: {
    fontSize: 11,
    color: '#A8B0BA',
    textAlign: 'center' as const,
    marginTop: 6,
    fontStyle: 'italic' as const,
    paddingHorizontal: 12,
    lineHeight: 16,
  },
});
