import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Eye,
  MousePointerClick,
  Users,
  Clock,
  Heart,
  Share2,
  MessageCircle,
  Megaphone,
  Bookmark,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import { mockCreatedPromotions, currentBusinessUser } from '@/mocks/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CREATED_BIZCOMS_KEY = 'created_bizcoms';

interface PromotionData {
  id: string;
  name: string;
  avatar: string;
  members: number;
  category: string;
  description: string;
  ownerId?: string;
  uploadedImages?: string[];
  createdAt?: string;
  status?: string;
  views?: number;
  clicks?: number;
}

function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function PromotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [promotion, setPromotion] = useState<PromotionData | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [heartScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadPromotion();
  }, [id]);

  const loadPromotion = async () => {
    const mockMatch = mockCreatedPromotions.find((p) => p.id === id);
    if (mockMatch) {
      setPromotion(mockMatch);
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(CREATED_BIZCOMS_KEY);
      if (stored) {
        const parsed: PromotionData[] = JSON.parse(stored);
        const found = parsed.find((p) => p.id === id);
        if (found) {
          setPromotion(found);
          return;
        }
      }
    } catch (e) {
      console.log('[PromotionDetail] Error loading promotion:', e);
    }
  };

  const images = useMemo(() => {
    if (!promotion) return [];
    if (promotion.uploadedImages && promotion.uploadedImages.length > 0) {
      return promotion.uploadedImages;
    }
    return [promotion.avatar];
  }, [promotion]);

  const handleLike = () => {
    setIsLiked((prev) => !prev);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleImageScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveImageIndex(index);
  };

  if (!promotion) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Promotion not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.goBackBtn}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
            testID="promotion-back-btn"
          >
            <ArrowLeft size={20} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Promotion</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <Animated.View style={[styles.contentWrap, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image
                source={{ uri: currentBusinessUser.avatar }}
                style={styles.authorAvatar}
              />
              <View style={styles.authorInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.authorName}>{currentBusinessUser.name}</Text>
                  <View style={styles.promoBadge}>
                    <Megaphone size={10} color={Colors.navyDark} />
                    <Text style={styles.promoBadgeText}>Promo</Text>
                  </View>
                </View>
                <Text style={styles.postTime}>
                  {promotion.createdAt ? timeAgo(promotion.createdAt) : 'Recently'}
                </Text>
              </View>
            </View>

            <View style={styles.titleSection}>
              <Text style={styles.promotionTitle}>{promotion.name}</Text>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{promotion.category}</Text>
              </View>
            </View>

            <Text style={styles.promotionDescription}>{promotion.description}</Text>

            {images.length > 0 && (
              <View style={styles.imageSection}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleImageScroll}
                  scrollEventThrottle={16}
                >
                  {images.map((img, idx) => (
                    <Image
                      key={`${img}-${idx}`}
                      source={{ uri: img }}
                      style={styles.promotionImage}
                      contentFit="cover"
                    />
                  ))}
                </ScrollView>
                {images.length > 1 && (
                  <View style={styles.dotsRow}>
                    {images.map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.dot,
                          activeImageIndex === idx && styles.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Eye size={14} color={Colors.textTertiary} />
                <Text style={styles.statValue}>{promotion.views ?? 0}</Text>
                <Text style={styles.statLabel}>views</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MousePointerClick size={14} color={Colors.textTertiary} />
                <Text style={styles.statValue}>{promotion.clicks ?? 0}</Text>
                <Text style={styles.statLabel}>clicks</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Users size={14} color={Colors.navyMid} />
                <Text style={[styles.statValue, { color: Colors.navyDark }]}>
                  {promotion.members}
                </Text>
                <Text style={styles.statLabel}>reached</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleLike}
                activeOpacity={0.7}
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart
                    size={22}
                    color={isLiked ? '#EF4444' : Colors.textSecondary}
                    fill={isLiked ? '#EF4444' : 'none'}
                  />
                </Animated.View>
                <Text style={[styles.actionLabel, isLiked && { color: '#EF4444' }]}>
                  {isLiked ? 'Liked' : 'Like'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <MessageCircle size={22} color={Colors.textSecondary} />
                <Text style={styles.actionLabel}>Comment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Share2 size={22} color={Colors.textSecondary} />
                <Text style={styles.actionLabel}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setIsSaved((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Bookmark
                  size={22}
                  color={isSaved ? Colors.navyDark : Colors.textSecondary}
                  fill={isSaved ? Colors.navyDark : 'none'}
                />
                <Text style={[styles.actionLabel, isSaved && { color: Colors.navyDark }]}>
                  {isSaved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            {promotion.createdAt && (
              <View style={styles.dateFooter}>
                <Clock size={13} color={Colors.textTertiary} />
                <Text style={styles.dateText}>
                  {formatFullDate(promotion.createdAt)}
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.banner,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  contentWrap: {
    flex: 1,
  },
  postCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    letterSpacing: 0.3,
  },
  postTime: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  promotionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  categoryChip: {
    backgroundColor: Colors.navyDark + '0F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.navyMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  promotionDescription: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  imageSection: {
    position: 'relative',
  },
  promotionImage: {
    width: SCREEN_WIDTH - 24,
    height: SCREEN_WIDTH * 0.65,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
    borderRadius: 4,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.borderLight,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.1,
  },
  dateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  goBackBtn: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  goBackBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.bannerText,
  },
});

