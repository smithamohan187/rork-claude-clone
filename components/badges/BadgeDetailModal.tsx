import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { CheckCircle2, X } from 'lucide-react-native';
import {
  BADGE_TIERS,
  getBadgeForPoints,
  POINTS_DISCLAIMER,
} from '@/config/badgeTiers';

interface BadgeDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  currentPoints: number;
}

export default function BadgeDetailModal({
  visible,
  onDismiss,
  currentPoints,
}: BadgeDetailModalProps) {
  const current = getBadgeForPoints(currentPoints);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Badge Tiers</Text>
            <Text style={styles.subtitle}>
              Earn points to level up your badge. Badges are recognition rewards
              — perks and status, no cash value.
            </Text>
          </View>
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            style={styles.closeBtn}
            testID="badge-modal-close"
          >
            <X size={18} color="#1B2A4A" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {BADGE_TIERS.map((tier) => {
            const isAchieved = currentPoints >= tier.minPoints;
            const isCurrent = current?.tier === tier.tier;
            const Icon = tier.icon;

            return (
              <View
                key={tier.tier}
                style={[
                  styles.row,
                  {
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? tier.colors.border : '#F0EDF5',
                    backgroundColor: isAchieved
                      ? tier.colors.background
                      : '#FAFAFA',
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: isAchieved
                        ? 'rgba(255,255,255,0.6)'
                        : '#EFEFEF',
                    },
                  ]}
                >
                  <Icon
                    size={28}
                    color={isAchieved ? tier.colors.text : '#BDBDBD'}
                    strokeWidth={2.2}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.rowTitleRow}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: isAchieved ? tier.colors.text : '#9E9E9E' },
                      ]}
                    >
                      {tier.emoji} {tier.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.youAreHere}>← You are here</Text>
                    )}
                  </View>
                  <Text style={styles.rowRange}>
                    {tier.minPoints.toLocaleString()} –{' '}
                    {tier.maxPoints
                      ? tier.maxPoints.toLocaleString()
                      : '∞'}{' '}
                    points
                  </Text>
                  <Text style={styles.rowPerks}>{tier.perksLabel}</Text>
                </View>

                {isAchieved && (
                  <CheckCircle2
                    size={20}
                    color={tier.colors.text}
                    style={styles.check}
                  />
                )}
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
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  rowPerks: { fontSize: 12, color: '#5C6470', marginTop: 3, fontWeight: '500' as const },
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
