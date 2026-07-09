import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { ArrowLeft, Users, MessageCircle, Trash2 } from 'lucide-react-native';
import { useMyBusinessMembers } from '@/hooks/useMyBusinessMembers';
import type { BusinessMember } from '@/api/services/subscriptionService';

const GREEN = '#1A5C35';
const DANGER = '#C0392B';
const TEXT_MUTED = '#6B7280';
const PAGE_BG = '#F0F7F4';
const CARD_BG = '#FFFFFF';

const TIER_ORDER = ['Platinum', 'Gold', 'Silver', 'Bronze'];

const TIER_DEFAULTS: Record<string, { bg: string; text: string }> = {
  Platinum: { bg: '#E8E8E8', text: '#374151' },
  Gold:     { bg: '#FEF3C7', text: '#92400E' },
  Silver:   { bg: '#E2E8F0', text: '#334155' },
  Bronze:   { bg: '#FEF0E7', text: '#7C2D12' },
};
const FALLBACK_TIER = { bg: '#E6F7EC', text: GREEN };

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatJoined(iso: string): string {
  return 'Joined ' + new Date(iso).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function getTierColors(tierName: string | null, tierColor: string | null): { bg: string; text: string } {
  if (tierColor) return { bg: tierColor, text: '#fff' };
  if (tierName && TIER_DEFAULTS[tierName]) return TIER_DEFAULTS[tierName];
  return FALLBACK_TIER;
}

interface MemberCardProps {
  member: BusinessMember;
  onRemove: (member: BusinessMember) => void;
}

const MemberCard = React.memo(function MemberCard({ member, onRemove }: MemberCardProps) {
  const tierColors = getTierColors(member.tier_name, member.tier_color);
  const tierLabel = member.tier_name ?? 'Member';
  const points = (member.current_balance ?? 0).toLocaleString();

  return (
    <View style={styles.card}>
      <View style={styles.cardAvatarRow}>
        <View style={styles.avatar}>
          {member.avatar_url ? (
            <Image source={{ uri: member.avatar_url }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarInitials}>{getInitials(member.display_name)}</Text>
          )}
        </View>
      </View>

      <Text style={styles.cardName} numberOfLines={1}>{member.display_name}</Text>
      {member.city ? (
        <Text style={styles.cardCity} numberOfLines={1}>{member.city}</Text>
      ) : null}

      <View style={[styles.tierBadge, { backgroundColor: tierColors.bg }]}>
        <Text style={[styles.tierText, { color: tierColors.text }]}>{tierLabel}</Text>
      </View>

      <Text style={styles.cardPoints}>{points} pts</Text>
      <Text style={styles.cardJoined}>{formatJoined(member.subscribed_at)}</Text>

      <View style={styles.cardActions}>
        <View style={[styles.actionBtn, { opacity: 0.35 }]}>
          <MessageCircle size={18} color={TEXT_MUTED} />
        </View>
        <TouchableOpacity
          style={styles.actionBtn}
          hitSlop={8}
          onPress={() => onRemove(member)}
        >
          <Trash2 size={18} color={DANGER} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function BusinessMembersScreen() {
  const router = useRouter();
  const { members, isLoading, removeMember } = useMyBusinessMembers();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [pendingRemove, setPendingRemove] = useState<BusinessMember | null>(null);

  const filterPills = useMemo(() => {
    const tierNames = members
      .map((m) => m.tier_name)
      .filter((t): t is string => !!t);
    const unique = Array.from(new Set(tierNames));
    const sorted = [
      ...TIER_ORDER.filter((t) => unique.includes(t)),
      ...unique.filter((t) => !TIER_ORDER.includes(t)),
    ];
    return ['All', ...sorted];
  }, [members]);

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return members;
    return members.filter((m) => m.tier_name === activeFilter);
  }, [members, activeFilter]);

  const handleRemovePress = useCallback((member: BusinessMember) => {
    setPendingRemove(member);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemove) return;
    const target = pendingRemove;
    setPendingRemove(null);
    await removeMember(target.profile_id);
  }, [pendingRemove, removeMember]);

  const handleDismiss = useCallback(() => setPendingRemove(null), []);

  const renderCard = useCallback(({ item }: { item: BusinessMember }) => (
    <MemberCard member={item} onRemove={handleRemovePress} />
  ), [handleRemovePress]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyWrap}>
      <Users size={48} color={GREEN} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>
        {activeFilter === 'All' ? 'No members yet' : `No ${activeFilter} members`}
      </Text>
      <Text style={styles.emptySub}>
        {activeFilter === 'All'
          ? 'Subscribers will appear here once they join'
          : 'No members at this tier yet'}
      </Text>
    </View>
  ), [activeFilter]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={GREEN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{members.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {filterPills.map((pill) => (
          <TouchableOpacity
            key={pill}
            style={[styles.pill, activeFilter === pill && styles.pillActive]}
            onPress={() => setActiveFilter(pill)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, activeFilter === pill && styles.pillTextActive]}>
              {pill}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && members.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.profile_id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Portal>
        <Dialog visible={!!pendingRemove} onDismiss={handleDismiss} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Remove Member</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogBody}>
              Remove {pendingRemove?.display_name} from your subscribers? They can re-subscribe at any time.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDismiss} textColor={TEXT_MUTED}>Cancel</Button>
            <Button onPress={handleConfirmRemove} textColor={DANGER}>Remove</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  safeTop: {
    backgroundColor: PAGE_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  pillsRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: CARD_BG,
  },
  pillActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  pillTextActive: {
    color: '#fff',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 32,
    paddingTop: 4,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  columnWrapper: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAvatarRow: {
    marginBottom: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardCity: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 8,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
    marginBottom: 2,
  },
  cardJoined: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    width: '100%',
    justifyContent: 'center',
  },
  actionBtn: {
    padding: 4,
    opacity: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  dialog: {
    borderRadius: 16,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1730',
  },
  dialogBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});
