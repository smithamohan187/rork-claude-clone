import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Leaf,
  Search,
  Settings,
  MessageCircle,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import {
  marketplaceMembers,
  BADGE_COLORS,
  type MarketplaceMember,
  type MemberBadge,
} from '@/mocks/marketplaceMembers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

const DEEP_GREEN = '#2E7D32';
const LIGHT_GREEN = '#A5D6A7';
const ACCENT_GREEN = '#43A047';
const SURFACE_GREEN = '#F1F8E9';
const TEXT_GREEN = '#1B5E20';
const TEXT_SECONDARY = '#4CAF50';
const BORDER_GREEN = '#C8E6C9';
const HEADER_GREEN = '#2E7D32';

type BadgeFilter = 'all' | MemberBadge | 'nearby';

interface FilterChipData {
  key: BadgeFilter;
  label: string;
}

const FILTERS: FilterChipData[] = [
  { key: 'all', label: 'All' },
  { key: 'Platinum Member', label: 'Platinum' },
  { key: 'Gold Member', label: 'Gold' },
  { key: 'Silver Member', label: 'Silver' },
  { key: 'Bronze Member', label: 'Bronze' },
  { key: 'nearby', label: 'Nearby' },
];

function triggerHaptic(style: 'light' | 'medium' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'light') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

const FilterChip = React.memo(function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
});

const MemberCard = React.memo(function MemberCard({
  member,
  onChat,
  onDelete,
}: {
  member: MarketplaceMember;
  onChat: () => void;
  onDelete: () => void;
}) {
  const badgeColors = BADGE_COLORS[member.badge];

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        <Image
          source={{ uri: member.avatar }}
          style={styles.avatar}
          contentFit="cover"
          placeholder={{ backgroundColor: BORDER_GREEN }}
          transition={300}
        />
      </View>

      <Text style={styles.memberName}>{member.name}</Text>
      <Text style={styles.memberHandle}>{member.handle}</Text>

      <View style={[styles.badgePill, { backgroundColor: badgeColors.bg, borderColor: badgeColors.border }]}>
        <Text style={[styles.badgePillText, { color: badgeColors.text }]}>
          {'\u{1F3C5}'} {member.badge}
        </Text>
      </View>

      <View style={styles.pointsRow}>
        <Sparkles size={13} color={ACCENT_GREEN} />
        <Text style={styles.pointsText}>{member.points.toLocaleString()} points</Text>
      </View>

      <Text style={styles.joinedDate}>Joined {member.joinedAt}</Text>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onChat();
          }}
          style={styles.iconBtn}
        >
          <MessageCircle size={16} color={DEEP_GREEN} />
        </Pressable>
        <Pressable
          onPress={() => {
            triggerHaptic('medium');
            onDelete();
          }}
          style={styles.iconBtn}
        >
          <Trash2 size={16} color="#C62828" />
        </Pressable>
      </View>
    </View>
  );
});

export default function MarketplaceMembersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<BadgeFilter>('all');
  const [members, setMembers] = useState<MarketplaceMember[]>(marketplaceMembers);

  const filteredMembers = useMemo(() => {
    if (activeFilter === 'all') return members;
    if (activeFilter === 'nearby') return members;
    return members.filter((m) => m.badge === activeFilter);
  }, [activeFilter, members]);

  const handleChat = useCallback((member: MarketplaceMember) => {
    const chatId = `mkt-${member.id}`;
    router.push(`/chat/${chatId}` as never);
  }, [router]);

  const handleDelete = useCallback((member: MarketplaceMember) => {
    Alert.alert(
      'Remove Member?',
      `This will remove ${member.name} from the marketplace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setMembers((prev) => prev.filter((m) => m.id !== member.id));
            Alert.alert('Member Removed', `${member.name} has been removed.`);
          },
        },
      ],
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceMember }) => (
      <MemberCard
        member={item}
        onChat={() => handleChat(item)}
        onDelete={() => handleDelete(item)}
      />
    ),
    [handleChat, handleDelete],
  );

  const keyExtractor = useCallback((item: MarketplaceMember) => item.id, []);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleBlock}>
            <Leaf size={22} color="#fff" />
            <View>
              <Text style={styles.headerTitle}>Members</Text>
              <Text style={styles.headerSubtitle}>Discover & connect with members</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.headerIconBtn}
              hitSlop={8}
              onPress={() => console.log('[MarketplaceMembers] Search tapped')}
            >
              <Search size={20} color="#fff" />
            </Pressable>
            <Pressable
              style={styles.headerIconBtn}
              hitSlop={8}
              onPress={() => console.log('[MarketplaceMembers] Settings tapped')}
            >
              <Settings size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            active={activeFilter === f.key}
            onPress={() => setActiveFilter(f.key)}
          />
        ))}
      </ScrollView>

      {filteredMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <Leaf size={48} color={LIGHT_GREEN} />
          <Text style={styles.emptyTitle}>No members found</Text>
          <Text style={styles.emptySub}>Try a different filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_GREEN,
  },
  headerArea: {
    backgroundColor: HEADER_GREEN,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 18,
    shadowColor: DEEP_GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: LIGHT_GREEN,
    marginTop: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    maxHeight: 52,
    marginTop: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: LIGHT_GREEN,
    shadowColor: DEEP_GREEN,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  filterChipActive: {
    backgroundColor: DEEP_GREEN,
    borderColor: DEEP_GREEN,
    shadowColor: DEEP_GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: DEEP_GREEN,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 14,
    paddingBottom: 40,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE_GREEN,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_GREEN,
    padding: 16,
    alignItems: 'center',
    shadowColor: DEEP_GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: {
    marginBottom: 10,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: LIGHT_GREEN,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TEXT_GREEN,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  memberHandle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: ACCENT_GREEN,
  },
  joinedDate: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: TEXT_GREEN,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
});
