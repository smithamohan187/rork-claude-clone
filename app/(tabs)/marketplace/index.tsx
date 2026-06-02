import React, { useCallback, useState, useRef, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  Users,
  Zap,
  Star,
  MapPin,
  TrendingUp,
  ChevronRight,
  Compass,
} from 'lucide-react-native';
import {
  exploreCategories,
  trendingBusinesses,
  nearYouBusinesses,
} from '@/mocks/explore';
import type { ExploreBusiness } from '@/mocks/explore';
import { useAuth } from '@/contexts/AuthContext';
import MarketplaceMembersScreen from '@/components/MarketplaceMembersScreen';
import BusinessInviteBanner from '@/components/feed/BusinessInviteBanner';
import HeaderAvatarTrigger from '@/components/HeaderAvatarTrigger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;
const NEAR_CARD_WIDTH = SCREEN_WIDTH * 0.42;

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F6FB';
const GOLD = '#E5A100';

const CategoryChip = React.memo(function CategoryChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
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
        testID={`explore-chip-${label}`}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
});

const TrendingCard = React.memo(function TrendingCard({
  business,
  onPress,
}: {
  business: ExploreBusiness;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const formattedSubs = business.subscribers >= 1000
    ? `${(business.subscribers / 1000).toFixed(1)}k`
    : `${business.subscribers}`;

  return (
    <Animated.View style={[styles.trendingCardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.trendingCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`trending-card-${business.id}`}
      >
        <View style={styles.trendingImageWrap}>
          <Image source={{ uri: business.logo }} style={styles.trendingImage} contentFit="cover" />
          <View style={styles.trendingOverlay} />
          <View style={styles.trendingPointsBadge}>
            <Zap size={10} color={GOLD} fill={GOLD} />
            <Text style={styles.trendingPointsText}>{business.joinPoints} pts</Text>
          </View>
          <View style={styles.trendingRatingBadge}>
            <Star size={10} color="#fff" fill="#fff" />
            <Text style={styles.trendingRatingText}>{business.rating}</Text>
          </View>
        </View>
        <View style={styles.trendingBody}>
          <Text style={styles.trendingName} numberOfLines={1}>{business.name}</Text>
          <View style={[styles.trendingCatPill, { backgroundColor: business.categoryColor + '15' }]}>
            <Text style={[styles.trendingCatText, { color: business.categoryColor }]}>{business.category}</Text>
          </View>
          <View style={styles.trendingStatsRow}>
            <Users size={11} color="#E8F5EE" />
            <Text style={styles.trendingSubsText}>{formattedSubs} subscribers</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const NearYouCard = React.memo(function NearYouCard({
  business,
  onPress,
}: {
  business: ExploreBusiness;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.nearCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`near-card-${business.id}`}
      >
        <Image source={{ uri: business.logo }} style={styles.nearImage} contentFit="cover" />
        <View style={styles.nearGradient} />
        <View style={styles.nearContent}>
          <Text style={styles.nearName} numberOfLines={1}>{business.name}</Text>
          <View style={styles.nearMetaRow}>
            <View style={styles.nearDistancePill}>
              <MapPin size={10} color="#fff" />
              <Text style={styles.nearDistanceText}>{business.distance}</Text>
            </View>
            <View style={styles.nearRatingPill}>
              <Star size={10} color={GOLD} fill={GOLD} />
              <Text style={styles.nearRatingText}>{business.rating}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function ExploreScreen() {
  const { accountType } = useAuth();
  if (accountType === 'business') {
    return <MarketplaceMembersScreen />;
  }
  return <ConsumerExploreScreen />;
}

function ConsumerExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const searchInputRef = useRef<TextInput>(null);

  const filteredTrending = useMemo(() => {
    let results = trendingBusinesses;
    if (activeCategory !== 'all') {
      results = results.filter(b => b.category.toLowerCase() === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        b => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
      );
    }
    return results;
  }, [activeCategory, searchQuery]);

  const filteredNearYou = useMemo(() => {
    let results = nearYouBusinesses;
    if (activeCategory !== 'all') {
      results = results.filter(b => b.category.toLowerCase() === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        b => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
      );
    }
    return results;
  }, [activeCategory, searchQuery]);

  const hasResults = filteredTrending.length > 0 || filteredNearYou.length > 0;

  const handleBusinessPress = useCallback((business: ExploreBusiness) => {
    console.log('[Explore] Business pressed:', business.id, business.name);
    router.push(`/business-profile/${business.id}` as never);
  }, [router]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <View style={styles.headerRow}>
          <HeaderAvatarTrigger />
          <View style={styles.headerTitleBlock}>
            <Compass size={22} color="#fff" />
            <Text style={styles.headerTitle}>Explore</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.searchWrap}>
          <Search size={18} color="#E8F5EE" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search businesses, categories..."
            placeholderTextColor="#E8F5EE"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            testID="explore-search-bar"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color="#E8F5EE" />
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <BusinessInviteBanner />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
          style={styles.chipRow}
        >
          {exploreCategories.map(cat => (
            <CategoryChip
              key={cat.key}
              label={cat.label}
              isActive={activeCategory === cat.key}
              onPress={() => {
                setActiveCategory(cat.key);
                console.log('[Explore] Category selected:', cat.key);
              }}
            />
          ))}
        </ScrollView>

        {!hasResults ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Search size={36} color={PURPLE} />
            </View>
            <Text style={styles.emptyTitle}>No businesses found</Text>
            <Text style={styles.emptySub}>
              Try a different search term or category
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              activeOpacity={0.75}
              onPress={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
            >
              <Text style={styles.emptyResetText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {filteredTrending.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionLeft}>
                    <TrendingUp size={18} color={PURPLE} />
                    <Text style={styles.sectionTitle}>Trending Businesses</Text>
                  </View>
                  <Pressable
                    style={styles.seeAllBtn}
                    hitSlop={8}
                    onPress={() => router.push({ pathname: '/business-list' as never, params: { listType: 'trending', title: 'Trending Businesses' } } as never)}
                    testID="see-all-trending"
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <ChevronRight size={14} color={PURPLE} />
                  </Pressable>
                </View>

                <View style={styles.trendingGrid}>
                  {filteredTrending.map(biz => (
                    <TrendingCard
                      key={biz.id}
                      business={biz}
                      onPress={() => handleBusinessPress(biz)}
                    />
                  ))}
                </View>
              </>
            )}

            {filteredNearYou.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionLeft}>
                    <MapPin size={18} color={PURPLE} />
                    <Text style={styles.sectionTitle}>Near You</Text>
                  </View>
                  <Pressable
                    style={styles.seeAllBtn}
                    hitSlop={8}
                    onPress={() => router.push({ pathname: '/business-list' as never, params: { listType: 'nearby', title: 'Near You' } } as never)}
                    testID="see-all-nearby"
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <ChevronRight size={14} color={PURPLE} />
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.nearScroll}
                >
                  {filteredNearYou.map(biz => (
                    <NearYouCard
                      key={biz.id}
                      business={biz}
                      onPress={() => handleBusinessPress(biz)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURPLE_FAINT,
  },
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
  headerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
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
  scrollContent: {
    paddingBottom: 30,
  },
  chipRow: {
    marginTop: 16,
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 8,
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
    fontWeight: '600' as const,
    color: '#1A5C35',
  },
  chipTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1A1730',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: PURPLE,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  trendingCardWrap: {
    width: CARD_WIDTH,
  },
  trendingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  trendingImageWrap: {
    height: CARD_WIDTH * 0.65,
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  trendingPointsBadge: {
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
  trendingPointsText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  },
  trendingRatingBadge: {
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
  trendingRatingText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FFD166',
  },
  trendingBody: {
    padding: 10,
  },
  trendingName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1A1730',
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  trendingCatPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  trendingCatText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  trendingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingSubsText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#E8F5EE',
  },
  nearScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  nearCard: {
    width: NEAR_CARD_WIDTH,
    height: NEAR_CARD_WIDTH * 1.2,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1A1730',
  },
  nearImage: {
    width: '100%',
    height: '100%',
  },
  nearGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  nearContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  nearName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  nearMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nearDistancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  nearDistanceText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  nearRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  nearRatingText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#FFD166',
  },
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
    fontWeight: '700' as const,
    color: '#1A1730',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#E8F5EE',
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
    fontWeight: '700' as const,
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
});
