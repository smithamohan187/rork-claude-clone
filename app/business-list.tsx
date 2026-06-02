import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Searchbar } from 'react-native-paper';
import {
  ArrowLeft,
  Search,
  Star,
  Users,
  MapPin,
  Flame,
  ChevronRight,
} from 'lucide-react-native';

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#E8F5EE';
const BG = '#F8F7FF';
const BORDER = '#E8F5EE';
const MUTED = '#1A5C35';
const DARK = '#1A5C35';

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
  initials: string;
  color: string;
  subscriberCount: string;
  welcomePoints: number;
  isSubscribed: boolean;
  rating: number;
  trending?: boolean;
  trendingRank?: number;
  distance?: string;
  distanceValue?: number;
};

const allTrendingBusinesses: Business[] = [
  { id: '1', name: "Richard's Pastry", category: 'Food & Bakery', city: 'Kochi', initials: 'RP', color: '#1A5C35', subscriberCount: '1.2k', welcomePoints: 50, isSubscribed: true, rating: 4.8, trending: true, trendingRank: 1 },
  { id: '2', name: 'Kochi Fitness Hub', category: 'Fitness', city: 'Kochi', initials: 'KF', color: '#0F6E56', subscriberCount: '843', welcomePoints: 30, isSubscribed: false, rating: 4.6, trending: true, trendingRank: 2 },
  { id: '3', name: 'The Beauty Lounge', category: 'Beauty & Wellness', city: 'Ernakulam', initials: 'BL', color: '#993556', subscriberCount: '2.1k', welcomePoints: 75, isSubscribed: false, rating: 4.9, trending: true, trendingRank: 3 },
  { id: '4', name: 'Green Bowl Cafe', category: 'Food & Beverages', city: 'Kochi', initials: 'GB', color: '#3B6D11', subscriberCount: '567', welcomePoints: 40, isSubscribed: false, rating: 4.5, trending: true, trendingRank: 4 },
  { id: '5', name: 'TechZone Electronics', category: 'Retail', city: 'Thrissur', initials: 'TZ', color: '#185FA5', subscriberCount: '1.8k', welcomePoints: 100, isSubscribed: false, rating: 4.4, trending: true, trendingRank: 5 },
  { id: '6', name: 'Spice Garden Restaurant', category: 'Food & Dining', city: 'Kochi', initials: 'SG', color: '#854F0B', subscriberCount: '934', welcomePoints: 60, isSubscribed: false, rating: 4.7, trending: true, trendingRank: 6 },
  { id: '7', name: 'BookNest', category: 'Retail', city: 'Kochi', initials: 'BN', color: '#444441', subscriberCount: '412', welcomePoints: 25, isSubscribed: false, rating: 4.3, trending: true, trendingRank: 7 },
  { id: '8', name: 'Glow Skin Studio', category: 'Beauty & Wellness', city: 'Kozhikode', initials: 'GS', color: '#D4537E', subscriberCount: '678', welcomePoints: 80, isSubscribed: false, rating: 4.8, trending: true, trendingRank: 8 },
];

const allNearbyBusinesses: Business[] = [
  { id: '1', name: "Richard's Pastry", category: 'Food & Bakery', city: 'Kochi', initials: 'RP', color: '#1A5C35', subscriberCount: '1.2k', welcomePoints: 50, isSubscribed: true, rating: 4.8, distance: '0.3 km', distanceValue: 0.3 },
  { id: '4', name: 'Green Bowl Cafe', category: 'Food & Beverages', city: 'Kochi', initials: 'GB', color: '#3B6D11', subscriberCount: '567', welcomePoints: 40, isSubscribed: false, rating: 4.5, distance: '0.7 km', distanceValue: 0.7 },
  { id: '2', name: 'Kochi Fitness Hub', category: 'Fitness', city: 'Kochi', initials: 'KF', color: '#0F6E56', subscriberCount: '843', welcomePoints: 30, isSubscribed: false, rating: 4.6, distance: '1.2 km', distanceValue: 1.2 },
  { id: '6', name: 'Spice Garden Restaurant', category: 'Food & Dining', city: 'Kochi', initials: 'SG', color: '#854F0B', subscriberCount: '934', welcomePoints: 60, isSubscribed: false, rating: 4.7, distance: '1.5 km', distanceValue: 1.5 },
  { id: '7', name: 'BookNest', category: 'Retail', city: 'Kochi', initials: 'BN', color: '#444441', subscriberCount: '412', welcomePoints: 25, isSubscribed: false, rating: 4.3, distance: '2.1 km', distanceValue: 2.1 },
  { id: '3', name: 'The Beauty Lounge', category: 'Beauty & Wellness', city: 'Ernakulam', initials: 'BL', color: '#993556', subscriberCount: '2.1k', welcomePoints: 75, isSubscribed: false, rating: 4.9, distance: '3.4 km', distanceValue: 3.4 },
  { id: '5', name: 'TechZone Electronics', category: 'Retail', city: 'Thrissur', initials: 'TZ', color: '#185FA5', subscriberCount: '1.8k', welcomePoints: 100, isSubscribed: false, rating: 4.4, distance: '5.2 km', distanceValue: 5.2 },
  { id: '8', name: 'Glow Skin Studio', category: 'Beauty & Wellness', city: 'Kozhikode', initials: 'GS', color: '#D4537E', subscriberCount: '678', welcomePoints: 80, isSubscribed: false, rating: 4.8, distance: '6.8 km', distanceValue: 6.8 },
];

