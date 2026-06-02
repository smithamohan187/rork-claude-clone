import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Search, X, ChevronRight, Lock, Tag } from 'lucide-react-native';
import { categories, featuredOffers } from '@/mocks/homeFeed';
import type { FeaturedOffer } from '@/mocks/homeFeed';

const PURPLE = '#1A5C35';
const PURPLE_FAINT = '#F7F6FB';
const BORDER = '#E8E6F0';
const MUTED = '#8E8E9A';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

function CategoryChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, isActive && styles.chipActive]}
      testID={`offers-chip-${label}`}
    >
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function OfferGridCard({ offer, onPress }: { offer: FeaturedOffer; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handleIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);
  const handleOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }], width: CARD_WIDTH }}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={styles.card}
        testID={`offer-grid-${offer.id}`}
      >
        <View style={[styles.cardImage, { backgroundColor: offer.imagePlaceholder }]}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{offer.discount}</Text>
          </View>
          {!offer.isSubscribed && (
            <View style={styles.lockBadge}>
              <Lock size={11} color="#fff" />
            </View>
          )}
          <View style={styles.patternCircle} />
          <View style={styles.patternCircleSmall} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.bizRow}>
            <Image source={{ uri: offer.businessLogo }} style={styles.bizLogo} />
            <Text style={styles.bizName} numberOfLines={1}>{offer.businessName}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{offer.offerTitle}</Text>
          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={13} color={PURPLE} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <View style={[styles.cardImage, { backgroundColor: '#ECEAF3' }]} />
      <View style={styles.cardBody}>
        <View style={styles.skelLineShort} />
        <View style={styles.skelLine} />
        <View style={styles.skelLineTiny} />
      </View>
    </View>
  );
}

export default function OffersListingScreen() {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading] = useState<boolean>(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return featuredOffers.filter((o) => {
      const matchesCat = activeCategory === 'all' || o.category === activeCategory;
      const matchesQuery =
        !q ||
        o.offerTitle.toLowerCase().includes(q) ||
        o.businessName.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, activeCategory]);

  const handleOfferPress = useCallback((offer: FeaturedOffer) => {
    console.log('[Offers] Offer pressed:', offer.id);
    router.push({
      pathname: '/view-offer',
      params: { offerId: offer.id, businessId: offer.businessId },
    } as never);
  }, [router]);

  const handleClearFilters = useCallback(() => {
    setQuery('');
    setActiveCategory('all');
  }, []);

  const renderItem = useCallback(({ item, index }: { item: FeaturedOffer; index: number }) => (
    <View style={{ marginLeft: index % 2 === 0 ? 0 : GRID_GAP }}>
      <OfferGridCard offer={item} onPress={() => handleOfferPress(item)} />
    </View>
  ), [handleOfferPress]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
            testID="offers-back"
          >
            <ArrowLeft size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Offers</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Search size={18} color="#E8F5EE" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search offers..."
              placeholderTextColor="#E8F5EE"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              testID="offers-search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} testID="offers-search-clear">
                <X size={16} color="#E8F5EE" />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {categories.map((c) => (
            <CategoryChip
              key={c.key}
              label={c.label}
              isActive={activeCategory === c.key}
              onPress={() => setActiveCategory(c.key)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>

      {loading ? (
        <View style={styles.gridContent}>
          <View style={styles.skeletonRow}>
            <SkeletonCard />
            <View style={{ width: GRID_GAP }} />
            <SkeletonCard />
          </View>
          <View style={[styles.skeletonRow, { marginTop: GRID_GAP }]}>
            <SkeletonCard />
            <View style={{ width: GRID_GAP }} />
            <SkeletonCard />
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrap}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Tag size={28} color={PURPLE} />
              </View>
              <Text style={styles.emptyTitle}>No offers found</Text>
              <Text style={styles.emptySub}>Try adjusting your search or filters</Text>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearFilters}
                activeOpacity={0.85}
                testID="offers-clear-filters"
              >
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PURPLE_FAINT },
  safeHeader: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F2F8',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E', paddingVertical: 0 },
  chipScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1A5C35' },
  chipTextActive: { color: '#fff' },

  gridContent: { padding: GRID_PADDING, paddingBottom: 40 },
  columnWrap: { marginBottom: GRID_GAP },
  skeletonRow: { flexDirection: 'row' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 110,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  discountText: { fontSize: 11, fontWeight: '800', color: '#1A1A2E' },
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternCircle: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  patternCircleSmall: {
    position: 'absolute',
    right: 30,
    bottom: 15,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardBody: { padding: 12 },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  bizLogo: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#eee' },
  bizName: { flex: 1, fontSize: 11, fontWeight: '600', color: MUTED },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 18,
    minHeight: 36,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EEF6',
    gap: 2,
  },
  viewDetailsText: { fontSize: 12, fontWeight: '700', color: PURPLE },

  skelLineShort: { width: '50%', height: 10, backgroundColor: '#ECEAF3', borderRadius: 6, marginBottom: 8 },
  skelLine: { width: '90%', height: 12, backgroundColor: '#ECEAF3', borderRadius: 6, marginBottom: 8 },
  skelLineTiny: { width: '35%', height: 10, backgroundColor: '#ECEAF3', borderRadius: 6 },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EDE9F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  emptySub: { fontSize: 13, color: MUTED, marginBottom: 20, textAlign: 'center' },
  clearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: PURPLE,
  },
  clearBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
