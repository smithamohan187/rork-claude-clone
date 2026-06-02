import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  Crown,
  Layers,
  Mail,
  UserPlus,
  Share2,
  Calendar,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import { bizComs as mockBizComs, personalUsers } from '@/mocks/data';
import { BizCom, BizComFollower } from '@/types';
import { useReferrals } from '@/contexts/ReferralContext';

const CREATED_BIZCOMS_KEY = 'created_bizcoms';

const MOCK_FOLLOWERS: BizComFollower[] = personalUsers.map((u) => ({
  id: u.id,
  name: u.name,
  avatar: u.avatar,
  joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  email: u.email ?? `${u.username}@email.com`,
  phone: u.phone ?? '',
}));

export default function BizComDetailScreen() {
  const { id, bizcomIndex: indexParam } = useLocalSearchParams<{ id: string; bizcomIndex: string }>();
  const router = useRouter();
  const [createdBizComs, setCreatedBizComs] = useState<BizCom[]>([]);
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadCreatedBizComs();
  }, []);

  const loadCreatedBizComs = async () => {
    try {
      const stored = await AsyncStorage.getItem(CREATED_BIZCOMS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BizCom[];
        setCreatedBizComs(parsed);
      }
    } catch (e) {
      console.log('Error loading created BizComs:', e);
    }
  };

  const { bizComNewMembers } = useReferrals();

  const allBizComs = useMemo(() => [...mockBizComs, ...createdBizComs], [createdBizComs]);

  const bizCom = useMemo(() => {
    return allBizComs.find((bc) => bc.id === id);
  }, [id, allBizComs]);

  const bizComIndex = useMemo(() => {
    if (indexParam !== undefined) return parseInt(indexParam, 10);
    return allBizComs.findIndex((bc) => bc.id === id);
  }, [id, indexParam, allBizComs]);

  const isPrimary = bizComIndex === 0;

  const followers = useMemo(() => {
    const base = (bizCom?.followers && bizCom.followers.length > 0) ? bizCom.followers : MOCK_FOLLOWERS.slice(0, Math.floor(Math.random() * 4) + 2);
    const newMembers = bizComNewMembers.filter(m => !base.some(f => f.id === m.id));
    return [...newMembers, ...base];
  }, [bizCom, bizComNewMembers]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!bizCom) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>BizCom not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.goBackBtn}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop} />
      <Animated.View style={[styles.contentWrap, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroSection}>
            <TouchableOpacity
              style={styles.backArrow}
              onPress={() => router.back()}
              hitSlop={12}
              testID="bizcom-back-btn"
            >
              <ArrowLeft size={22} color={Colors.bannerText} />
            </TouchableOpacity>

            <View style={styles.heroContent}>
              <View style={styles.avatarRing}>
                <Image source={{ uri: bizCom.avatar }} style={styles.avatar} />
              </View>
              <Text style={styles.bizComName}>{bizCom.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{bizCom.category}</Text>
              </View>
              <Text style={styles.description}>{bizCom.description}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{bizCom.members.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Members</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{followers.length}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{bizCom.category.split(' ').length}</Text>
                  <Text style={styles.statLabel}>Tags</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#E7FAF0' }]}>
                <UserPlus size={18} color="#22C55E" />
              </View>
              <Text style={styles.actionLabel}>Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#EAF2FC' }]}>
                <Mail size={18} color="#4A90D9" />
              </View>
              <Text style={styles.actionLabel}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#FFF3E0' }]}>
                <Share2 size={18} color="#F59E0B" />
              </View>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>{bizCom.description}</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Users size={16} color={Colors.navyMid} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Community Size</Text>
                <Text style={styles.infoValue}>{bizCom.members.toLocaleString()} active members</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Calendar size={16} color={Colors.navyMid} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{bizCom.category}</Text>
              </View>
            </View>
          </View>

          <View style={styles.followersCard}>
            <View style={styles.followersSectionHeader}>
              <Users size={16} color={Colors.navyMid} />
              <Text style={styles.sectionTitle}>Members & Followers</Text>
              <View style={styles.followerCountBadge}>
                <Text style={styles.followerCountText}>{followers.length}</Text>
              </View>
            </View>

            {followers.map((f, idx) => (
              <View
                key={f.id}
                style={[
                  styles.followerRow,
                  idx === followers.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Image source={{ uri: f.avatar }} style={styles.followerAvatar} />
                <View style={styles.followerInfo}>
                  <Text style={styles.followerName}>{f.name}</Text>
                  {f.email ? <Text style={styles.followerContact}>{f.email}</Text> : null}
                  {f.phone ? <Text style={styles.followerContact}>{f.phone}</Text> : null}
                  <View style={styles.followerDateRow}>
                    <Calendar size={10} color={Colors.textTertiary} />
                    <Text style={styles.followerDate}>Joined {formatDate(f.joinedAt)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.bottomPadding} />
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
  contentWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    backgroundColor: Colors.banner,
    paddingBottom: 28,
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
  typeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  typeBannerPrimary: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  typeBannerComplimenting: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  typeBannerText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  bizComName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    marginTop: 14,
    letterSpacing: -0.3,
    textAlign: 'center' as const,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    letterSpacing: 0.1,
  },
  description: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.7)',
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
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.navyLight,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.text,
    marginTop: 2,
  },
  followersCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  followersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  followerCountBadge: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  followerCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.bannerText,
  },
  followerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  followerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  followerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  followerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  followerContact: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.navyMid,
    marginTop: 2,
  },
  followerDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  followerDate: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
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