const CATEGORIES = ['All', 'Food', 'Fitness', 'Beauty', 'Retail', 'Travel', 'Entertainment'];

type SortKey = 'rank' | 'distance' | 'rating' | 'subscribers';

const SORT_LABELS: Record<SortKey, string> = {
  rank: 'Trending',
  distance: 'Nearest first',
  rating: 'Top rated',
  subscribers: 'Most popular',
};

function parseSubs(s: string): number {
  const n = parseFloat(s);
  if (s.toLowerCase().includes('k')) return n * 1000;
  return n;
}

export default function BusinessListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ listType?: string; title?: string }>();
  const listType = (params.listType === 'nearby' ? 'nearby' : 'trending') as 'trending' | 'nearby';
  const title = params.title ?? (listType === 'trending' ? 'Trending Businesses' : 'Near You');

  const businesses = useMemo<Business[]>(
    () => (listType === 'trending' ? allTrendingBusinesses : allNearbyBusinesses),
    [listType]
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const sortOrder = useMemo<SortKey[]>(
    () => (listType === 'trending'
      ? ['rank', 'rating', 'subscribers']
      : ['distance', 'rating', 'subscribers']),
    [listType]
  );
  const [sortBy, setSortBy] = useState<SortKey>(sortOrder[0]);

  const cycleSort = useCallback(() => {
    const idx = sortOrder.indexOf(sortBy);
    const next = sortOrder[(idx + 1) % sortOrder.length];
    setSortBy(next);
    console.log('[BusinessList] sort cycled to', next);
  }, [sortBy, sortOrder]);

  const filtered = useMemo(() => {
    return businesses
      .filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (activeCategory === 'All' || b.category.toLowerCase().includes(activeCategory.toLowerCase()))
      )
      .sort((a, b) => {
        if (sortBy === 'distance') return (a.distanceValue ?? 0) - (b.distanceValue ?? 0);
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'subscribers') return parseSubs(b.subscriberCount) - parseSubs(a.subscriberCount);
        return (a.trendingRank ?? 999) - (b.trendingRank ?? 999);
      });
  }, [businesses, searchQuery, activeCategory, sortBy]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('All');
  }, []);

  const openBusiness = useCallback((id: string) => {
    router.push(`/business-profile/${id}` as never);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Business }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.card}
        onPress={() => openBusiness(item.id)}
        testID={`biz-card-${item.id}`}
      >
        <View style={styles.cardRow1}>
          <View style={[styles.logo, { backgroundColor: item.color }]}>
            <Text style={styles.logoText}>{item.initials}</Text>
            {listType === 'trending' && item.trendingRank != null ? (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{item.trendingRank}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardCenter}>
            <Text style={styles.bizName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.catChipWrap}>
              <View style={[styles.catChip, { backgroundColor: item.color + '26' }]}>
                <Text style={[styles.catChipText, { color: item.color }]}>{item.category}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Star size={10} color="#E5A100" fill="#E5A100" />
              <Text style={styles.metaBold}>{item.rating.toFixed(1)}</Text>
              <View style={styles.dot} />
              <Users size={10} color={MUTED} />
              <Text style={styles.metaMuted}>{item.subscriberCount} subscribers</Text>
              {listType === 'nearby' && item.distance ? (
                <>
                  <View style={styles.dot} />
                  <MapPin size={10} color={PURPLE} />
                  <Text style={styles.metaPurple}>{item.distance}</Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.cardRight}>
            {item.isSubscribed ? (
              <View style={styles.subChip}>
                <Text style={styles.subChipText}>Subscribed ✓</Text>
              </View>
            ) : (
              <View style={styles.joinChip}>
                <Text style={styles.joinChipText}>Join & earn {item.welcomePoints} pts</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardRow2}>
          <View style={styles.row2Left}>
            {listType === 'trending' ? (
              <>
                <Flame size={11} color="#854F0B" />
                <Text style={styles.trendText}>Trending this week</Text>
              </>
            ) : (
              <>
                <MapPin size={11} color={MUTED} />
                <Text style={styles.metaMuted}>{item.city} · {item.distance}</Text>
              </>
            )}
          </View>
          <TouchableOpacity onPress={() => openBusiness(item.id)} hitSlop={8}>
            <Text style={styles.viewLink}>View Business →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [listType, openBusiness]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
            testID="back-btn"
          >
            <ArrowLeft size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filtered.length} businesses</Text>
          </View>
        </View>

        <Searchbar
          placeholder="Search businesses..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor={MUTED}
          placeholderTextColor={MUTED}
          testID="search-bar"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map(cat => {
            const active = cat === activeCategory;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.catFilter, active ? styles.catFilterActive : styles.catFilterInactive]}
                activeOpacity={0.8}
                testID={`cat-${cat}`}
              >
                <Text style={[styles.catFilterText, active ? styles.catFilterTextActive : styles.catFilterTextInactive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filtered.length > 0 ? (
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by</Text>
            <TouchableOpacity onPress={cycleSort} style={styles.sortPill} hitSlop={8} testID="sort-btn">
              <Text style={styles.sortPillText}>{SORT_LABELS[sortBy]}</Text>
              <ChevronRight size={12} color="#444441" />
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.resultCount}>
          Showing {filtered.length} of {businesses.length} businesses
        </Text>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Search size={40} color={BORDER} />
            </View>
            <Text style={styles.emptyTitle}>No businesses found</Text>
            <Text style={styles.emptySub}>Try a different search or category filter</Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearBtn} testID="clear-filters">
              <Text style={styles.clearBtnText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeHeader: { backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: DARK,
    textAlign: 'center',
  },
  countBadge: {
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: { fontSize: 11, color: PURPLE, fontWeight: '600' },
  searchbar: {
    backgroundColor: '#F1EFE8',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    elevation: 0,
    height: 44,
  },
  searchInput: { fontSize: 13, color: DARK, minHeight: 0 },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  catFilter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  catFilterActive: { backgroundColor: PURPLE },
  catFilterInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D6D3CA',
  },
  catFilterText: { fontSize: 12, fontWeight: '600' },
  catFilterTextActive: { color: '#fff' },
  catFilterTextInactive: { color: '#888780' },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortLabel: { fontSize: 12, color: MUTED },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1EFE8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sortPillText: { fontSize: 10, color: '#444441', fontWeight: '600' },
  resultCount: {
    fontSize: 11,
    color: MUTED,
    marginLeft: 16,
    marginBottom: 4,
  },
  listContent: { paddingBottom: 24, paddingTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: BORDER,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
  },
  cardRow1: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rankBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { fontSize: 9, fontWeight: '700', color: PURPLE },
  cardCenter: { flex: 1, marginLeft: 12 },
  bizName: { fontSize: 14, fontWeight: '700', color: DARK },
  catChipWrap: { flexDirection: 'row', marginTop: 3 },
  catChip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  catChipText: { fontSize: 10, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  metaBold: { fontSize: 11, fontWeight: '700', color: DARK, marginLeft: 2 },
  metaMuted: { fontSize: 11, color: MUTED, marginLeft: 2 },
  metaPurple: { fontSize: 11, color: PURPLE, fontWeight: '700', marginLeft: 2 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 4 },
  cardRight: { alignItems: 'flex-end', gap: 8, marginLeft: 6 },
  subChip: {
    backgroundColor: '#E1F5EE',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subChipText: { fontSize: 9, color: '#0F6E56', fontWeight: '700' },
  joinChip: {
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  joinChipText: { fontSize: 9, color: PURPLE, fontWeight: '600' },
  cardDivider: {
    height: 0.5,
    backgroundColor: '#E8F5EE',
    marginTop: 12,
    marginBottom: 12,
  },
  cardRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row2Left: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: 11, color: '#854F0B', marginLeft: 2 },
  viewLink: { fontSize: 11, color: PURPLE, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: { marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 6 },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 14 },
  clearBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PURPLE_LIGHT,
  },
  clearBtnText: { color: PURPLE, fontSize: 13, fontWeight: '700' },
});
