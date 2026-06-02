import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Star,
  MessageCircle,
  ChevronRight,
  Tag,
  Megaphone,
  Eye,
  MousePointerClick,
  Grid3x3,
  Users,
  UserPlus,
  CheckCircle,
  Send,
  Shield,
  Gift,
  Heart,
  ChevronDown,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import { businessUsers, currentBusinessUser, posts, mockCreatedPromotions, currentMemberFollowedBusinesses, businessLocations, businessTrustedConnections, touchPointsAppBusiness } from '@/mocks/data';
import type { CreatedPromotion, ConnectionDegree, TrustedFriendBizComMember } from '@/mocks/data';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 2;
const GRID_PADDING = 16;
const GRID_INNER = SCREEN_WIDTH - GRID_PADDING * 2;
const THUMB_SIZE = (GRID_INNER - GRID_GAP * 2) / 3;


const TRUST_WEIGHTS = {
  degree: { 1: 1.0, 2: 0.45, 3: 0.15 } as Record<number, number>,
  trustLevel: { close: 1.0, friend: 0.7, acquaintance: 0.35 } as Record<string, number>,
};

const CONNECTION_SCORE_CAP = 60;
const DENSITY_SCORE_CAP = 25;
const DIVERSITY_SCORE_CAP = 15;

function calculateTrustScore(
  connections: TrustedFriendBizComMember[],
  totalCommunityMembers: number,
): number {
  if (connections.length === 0 || totalCommunityMembers === 0) return 0;

  const first = connections.filter(c => c.degree === 1);
  const second = connections.filter(c => c.degree === 2);
  const third = connections.filter(c => c.degree === 3);

  let weightedSum = 0;
  let maxPossible = 0;

  for (const conn of connections) {
    const degreeW = TRUST_WEIGHTS.degree[conn.degree] ?? 0.1;
    const levelW = TRUST_WEIGHTS.trustLevel[conn.trustLevel] ?? 0.35;
    weightedSum += degreeW * levelW;
    maxPossible += TRUST_WEIGHTS.degree[1] * TRUST_WEIGHTS.trustLevel.close;
  }

  const connectionQuality = maxPossible > 0 ? (weightedSum / maxPossible) : 0;
  const connectionScore = connectionQuality * CONNECTION_SCORE_CAP;

  const densityRatio = connections.length / totalCommunityMembers;
  const normalizedDensity = Math.min(densityRatio * 200, 1);
  const densityScore = normalizedDensity * DENSITY_SCORE_CAP;

  const hasDegrees = [first.length > 0, second.length > 0, third.length > 0];
  const degreesPresent = hasDegrees.filter(Boolean).length;
  const diversityScore = (degreesPresent / 3) * DIVERSITY_SCORE_CAP;

  const raw = connectionScore + densityScore + diversityScore;
  const clamped = Math.round(Math.max(0, Math.min(100, raw)));

  console.log('[TrustScore] Calculation:', {
    first: first.length,
    second: second.length,
    third: third.length,
    weightedSum: weightedSum.toFixed(2),
    connectionScore: connectionScore.toFixed(1),
    densityScore: densityScore.toFixed(1),
    diversityScore: diversityScore.toFixed(1),
    raw: raw.toFixed(1),
    final: clamped,
  });

  return clamped;
}

const allBusinessUsers = [currentBusinessUser, ...businessUsers, touchPointsAppBusiness];

const businessRatings: Record<string, { rating: number; reviewCount: number }> = {
  'b1': { rating: 4.8, reviewCount: 1247 },
  'b2': { rating: 4.7, reviewCount: 892 },
  'b3': { rating: 4.6, reviewCount: 456 },
  'b4': { rating: 4.5, reviewCount: 213 },
  'b5': { rating: 4.9, reviewCount: 67 },
  'b-touchpoints': { rating: 4.9, reviewCount: 3842 },
};

const CREATED_BIZCOMS_KEY = 'created_bizcoms';

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

const COMMUNITY_MEMBERSHIP_KEY = 'community_memberships';

type JoinStatus = 'none' | 'pending' | 'member';

