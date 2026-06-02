import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, Tag, Calendar, Megaphone, Clock } from 'lucide-react-native';
import { getAIStudioHistory, type AIStudioHistoryItem } from '@/hooks/useAIStudio';

const PURPLE_DEEP = '#00B246';
const BG = '#F6F5FA';
const SURFACE = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E5E7EB';

const TYPE_META: Record<
  AIStudioHistoryItem['type'],
  { label: string; icon: typeof Tag; color: string; bg: string }
> = {
  offer: { label: 'Offer', icon: Tag, color: '#B45309', bg: '#FEF3C7' },
  event: { label: 'Event', icon: Calendar, color: '#1D4ED8', bg: '#DBEAFE' },
  post: { label: 'Post', icon: Megaphone, color: '#00B246', bg: '#E8F5EE' },
};

const STATUS_META: Record<
  AIStudioHistoryItem['status'],
  { label: string; color: string; bg: string }
> = {
  draft: { label: 'Draft', color: '#475569', bg: '#E2E8F0' },
  published: { label: 'Published', color: '#15803D', bg: '#DCFCE7' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hr = Math.floor(diff / (1000 * 60 * 60));
  if (hr < 1) return 'Just now';
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function AIStudioHistoryScreen() {
  const router = useRouter();
  const items = useMemo<AIStudioHistoryItem[]>(() => getAIStudioHistory(), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="ai-hist-back">
          <ArrowLeft size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerTitleRow}>
            <Sparkles size={16} color={PURPLE_DEEP} />
            <Text style={styles.headerTitle}>AI Studio History</Text>
          </View>
          <Text style={styles.headerSubtitle}>Your recent AI-crafted content</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Clock size={28} color={PURPLE_DEEP} />
          </View>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>
            Generated drafts and published items will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const type = TYPE_META[item.type];
            const status = STATUS_META[item.status];
            const TypeIcon = type.icon;
            return (
              <Surface style={styles.card} elevation={1}>
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                <View style={styles.cardBody}>
                  <View style={styles.chipRow}>
                    <View style={[styles.chip, { backgroundColor: type.bg }]}>
                      <TypeIcon size={11} color={type.color} />
                      <Text style={[styles.chipText, { color: type.color }]}>{type.label}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: status.bg }]}>
                      <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardBodyText} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
              </Surface>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '700' as const, color: TEXT },
  headerSubtitle: { fontSize: 11, color: MUTED, marginTop: 2 },

  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  thumb: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#EEF0F5' },
  cardBody: { flex: 1 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: { fontSize: 10, fontWeight: '700' as const },
  cardTitle: { fontSize: 14, fontWeight: '700' as const, color: TEXT, marginTop: 6 },
  cardBodyText: { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 16 },
  cardDate: { fontSize: 11, color: MUTED, marginTop: 6 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '800' as const, color: TEXT, marginTop: 12 },
  emptyBody: { color: MUTED, textAlign: 'center', marginTop: 6 },
});
