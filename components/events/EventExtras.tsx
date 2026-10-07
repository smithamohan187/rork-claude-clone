import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const HOT_BG = '#FFF1E6';
const HOT_FG = '#E8590C';
const FREE_BG = '#E1F5EE';
const FREE_FG = '#0F6E56';
const PRICE_BG = '#F1EEFB';
const PRICE_FG = '#1A5C35';

export function EventHotBadge() {
  return (
    <View style={[styles.badge, { backgroundColor: HOT_BG }]}>
      <Text style={[styles.badgeText, { color: HOT_FG }]}>🔥 Hot</Text>
    </View>
  );
}

export function EventPriceBadge({ isFree, price }: { isFree: boolean; price: string | null }) {
  if (isFree) {
    return (
      <View style={[styles.badge, { backgroundColor: FREE_BG }]}>
        <Text style={[styles.badgeText, { color: FREE_FG }]}>Free</Text>
      </View>
    );
  }
  if (price) {
    return (
      <View style={[styles.badge, { backgroundColor: PRICE_BG }]}>
        <Text style={[styles.badgeText, { color: PRICE_FG }]}>{price}</Text>
      </View>
    );
  }
  return null;
}

export function EventTagChips({ tags }: { tags: string[] | null | undefined }) {
  if (!tags || tags.length === 0) return null;
  return (
    <View style={styles.tagRow}>
      {tags.map((tag) => (
        <View key={tag} style={styles.tagChip}>
          <Text style={styles.tagChipText}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

export function formatEventDateRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return '—';
  try {
    const start = new Date(startsAt);
    const dateLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (!endsAt) return `${dateLabel}, ${startTime}`;
    const end = new Date(endsAt);
    const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${dateLabel}, ${startTime} – ${endTime}`;
  } catch {
    return '—';
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  tagRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#4B5563',
  },
});