export default function BusinessDetailScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const router = useRouter();
  const isOwnerPreview = preview === '1' && id === currentBusinessUser.id;
  const [storedPromotions, setStoredPromotions] = React.useState<CreatedPromotion[]>([]);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>('none');
  const [showFriendsList, setShowFriendsList] = useState<boolean>(false);
  const friendsListAnim = useRef(new Animated.Value(0)).current;
  const ringPulseAnim = useRef(new Animated.Value(1)).current;
  const [showJoinSuccess, setShowJoinSuccess] = useState<boolean>(false);
  const joinScaleAnim = useRef(new Animated.Value(1)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const business = useMemo(() => {
    return allBusinessUsers.find((u) => u.id === id);
  }, [id]);

  const businessPosts = useMemo(() => {
    if (!business) return [];
    return posts.filter((p) => p.author.id === business.id);
  }, [business]);

  const isAlreadyFollowing = useMemo(() => {
    return currentMemberFollowedBusinesses.some(b => b.businessId === id);
  }, [id]);

  const locationInfo = useMemo(() => {
    return businessLocations.find(b => b.businessId === id);
  }, [id]);

  const trustedConnections = useMemo(() => {
    return businessTrustedConnections.find(c => c.businessId === id);
  }, [id]);

  const allConnections = useMemo(() => trustedConnections?.trustedFriendsWhoAreMember ?? [], [trustedConnections]);
  const trustedFriends = useMemo(() => allConnections.filter(f => f.degree === 1), [allConnections]);
  const secondDegree = useMemo(() => allConnections.filter(f => f.degree === 2), [allConnections]);
  const thirdDegree = useMemo(() => allConnections.filter(f => f.degree === 3), [allConnections]);
  const totalConnections = allConnections.length;

  const trustScore = useMemo(() => {
    return calculateTrustScore(
      allConnections,
      trustedConnections?.totalCommunityMembers ?? 0,
    );
  }, [allConnections, trustedConnections?.totalCommunityMembers]);

  const [activeDegreTab, setActiveDegreTab] = useState<ConnectionDegree | 'all'>('all');

  const filteredConnections = useMemo(() => {
    if (activeDegreTab === 'all') return allConnections;
    return allConnections.filter(f => f.degree === activeDegreTab);
  }, [allConnections, activeDegreTab]);

  React.useEffect(() => {
    if (isAlreadyFollowing) {
      setJoinStatus('member');
    }
  }, [isAlreadyFollowing]);

  React.useEffect(() => {
    if (totalConnections > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulseAnim, { toValue: 1.03, duration: 2500, useNativeDriver: true }),
          Animated.timing(ringPulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [totalConnections, ringPulseAnim]);

  const toggleFriendsList = useCallback(() => {
    const toValue = showFriendsList ? 0 : 1;
    setShowFriendsList(!showFriendsList);
    Animated.spring(friendsListAnim, { toValue, friction: 8, tension: 65, useNativeDriver: false }).start();
  }, [showFriendsList, friendsListAnim]);

  const friendsListHeight = friendsListAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(filteredConnections.length * 72 + 80, 120)],
  });

  const friendsListOpacity = friendsListAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  React.useEffect(() => {
    const loadStoredPromotions = async () => {
      try {
        const stored = await AsyncStorage.getItem(CREATED_BIZCOMS_KEY);
        if (stored) {
          setStoredPromotions(JSON.parse(stored));
        }
      } catch (e) {
        console.log('[BusinessDetail] Error loading stored promotions:', e);
      }
    };
    const loadMembership = async () => {
      try {
        const stored = await AsyncStorage.getItem(COMMUNITY_MEMBERSHIP_KEY);
        if (stored) {
          const memberships: Record<string, JoinStatus> = JSON.parse(stored);
          if (memberships[id ?? '']) {
            setJoinStatus(memberships[id ?? '']);
          }
        }
      } catch (e) {
        console.log('[BusinessDetail] Error loading membership:', e);
      }
    };
    void loadStoredPromotions();
    if (!isAlreadyFollowing) void loadMembership();
  }, [id, isAlreadyFollowing]);

  const handleJoinCommunity = useCallback(async () => {
    if (joinStatus === 'member' || joinStatus === 'pending') return;

    Animated.sequence([
      Animated.timing(joinScaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.timing(joinScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setJoinStatus('pending');

    try {
      const stored = await AsyncStorage.getItem(COMMUNITY_MEMBERSHIP_KEY);
      const memberships: Record<string, JoinStatus> = stored ? JSON.parse(stored) : {};
      memberships[id ?? ''] = 'pending';
      await AsyncStorage.setItem(COMMUNITY_MEMBERSHIP_KEY, JSON.stringify(memberships));
      console.log('[BusinessDetail] Join request sent for business:', id);
    } catch (e) {
      console.log('[BusinessDetail] Error saving membership:', e);
    }

    setTimeout(async () => {
      setJoinStatus('member');
      setShowJoinSuccess(true);

      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      try {
        const stored = await AsyncStorage.getItem(COMMUNITY_MEMBERSHIP_KEY);
        const memberships: Record<string, JoinStatus> = stored ? JSON.parse(stored) : {};
        memberships[id ?? ''] = 'member';
        await AsyncStorage.setItem(COMMUNITY_MEMBERSHIP_KEY, JSON.stringify(memberships));
      } catch (e) {
        console.log('[BusinessDetail] Error updating membership:', e);
      }

      setTimeout(() => {
        Animated.timing(successOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setShowJoinSuccess(false);
          checkScale.setValue(0);
        });
      }, 2500);
    }, 1500);
  }, [joinStatus, id, joinScaleAnim, checkScale, successOpacity]);

  const businessPromotions = useMemo(() => {
    if (!business) return [];
    const allPromotions = [...mockCreatedPromotions, ...storedPromotions];
    return allPromotions.filter((p) => p.ownerId === business.id);
  }, [business, storedPromotions]);

  if (!business) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Business not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCall = () => {
    if (business.phone) {
      const url = `tel:${business.phone.replace(/[^+\d]/g, '')}`;
      Linking.openURL(url).catch(() => console.log('Could not open phone'));
    }
  };

  const handleEmail = () => {
    if (business.email) {
      Linking.openURL(`mailto:${business.email}`).catch(() => console.log('Could not open email'));
    }
  };

  const handleWebsite = () => {
    if (business.website) {
      const url = business.website.startsWith('http') ? business.website : `https://${business.website}`;
      Linking.openURL(url).catch(() => console.log('Could not open website'));
    }
  };

  const handleMap = () => {
    if (business.address) {
      const encoded = encodeURIComponent(business.address);
      const url = Platform.select({
        ios: `maps:0,0?q=${encoded}`,
        android: `geo:0,0?q=${encoded}`,
        default: `https://maps.google.com/?q=${encoded}`,
      });
      if (url) {
        Linking.openURL(url).catch(() => console.log('Could not open maps'));
      }
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop} />
      {isOwnerPreview && (
        <View style={styles.ownerPreviewBanner} testID="owner-preview-banner">
          <View style={styles.ownerPreviewIcon}>
            <Eye size={14} color="#fff" />
          </View>
          <Text style={styles.ownerPreviewText} numberOfLines={1}>
            You are viewing your public page
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.ownerPreviewClose}
            testID="owner-preview-close"
          >
            <Text style={styles.ownerPreviewCloseText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => router.back()}
            hitSlop={12}
            testID="business-back-btn"
          >
            <ArrowLeft size={22} color={Colors.bannerText} />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: business.avatar }} style={styles.avatar} />
            </View>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.username}>@{business.username}</Text>
            {business.category && (
              <View style={styles.categoryBadge}>
                <Tag size={12} color={Colors.bannerText} />
                <Text style={styles.categoryText}>{business.category}</Text>
              </View>
            )}
            <Text style={styles.bio}>{business.bio}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{business.followers.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{business.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{businessPosts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, !business.phone && styles.quickActionDisabled]}
            onPress={handleCall}
            disabled={!business.phone}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E7FAF0' }]}>
              <Phone size={20} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, !business.email && styles.quickActionDisabled]}
            onPress={handleEmail}
            disabled={!business.email}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EAF2FC' }]}>
              <Mail size={20} color="#4A90D9" />
            </View>
            <Text style={styles.quickActionLabel}>Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, !business.website && styles.quickActionDisabled]}
            onPress={handleWebsite}
            disabled={!business.website}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5EE' }]}>
              <Globe size={20} color={Colors.lavender} />
            </View>
            <Text style={styles.quickActionLabel}>Website</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, !business.address && styles.quickActionDisabled]}
            onPress={handleMap}
            disabled={!business.address}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF1F1' }]}>
              <MapPin size={20} color={Colors.coral} />
            </View>
            <Text style={styles.quickActionLabel}>Map</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Contact Details</Text>

          {business.phone && (
            <TouchableOpacity style={styles.detailRow} onPress={handleCall} activeOpacity={0.6}>
              <View style={[styles.detailIcon, { backgroundColor: '#E7FAF0' }]}>
                <Phone size={16} color="#22C55E" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{business.phone}</Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}

          {business.email && (
            <TouchableOpacity style={styles.detailRow} onPress={handleEmail} activeOpacity={0.6}>
              <View style={[styles.detailIcon, { backgroundColor: '#EAF2FC' }]}>
                <Mail size={16} color="#4A90D9" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{business.email}</Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}

          {business.website && (
            <TouchableOpacity style={styles.detailRow} onPress={handleWebsite} activeOpacity={0.6}>
              <View style={[styles.detailIcon, { backgroundColor: '#E8F5EE' }]}>
                <Globe size={16} color={Colors.lavender} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Website</Text>
                <Text style={styles.detailValue}>{business.website}</Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}

          {business.address && (
            <TouchableOpacity style={styles.detailRow} onPress={handleMap} activeOpacity={0.6}>
              <View style={[styles.detailIcon, { backgroundColor: '#FFF1F1' }]}>
                <MapPin size={16} color={Colors.coral} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{business.address}</Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}

          {business.hours && (
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.detailIcon, { backgroundColor: Colors.accentLight }]}>
                <Clock size={16} color={Colors.accentDark} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Opening Hours</Text>
                <Text style={styles.detailValue}>{business.hours}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.communitySection}>
          <View style={styles.communitySectionHeader}>
            <View style={styles.communitySectionIcon}>
              <Users size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.communitySectionTitle}>Community</Text>
              <Text style={styles.communitySectionSub}>{business.followers.toLocaleString()} members · {locationInfo?.neighborhood ?? 'Local'}</Text>
            </View>
          </View>

          {(() => {
            const ratingData = businessRatings[business.id] ?? { rating: 4.5, reviewCount: 0 };
            const fullStars = Math.floor(ratingData.rating);
            const hasHalf = ratingData.rating - fullStars >= 0.3;
            const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
            return (
              <View style={styles.ratingContainer}>
                <View style={styles.ratingStarsRow}>
                  <Text style={styles.ratingNumber}>{ratingData.rating.toFixed(1)}</Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: fullStars }).map((_, i) => (
                      <Star key={`full-${i}`} size={16} color="#F59E0B" fill="#F59E0B" />
                    ))}
                    {hasHalf && (
                      <View style={styles.halfStarWrap}>
                        <Star size={16} color="#E5E7EB" fill="#E5E7EB" />
                        <View style={styles.halfStarOverlay}>
                          <Star size={16} color="#F59E0B" fill="#F59E0B" />
                        </View>
                      </View>
                    )}
                    {Array.from({ length: emptyStars }).map((_, i) => (
                      <Star key={`empty-${i}`} size={16} color="#E5E7EB" fill="#E5E7EB" />
                    ))}
                  </View>
                  <Text style={styles.reviewCount}>({ratingData.reviewCount.toLocaleString()} reviews)</Text>
                </View>
              </View>
            );
          })()}

          {totalConnections > 0 && (
            <View style={styles.trustGraphicWrap}>
              <View style={styles.trustScoreBadge}>
                <Text style={styles.trustScoreLabel}>My Network Trust</Text>
                <Text style={styles.trustScoreValue}>{trustScore}%</Text>
              </View>
              <View style={styles.degreeRingsContainer}>
                <Animated.View style={[styles.ring3rd, { transform: [{ scale: ringPulseAnim }] }]}>
                  <View style={styles.ring3rdInner}>
                    {thirdDegree.slice(0, 3).map((f, i) => {
                      const angle = (i * 120 + 30) * (Math.PI / 180);
                      const r = 52;
                      return (
                        <View key={f.id} style={[styles.ringAvatarDot, { left: 56 + Math.cos(angle) * r - 10, top: 56 + Math.sin(angle) * r - 10 }]}>
                          <Image source={{ uri: f.avatar }} style={styles.ringAvatarDotImg} />
                        </View>
                      );
                    })}
                    <View style={styles.ring2nd}>
                      {secondDegree.slice(0, 4).map((f, i) => {
                        const angle = (i * 90 + 45) * (Math.PI / 180);
                        const r = 32;
                        return (
                          <View key={f.id} style={[styles.ringAvatarDot, { left: 38 + Math.cos(angle) * r - 10, top: 38 + Math.sin(angle) * r - 10 }]}>
                            <Image source={{ uri: f.avatar }} style={styles.ringAvatarDotImg} />
                          </View>
                        );
                      })}
                      <View style={styles.ring1st}>
                        <Heart size={16} color="#fff" fill="#fff" />
                        <Text style={styles.ringCoreNumber}>{totalConnections}</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                <View style={styles.degreeLegend}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.legendLabel}>1st°</Text>
                    <Text style={styles.legendCount}>{trustedFriends.length}</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
                    <Text style={styles.legendLabel}>2nd°</Text>
                    <Text style={styles.legendCount}>{secondDegree.length}</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#93C5FD' }]} />
                    <Text style={styles.legendLabel}>3rd°</Text>
                    <Text style={styles.legendCount}>{thirdDegree.length}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.trustCircleTitle}>
                {totalConnections} Connection{totalConnections !== 1 ? 's' : ''} across your network
              </Text>
              <Text style={styles.trustCircleSub}>
                {trustedFriends.length} direct · {secondDegree.length} friends of friends · {thirdDegree.length} extended
              </Text>

              <View style={styles.trustAvatarRow}>
                {allConnections.slice(0, 5).map((friend, idx) => (
                  <View
                    key={friend.id}
                    style={[
                      styles.trustAvatarWrap,
                      { marginLeft: idx > 0 ? -10 : 0, zIndex: 10 - idx },
                      friend.degree === 1 && { borderColor: '#3B82F6' },
                      friend.degree === 2 && { borderColor: '#60A5FA' },
                      friend.degree === 3 && { borderColor: '#93C5FD' },
                    ]}
                  >
                    <Image source={{ uri: friend.avatar }} style={styles.trustAvatarImg} />
                  </View>
                ))}
                {totalConnections > 5 && (
                  <View style={[styles.trustAvatarWrap, styles.trustAvatarMore, { marginLeft: -10, zIndex: 1 }]}>
                    <Text style={styles.trustAvatarMoreText}>+{totalConnections - 5}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.trustSeeAllBtn}
                activeOpacity={0.7}
                onPress={toggleFriendsList}
                testID="trust-see-friends-btn"
              >
                <Text style={styles.trustSeeAllText}>{showFriendsList ? 'Hide connections' : 'See who they are'}</Text>
                <ChevronDown size={14} color="#0EA5E9" style={showFriendsList ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </TouchableOpacity>
            </View>
          )}

          {showFriendsList && totalConnections > 0 && (
            <Animated.View style={[styles.friendsListWrap, { maxHeight: friendsListHeight, opacity: friendsListOpacity }]}>
              <View style={styles.degreeTabsRow}>
                {([['all', 'All', totalConnections], [1, '1st°', trustedFriends.length], [2, '2nd°', secondDegree.length], [3, '3rd°', thirdDegree.length]] as const).map(([key, label, count]) => (
                  <TouchableOpacity
                    key={String(key)}
                    style={[styles.degreeTab, activeDegreTab === key && styles.degreeTabActive]}
                    onPress={() => setActiveDegreTab(key as ConnectionDegree | 'all')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.degreeTabText, activeDegreTab === key && styles.degreeTabTextActive]}>{label}</Text>
                    <View style={[styles.degreeTabCount, activeDegreTab === key && styles.degreeTabCountActive]}>
                      <Text style={[styles.degreeTabCountText, activeDegreTab === key && styles.degreeTabCountTextActive]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {filteredConnections.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendListItem}
                  activeOpacity={0.65}
                  onPress={() => {
                    console.log('[BusinessDetail] Navigate to friend profile:', friend.userId, 'degree:', friend.degree);
                    const degreeLabel = friend.degree === 1 ? 'Direct friend' : friend.degree === 2 ? '2nd degree' : '3rd degree';
                    const viaText = friend.connectedViaName ? `\nConnected via ${friend.connectedViaName}` : '';
                    Alert.alert(friend.name, `@${friend.username} · ${degreeLabel}${viaText}\nMember since ${new Date(friend.memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`);
                  }}
                >
                  <View style={{ position: 'relative' as const }}>
                    <View style={[
                      styles.friendListAvatarRing,
                      friend.degree === 1 && { borderColor: '#3B82F6' },
                      friend.degree === 2 && { borderColor: '#60A5FA' },
                      friend.degree === 3 && { borderColor: '#93C5FD' },
                    ]}>
                      <Image source={{ uri: friend.avatar }} style={styles.friendListAvatar} />
                    </View>
                    <View style={[
                      styles.degreeBadgeSmall,
                      friend.degree === 1 && { backgroundColor: '#3B82F6' },
                      friend.degree === 2 && { backgroundColor: '#60A5FA' },
                      friend.degree === 3 && { backgroundColor: '#93C5FD' },
                    ]}>
                      <Text style={styles.degreeBadgeSmallText}>{friend.degree}°</Text>
                    </View>
                  </View>
                  <View style={styles.friendListInfo}>
                    <Text style={styles.friendListName}>{friend.name}</Text>
                    {friend.degree === 1 ? (
                      <Text style={styles.friendListMeta}>@{friend.username} · Direct friend</Text>
                    ) : (
                      <Text style={styles.friendListMeta}>
                        via {friend.connectedViaName ?? 'network'} · {friend.degree === 2 ? 'Friend of friend' : 'Extended network'}
                      </Text>
                    )}
                  </View>
                  {friend.connectedViaAvatar && friend.degree > 1 && (
                    <View style={styles.connectedViaChip}>
                      <Image source={{ uri: friend.connectedViaAvatar }} style={styles.connectedViaAvatar} />
                    </View>
                  )}
                  <ChevronRight size={14} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
              {filteredConnections.length === 0 && (
                <View style={styles.emptyDegreeWrap}>
                  <Text style={styles.emptyDegreeText}>No connections at this degree</Text>
                </View>
              )}
            </Animated.View>
          )}

          <View style={styles.communityPerks}>
            <View style={styles.perkItem}>
              <View style={[styles.perkIcon, { backgroundColor: '#FFF7ED' }]}>
                <Gift size={14} color="#F59E0B" />
              </View>
              <Text style={styles.perkText}>Exclusive rewards & deals</Text>
            </View>
            <View style={styles.perkItem}>
              <View style={[styles.perkIcon, { backgroundColor: '#EFF6FF' }]}>
                <MessageCircle size={14} color="#3B82F6" />
              </View>
              <Text style={styles.perkText}>Direct messaging access</Text>
            </View>
            <View style={styles.perkItem}>
              <View style={[styles.perkIcon, { backgroundColor: '#F0FDF4' }]}>
                <Shield size={14} color="#22C55E" />
              </View>
              <Text style={styles.perkText}>Member-only events & updates</Text>
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: joinScaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.joinBtn,
                joinStatus === 'pending' && styles.joinBtnPending,
                joinStatus === 'member' && styles.joinBtnMember,
              ]}
              activeOpacity={0.8}
              onPress={handleJoinCommunity}
              disabled={joinStatus !== 'none'}
              testID="join-community-btn"
            >
              {joinStatus === 'none' && (
                <>
                  <UserPlus size={18} color="#fff" />
                  <Text style={styles.joinBtnText}>Join Community</Text>
                </>
              )}
              {joinStatus === 'pending' && (
                <>
                  <Send size={16} color={Colors.navyDark} />
                  <Text style={styles.joinBtnTextPending}>Request Sent</Text>
                </>
              )}
              {joinStatus === 'member' && (
                <>
                  <CheckCircle size={18} color="#16A34A" />
                  <Text style={styles.joinBtnTextMember}>Community Member</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {showJoinSuccess && (
            <Animated.View style={[styles.joinSuccessBanner, { opacity: successOpacity }]}>
              <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                <CheckCircle size={20} color="#16A34A" />
              </Animated.View>
              <View>
                <Text style={styles.joinSuccessTitle}>Welcome to {business.name}!</Text>
                <Text style={styles.joinSuccessSub}>You'll now receive rewards, updates & exclusive offers</Text>
              </View>
            </Animated.View>
          )}
        </View>

        <TouchableOpacity style={styles.messageBtn} activeOpacity={0.8}>
          <MessageCircle size={18} color={Colors.navyDark} />
          <Text style={styles.messageBtnText}>Message {business.name}</Text>
        </TouchableOpacity>

        {businessPromotions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.promoSectionHeader}>
              <Megaphone size={16} color={Colors.text} />
              <Text style={styles.sectionTitle}>Promotions</Text>
            </View>
            {businessPromotions.map((promo) => (
              <TouchableOpacity
                key={promo.id}
                style={styles.promoCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/promotion/${promo.id}` as any)}
              >
                <Image source={{ uri: promo.avatar }} style={styles.promoImage} contentFit="cover" />
                <View style={styles.promoContent}>
                  <View style={styles.promoTopRow}>
                    <Text style={styles.promoName} numberOfLines={1}>{promo.name}</Text>
                    {promo.status === 'active' && (
                      <View style={styles.promoStatusBadge}>
                        <View style={styles.promoStatusDot} />
                        <Text style={styles.promoStatusText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.promoDescription} numberOfLines={2}>{promo.description}</Text>
                  <View style={styles.promoMeta}>
                    <View style={styles.promoMetaItem}>
                      <Eye size={11} color={Colors.textTertiary} />
                      <Text style={styles.promoMetaText}>{promo.views}</Text>
                    </View>
                    <View style={styles.promoMetaItem}>
                      <MousePointerClick size={11} color={Colors.textTertiary} />
                      <Text style={styles.promoMetaText}>{promo.clicks}</Text>
                    </View>
                    <Text style={styles.promoTime}>{promo.createdAt ? timeAgo(promo.createdAt) : ''}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {businessPosts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.postsSectionHeader}>
              <Grid3x3 size={16} color={Colors.text} />
              <Text style={styles.sectionTitle}>Posts</Text>
            </View>
            <View style={styles.postsGrid}>
              {businessPosts.map((post) => {
                const thumbUri = post.image
                  || post.author.avatar;
                return (
                  <View key={post.id} style={styles.postThumb}>
                    <Image
                      source={{ uri: thumbUri }}
                      style={styles.postThumbImage}
                      contentFit="cover"
                    />
                    {!post.image && (
                      <View style={styles.postThumbOverlay}>
                        <Text style={styles.postThumbText} numberOfLines={3}>{post.content}</Text>
                      </View>
                    )}
                    <View style={styles.postThumbStats}>
                      <Star size={10} color="#fff" fill="#fff" />
                      <Text style={styles.postThumbStatText}>{post.likes}</Text>
                      <MessageCircle size={10} color="#fff" fill="#fff" />
                      <Text style={styles.postThumbStatText}>{post.comments}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  ownerPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A1730',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ownerPreviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerPreviewText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: 0.1,
  },
  ownerPreviewClose: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ownerPreviewCloseText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    backgroundColor: Colors.banner,
    paddingBottom: 28,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  backArrow: {
    position: 'absolute' as const,
    top: 12,
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Colors.accent,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    marginTop: 14,
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,215,0,0.7)',
    marginTop: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
    gap: 5,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.bannerText,
  },
  bio: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,215,0,0.65)',
    textAlign: 'center' as const,
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,215,0,0.6)',
    marginTop: 2,
    fontWeight: '400' as const,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.navyLight,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  quickAction: {
    alignItems: 'center',
    gap: 6,
  },
  quickActionDisabled: {
    opacity: 0.35,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  detailsCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.text,
    marginTop: 2,
  },
  section: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  promoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  promoCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  promoImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  promoContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  promoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  promoName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  promoStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7FAF0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  promoStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  promoStatusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  promoDescription: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
  },
  promoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  promoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  promoMetaText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  promoTime: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginLeft: 'auto',
  },
  postsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: 0,
  },
  postThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  postThumbImage: {
    width: '100%',
    height: '100%',
  },
  postThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 8,
  },
  postThumbText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#fff',
    lineHeight: 14,
  },
  postThumbStats: {
    position: 'absolute' as const,
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  postThumbStatText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#fff',
    marginRight: 3,
  },
  communitySection: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  communitySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  communitySectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communitySectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  communitySectionSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  ratingContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  halfStarWrap: {
    position: 'relative' as const,
    width: 16,
    height: 16,
  },
  halfStarOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: 8,
    height: 16,
    overflow: 'hidden',
  },
  reviewCount: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#94A3B8',
  },
  communityPerks: {
    gap: 10,
    marginBottom: 16,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navyDark,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  joinBtnPending: {
    backgroundColor: '#FEF3C7',
  },
  joinBtnMember: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  joinBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  joinBtnTextPending: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  joinBtnTextMember: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  joinSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  joinSuccessTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  joinSuccessSub: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#15803D',
    marginTop: 1,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  messageBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textOnDark,
  },
  trustGraphicWrap: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    position: 'relative' as const,
  },
  degreeRingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ring3rd: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ring3rdInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  ring2nd: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#BFDBFE',
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  ring1st: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCoreNumber: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#fff',
    marginTop: 1,
    letterSpacing: -0.3,
  },
  ringAvatarDot: {
    position: 'absolute' as const,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  ringAvatarDotImg: {
    width: '100%' as const,
    height: '100%' as const,
  },
  degreeLegend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1E293B',
    minWidth: 32,
  },
  legendCount: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#3B82F6',
  },
  trustCircleTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1E40AF',
    letterSpacing: -0.2,
  },
  trustCircleSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#3B82F6',
    marginTop: 2,
  },
  trustAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trustAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F0F9FF',
    overflow: 'hidden',
  },
  trustAvatarImg: {
    width: '100%',
    height: '100%',
  },
  trustAvatarMore: {
    backgroundColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustAvatarMoreText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#1E40AF',
  },
  trustSeeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  trustSeeAllText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#0EA5E9',
  },
  trustScoreBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    alignSelf: 'center' as const,
    marginBottom: 12,
  },
  trustScoreLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  trustScoreValue: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#0EA5E9',
    letterSpacing: -0.3,
  },
  friendsListWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  friendListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  friendListAvatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  friendListAvatar: {
    width: '100%',
    height: '100%',
  },
  friendListInfo: {
    flex: 1,
    marginLeft: 10,
  },
  friendListName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  friendListMeta: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  degreeBadgeSmall: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  degreeBadgeSmallText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: '#fff',
  },
  connectedViaChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  connectedViaAvatar: {
    width: '100%' as const,
    height: '100%' as const,
  },
  degreeTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  degreeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  degreeTabActive: {
    backgroundColor: '#3B82F6',
  },
  degreeTabText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  degreeTabTextActive: {
    color: '#fff',
  },
  degreeTabCount: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  degreeTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  degreeTabCountText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#64748B',
  },
  degreeTabCountTextActive: {
    color: '#fff',
  },
  emptyDegreeWrap: {
    padding: 20,
    alignItems: 'center',
  },
  emptyDegreeText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#94A3B8',
  },
  bottomPadding: {
    height: 20,
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
  backBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
});

