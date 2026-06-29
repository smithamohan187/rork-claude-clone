import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Animated,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  Users,
  Star,
  MapPin,
  Building2,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BusinessInviteBanner from '@/components/feed/BusinessInviteBanner';
import { useBusinessDirectory } from '@/hooks/useBusinessDirectory';
import type { BusinessDirectoryItem, BusinessCategory } from '@/api/services/businessDirectoryService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP     = 10;
const GRID_PADDING = 16;
const CARD_WIDTH   = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

// Colour constants — identical to marketplace screen so the screens feel cohesive
const PURPLE       = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F6FB';
const GOLD         = '#E5A100';

// ─── CategoryChip ────────────────────────────────────────────────────────────
// Accepts a full BusinessCategory object or the sentinel 'all' for the All chip.
const CategoryChip = React.memo(function CategoryChip({
  category,
  isActive,
  onPress,
}: {
  category: BusinessCategory | 'all';
  isActive: boolean;
  onPress: () => void;
}) {
  // Derive display label and optional MaterialCommunityIcons name from the prop
  const label    = category === 'all' ? 'All' : category.name;
  const iconName = category === 'all' ? null  : category.icon;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Icon + label in a row — icon only rendered when the category has one */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {iconName ? (
            <MaterialCommunityIcons
              name={iconName as any}
              size={14}
              color={isActive ? '#fff' : PURPLE}
              style={{ marginRight: 4 }}
            />
          ) : null}
          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── BusinessCard ─────────────────────────────────────────────────────────────
// Visual structure mirrors TrendingCard from the marketplace screen.
const BusinessCard = React.memo(function BusinessCard({
  item,
  onPress,
}: {
  item: BusinessDirectoryItem;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  // Format subscriber count: 1200 → '1.2k', under 1000 stays as-is
  const formattedSubs = item.subscriber_count >= 1000
    ? `${(item.subscriber_count / 1000).toFixed(1)}k`
    : `${item.subscriber_count}`;

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Image area with badges */}
        <View style={styles.cardImageWrap}>
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} style={styles.cardImage} contentFit="cover" />
          ) : (
            // Placeholder when no logo has been uploaded yet
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Building2 size={28} color={PURPLE} />
            </View>
          )}
          <View style={styles.cardOverlay} />

          {/* Top-left: average rating badge */}
          <View style={styles.ratingBadge}>
            <Star size={10} color="#fff" fill="#fff" />
            <Text style={styles.ratingBadgeText}>
              {item.avg_rating != null ? item.avg_rating : 'New'}
            </Text>
          </View>

          {/* Top-right: subscriber count badge */}
          <View style={styles.subsBadge}>
            <Users size={10} color={GOLD} />
            <Text style={styles.subsBadgeText}>{formattedSubs}</Text>
          </View>
        </View>

        {/* Card body */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>

          {/* business_type pill */}
          <View style={styles.catPill}>
            <Text style={styles.catPillText}>
              {item.business_type.charAt(0).toUpperCase() + item.business_type.slice(1)}
            </Text>
          </View>

          {/* City row */}
          {item.city ? (
            <View style={styles.metaRow}>
              <MapPin size={11} color="#9E9E9E" />
              <Text style={styles.metaText} numberOfLines={1}>{item.city}</Text>
            </View>
          ) : null}

          {/* Rating count */}
          <Text style={styles.ratingCount}>
            {item.rating_count > 0 ? `${item.rating_count} ratings` : 'No ratings yet'}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── EmptyState ───────────────────────────────────────────────────────────────
// Identical structure to marketplace's empty state.
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Search size={36} color={PURPLE} />
      </View>
      <Text style={styles.emptyTitle}>No businesses found</Text>
      <Text style={styles.emptySub}>Try a different search term or category</Text>
      <TouchableOpacity style={styles.emptyResetBtn} activeOpacity={0.75} onPress={onReset}>
        <Text style={styles.emptyResetText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BusinessDirectoryScreen() {
  const router = useRouter();
  const searchInputRef = useRef<TextInput>(null);

  const {
    businesses,
    categories,
    search,
    activeCategory,
    loading,
    loadingMore,
    error,
    handleSearch,
    handleCategorySelect,
    handleLoadMore,
  } = useBusinessDirectory();

  const handleBusinessPress = useCallback((item: BusinessDirectoryItem) => {
    if (__DEV__) console.log('[BusinessDirectory] pressed:', item.id, item.name);
    router.push(`/business-profile/${item.id}` as never);
  }, [router]);

  const handleReset = useCallback(() => {
    handleSearch('');
    handleCategorySelect(null);
    searchInputRef.current?.clear();
  }, [handleSearch, handleCategorySelect]);

  // renderItem kept stable with useCallback so FlatList doesn't re-render all cards on every scroll
  const renderItem = useCallback(({ item }: { item: BusinessDirectoryItem }) => (
    <BusinessCard item={item} onPress={() => handleBusinessPress(item)} />
  ), [handleBusinessPress]);

  const keyExtractor = useCallback((item: BusinessDirectoryItem) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Header — same green SafeAreaView with rounded bottom as marketplace */}
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <View style={styles.headerRow}>
          <Building2 size={22} color="#fff" />
          <Text style={styles.headerTitle}>Business Directory</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Search size={18} color="#E8F5EE" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search businesses..."
            placeholderTextColor="#E8F5EE"
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => handleSearch('')} hitSlop={8}>
              <X size={16} color="#E8F5EE" />
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Invite banner — appears between header and category chips */}
      <BusinessInviteBanner />

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chipScroll, { alignItems: 'center' }]}
        style={styles.chipRow}
      >
        {/* "All" chip always first — selecting it clears the category filter */}
        <CategoryChip
          category="all"
          isActive={activeCategory === null}
          onPress={() => handleCategorySelect(null)}
        />
        {/* One chip per BusinessCategory; key on id (stable UUID), active when name matches */}
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            category={cat}
            isActive={activeCategory === cat.name}
            onPress={() => handleCategorySelect(cat.name)}
          />
        ))}
      </ScrollView>

      {/* Error banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Full-screen loader on initial load */}
      {loading && businesses.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <FlatList
          data={businesses}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={PURPLE} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? <EmptyState onReset={handleReset} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE_FAINT,
  },
  // ── Header ──
  headerArea: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 7,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 0,
  },
  // ── Chips ──
  chipRow: {
    marginTop: 12,
    marginBottom: 8,
    height: 52,
  },
  chipScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E6EF',
  },
  chipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE,
  },
  chipTextActive: {
    color: '#fff',
  },
  // ── Grid ──
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
    paddingBottom: 30,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  // ── Card ──
  cardWrap: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImageWrap: {
    height: CARD_WIDTH * 0.65,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFD166',
  },
  subsBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  subsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  cardBody: {
    padding: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1730',
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  catPill: {
    alignSelf: 'flex-start',
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: PURPLE,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9E9E9E',
    flex: 1,
  },
  ratingCount: {
    fontSize: 10,
    fontWeight: '500',
    color: '#BDBDBD',
  },
  // ── Loading / Error ──
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFF3F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    textAlign: 'center',
  },
  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1730',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyResetBtn: {
    backgroundColor: PURPLE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyResetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
