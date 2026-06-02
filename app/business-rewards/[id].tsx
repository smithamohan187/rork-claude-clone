import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  Heart,
  Share2,
  MessageCircle,
  UserPlus,
  ShoppingBag,
  Star,
  Gift,
  ArrowLeft,
  Trophy,
  TrendingUp,
  Award,
  Zap,
  Crown,
  Gem,
  Target,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { rewardRules as defaultRewardRules, businessUsers, currentBusinessUser } from '@/mocks/data';
import type { RewardRule, User } from '@/types';

interface RewardTier {
  id: string;
  name: string;
  points: number;
  reward: string;
  color: string;
  icon: React.ElementType;
}

const defaultTiers: RewardTier[] = [
  { id: 't1', name: 'Bronze', points: 500, reward: '5% off', color: '#CD7F32', icon: Target },
  { id: 't2', name: 'Silver', points: 1500, reward: '10% off', color: '#A8A9AD', icon: Award },
  { id: 't3', name: 'Gold', points: 3000, reward: '15% off + Free Drink', color: '#FFD000', icon: Zap },
  { id: 't4', name: 'Platinum', points: 5000, reward: '20% off + VIP Access', color: '#00B246', icon: Crown },
  { id: 't5', name: 'Diamond', points: 10000, reward: '30% off + Gift Hamper', color: '#06B6D4', icon: Gem },
];

const iconMap: Record<string, React.ElementType> = {
  Heart, Share2, MessageCircle, UserPlus, ShoppingBag, Star, Gift,
};

const mockUserPoints: Record<string, number> = {
  'b1': 320,
  'b2': 780,
  'b3': 150,
  'b4': 45,
};

function RewardRuleCard({ rule }: { rule: RewardRule }) {
  const IconComp = iconMap[rule.icon] || Star;

  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleIconWrap}>
        <IconComp size={18} color={Colors.navyDark} />
      </View>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleAction}>{rule.action}</Text>
        <Text style={styles.ruleDesc}>{rule.description}</Text>
      </View>
      <View style={styles.rulePointsBadge}>
        <Text style={styles.rulePointsText}>+{rule.points}</Text>
        <Text style={styles.rulePointsUnit}>pts</Text>
      </View>
    </View>
  );
}

function TierCard({ tier, isActive, progress }: { tier: RewardTier; isActive: boolean; progress: number }) {
  const IconComp = tier.icon;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.tierCard, isActive && styles.tierCardActive]}>
      <View style={[styles.tierIconCircle, { backgroundColor: tier.color + '18' }]}>
        <IconComp size={20} color={tier.color} />
      </View>
      <View style={styles.tierContent}>
        <View style={styles.tierHeader}>
          <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
          {isActive && (
            <View style={[styles.currentBadge, { backgroundColor: tier.color }]}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>
        <Text style={styles.tierReward}>{tier.reward}</Text>
        <View style={styles.tierProgressRow}>
          <View style={styles.tierProgressBg}>
            <View style={[styles.tierProgressFill, { width: `${clampedProgress * 100}%`, backgroundColor: tier.color }]} />
          </View>
          <Text style={styles.tierProgressText}>{tier.points} pts</Text>
        </View>
      </View>
    </View>
  );
}

export default function BusinessRewardsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const business = useMemo<User | undefined>(() => {
    if (currentBusinessUser.id === id) return currentBusinessUser;
    return businessUsers.find(b => b.id === id);
  }, [id]);

  const userPoints = mockUserPoints[id ?? ''] ?? 0;

  const currentTierIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < defaultTiers.length; i++) {
      if (userPoints >= defaultTiers[i].points) {
        idx = i;
      }
    }
    return idx;
  }, [userPoints]);

  const nextTier = currentTierIndex < defaultTiers.length - 1 ? defaultTiers[currentTierIndex + 1] : null;
  const pointsToNext = nextTier ? nextTier.points - userPoints : 0;

  if (!business) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView edges={['top']} style={styles.safeTop} />
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.bannerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rewards</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.emptyState}>
          <Gift size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Business not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop} />

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.bannerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Rewards</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.businessCard}>
          <Image source={{ uri: business.avatar }} style={styles.businessAvatar} />
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.businessCategory}>{business.category ?? 'Business'}</Text>
          </View>
        </View>

        <View style={styles.pointsSummary}>
          <View style={styles.pointsCircle}>
            <Sparkles size={20} color={Colors.navyDark} />
            <Text style={styles.pointsValue}>{userPoints}</Text>
            <Text style={styles.pointsLabel}>Your Points</Text>
          </View>
          {nextTier && (
            <View style={styles.nextTierInfo}>
              <Text style={styles.nextTierText}>
                <Text style={styles.nextTierHighlight}>{pointsToNext}</Text> pts to {nextTier.name}
              </Text>
              <View style={styles.nextTierProgressBg}>
                <View
                  style={[
                    styles.nextTierProgressFill,
                    { width: `${Math.min((userPoints / nextTier.points) * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Gift size={16} color={Colors.navyDark} />
            <Text style={styles.sectionTitle}>How to Earn</Text>
          </View>
          {defaultRewardRules.map(rule => (
            <RewardRuleCard key={rule.id} rule={rule} />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trophy size={16} color={Colors.navyDark} />
            <Text style={styles.sectionTitle}>Reward Tiers</Text>
          </View>
          <Text style={styles.tierSubtext}>
            Earn points and unlock exclusive rewards from {business.name}
          </Text>
          {defaultTiers.map((tier, i) => (
            <TierCard
              key={tier.id}
              tier={tier}
              isActive={i === currentTierIndex}
              progress={userPoints / tier.points}
            />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={16} color={Colors.navyDark} />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: Colors.teal }]} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Shared a post</Text>
                <Text style={styles.activityPoints}>+15 pts</Text>
              </View>
              <Text style={styles.activityTime}>2h ago</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: Colors.lavender }]} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Rated & reviewed</Text>
                <Text style={styles.activityPoints}>+10 pts</Text>
              </View>
              <Text style={styles.activityTime}>1d ago</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: Colors.warning }]} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Referred a friend</Text>
                <Text style={styles.activityPoints}>+50 pts</Text>
              </View>
              <Text style={styles.activityTime}>3d ago</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.banner,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center' as const,
  },
  scroll: {
    paddingBottom: 20,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.banner,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 14,
  },
  businessAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    letterSpacing: -0.2,
  },
  businessCategory: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  pointsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  pointsCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.navyDark,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  nextTierInfo: {
    flex: 1,
  },
  nextTierText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  nextTierHighlight: {
    fontWeight: '800' as const,
    color: Colors.navyDark,
    fontSize: 16,
  },
  nextTierProgressBg: {
    height: 6,
    backgroundColor: '#E8ECF0',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden' as const,
  },
  nextTierProgressFill: {
    height: 6,
    backgroundColor: Colors.teal,
    borderRadius: 3,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  ruleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8EDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ruleAction: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  ruleDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  rulePointsBadge: {
    alignItems: 'center',
    minWidth: 56,
  },
  rulePointsText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    letterSpacing: -0.2,
  },
  rulePointsUnit: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  tierSubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tierCardActive: {
    borderColor: Colors.teal,
    borderWidth: 1.5,
    backgroundColor: '#F0FDF9',
  },
  tierIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierContent: {
    flex: 1,
    marginLeft: 12,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  tierReward: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  tierProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  tierProgressBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#E8ECF0',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  tierProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  tierProgressText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  activityPoints: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.teal,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginLeft: 10,
    minWidth: 40,
    textAlign: 'right' as const,
  },
  activityDivider: {
    height: 0.5,
    backgroundColor: Colors.borderLight,
    marginLeft: 34,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  bottomSpacer: {
    height: 40,
  },
});

