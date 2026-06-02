import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Award,
  Clock,
  ShoppingBag,
  UserCheck,
  UserX,
  ChevronRight,
  Flame,
  Star,
  Zap,
  Target,
  BarChart3,
  Activity,
  Eye,
  MessageCircle,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { businessMembers, bizComs } from '@/mocks/data';
import type { BusinessMember } from '@/mocks/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeFilter = '7d' | '30d' | '90d' | 'all';
type SortBy = 'points' | 'purchases' | 'recent' | 'name';

interface MemberActivityStat {
  label: string;
  value: string;
  change: number;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
}

function getActivityLevel(member: BusinessMember): 'high' | 'medium' | 'low' {
  if (member.status === 'inactive') return 'low';
  if (member.points > 600 && member.totalPurchases > 15) return 'high';
  if (member.points > 300 || member.totalPurchases > 8) return 'medium';
  return 'low';
}

function getActivityColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return '#10B981';
    case 'medium': return '#F59E0B';
    case 'low': return '#EF4444';
  }
}

function getActivityLabel(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'Highly Active';
    case 'medium': return 'Moderate';
    case 'low': return 'Low Activity';
  }
}

const StatCard = React.memo(function StatCard({ stat, index }: { stat: MemberActivityStat; index: number }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const IconComponent = stat.icon;
  const isPositive = stat.change >= 0;

  return (
    <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.statCardInner}>
        <View style={styles.statCardTop}>
          <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
            <IconComponent size={18} color={stat.color} />
          </View>
          <View style={[styles.changeBadge, { backgroundColor: isPositive ? '#ECFDF5' : '#FEF2F2' }]}>
            {isPositive ? (
              <ArrowUpRight size={10} color="#10B981" />
            ) : (
              <ArrowDownRight size={10} color="#EF4444" />
            )}
            <Text style={[styles.changeText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
              {Math.abs(stat.change)}%
            </Text>
          </View>
        </View>
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </Pressable>
    </Animated.View>
  );
});

const MemberRow = React.memo(function MemberRow({ member, onPress }: { member: BusinessMember; onPress: () => void }) {
  const activityLevel = getActivityLevel(member);
  const activityColor = getActivityColor(activityLevel);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.memberRow}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.memberLeft}>
          <View style={styles.memberAvatarWrap}>
            <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
            <View style={[styles.activityDot, { backgroundColor: activityColor }]} />
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
            <Text style={styles.memberMeta}>@{member.username} · {member.lastVisit}</Text>
          </View>
        </View>
        <View style={styles.memberRight}>
          <View style={styles.memberStats}>
            <View style={styles.memberStatItem}>
              <Zap size={11} color="#F59E0B" />
              <Text style={styles.memberStatValue}>{member.points}</Text>
            </View>
            <View style={styles.memberStatItem}>
              <ShoppingBag size={11} color="#00B246" />
              <Text style={styles.memberStatValue}>{member.totalPurchases}</Text>
            </View>
          </View>
          <View style={[styles.activityBadge, { backgroundColor: activityColor + '18' }]}>
            <Text style={[styles.activityBadgeText, { color: activityColor }]}>{getActivityLabel(activityLevel)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const ActivityBar = React.memo(function ActivityBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: maxValue > 0 ? (value / maxValue) * 100 : 0,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [value, maxValue, widthAnim]);

  return (
    <View style={styles.activityBarRow}>
      <Text style={styles.activityBarLabel}>{label}</Text>
      <View style={styles.activityBarTrack}>
        <Animated.View
          style={[
            styles.activityBarFill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.activityBarValue}>{value}</Text>
    </View>
  );
});

export default function BizComDashboardScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [sortBy, setSortBy] = useState<SortBy>('points');
  const [showAllMembers, setShowAllMembers] = useState<boolean>(false);

  const businessId = currentUser?.id === 'b1' ? 'b1' : 'b1';
  const members = useMemo(() => businessMembers[businessId] || [], [businessId]);

  const myBizComs = useMemo(() => bizComs.filter(bc => bc.ownerId === businessId), [businessId]);

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const inactiveMembers = members.filter(m => m.status === 'inactive').length;
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0);
  const totalPurchases = members.reduce((sum, m) => sum + m.totalPurchases, 0);
  const avgPoints = totalMembers > 0 ? Math.round(totalPoints / totalMembers) : 0;
  const avgPurchases = totalMembers > 0 ? Math.round((totalPurchases / totalMembers) * 10) / 10 : 0;

  const highActivity = members.filter(m => getActivityLevel(m) === 'high').length;
  const mediumActivity = members.filter(m => getActivityLevel(m) === 'medium').length;
  const lowActivity = members.filter(m => getActivityLevel(m) === 'low').length;

  const stats: MemberActivityStat[] = useMemo(() => [
    { label: 'Total Members', value: totalMembers.toString(), change: 12, icon: Users, color: '#1B2A4A', bg: '#EEF2FF' },
    { label: 'Active Now', value: activeMembers.toString(), change: 8, icon: UserCheck, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Avg Points', value: avgPoints.toLocaleString(), change: 15, icon: Zap, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Total Purchases', value: totalPurchases.toString(), change: -3, icon: ShoppingBag, color: '#00B246', bg: '#E8F5EE' },
  ], [totalMembers, activeMembers, avgPoints, totalPurchases]);

  const sortedMembers = useMemo(() => {
    const sorted = [...members];
    switch (sortBy) {
      case 'points':
        sorted.sort((a, b) => b.points - a.points);
        break;
      case 'purchases':
        sorted.sort((a, b) => b.totalPurchases - a.totalPurchases);
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const parseVisit = (v: string) => {
            if (v.includes('min')) return 1;
            if (v.includes('hour')) return parseInt(v) * 60;
            if (v.includes('day')) return parseInt(v) * 1440;
            if (v.includes('week')) return parseInt(v) * 10080;
            return 99999;
          };
          return parseVisit(a.lastVisit) - parseVisit(b.lastVisit);
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [members, sortBy]);

  const displayedMembers = showAllMembers ? sortedMembers : sortedMembers.slice(0, 5);

  const topMember = sortedMembers[0];

  const maxPoints = Math.max(...members.map(m => m.points), 1);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B2A4A', '#2C3E5A', '#1B2A4A']}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>BizCom Dashboard</Text>
              <Text style={styles.headerSubtitle}>Member Activity & Insights</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timeFilterRow}>
          {(['7d', '30d', '90d', 'all'] as TimeFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.timeFilterBtn, timeFilter === filter && styles.timeFilterBtnActive]}
              activeOpacity={0.7}
              onPress={() => setTimeFilter(filter)}
            >
              <Text style={[styles.timeFilterText, timeFilter === filter && styles.timeFilterTextActive]}>
                {filter === 'all' ? 'All Time' : filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <StatCard key={stat.label} stat={stat} index={idx} />
          ))}
        </View>

        {topMember && (
          <View style={styles.topMemberCard}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.topMemberGradient}
            >
              <View style={styles.topMemberContent}>
                <View style={styles.topMemberLeft}>
                  <View style={styles.topMemberBadge}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.topMemberBadgeText}>Top Member</Text>
                  </View>
                  <Text style={styles.topMemberName}>{topMember.name}</Text>
                  <Text style={styles.topMemberStats}>
                    {topMember.points.toLocaleString()} pts · {topMember.totalPurchases} purchases
                  </Text>
                </View>
                <Image source={{ uri: topMember.avatar }} style={styles.topMemberAvatar} />
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Activity size={18} color={Colors.navyDark} />
              <Text style={styles.sectionTitle}>Activity Breakdown</Text>
            </View>
          </View>
          <View style={styles.activityBreakdownCard}>
            <View style={styles.activityPieRow}>
              <View style={styles.activitySegment}>
                <View style={[styles.segmentDot, { backgroundColor: '#10B981' }]} />
                <View>
                  <Text style={styles.segmentValue}>{highActivity}</Text>
                  <Text style={styles.segmentLabel}>High</Text>
                </View>
              </View>
              <View style={styles.activitySegment}>
                <View style={[styles.segmentDot, { backgroundColor: '#F59E0B' }]} />
                <View>
                  <Text style={styles.segmentValue}>{mediumActivity}</Text>
                  <Text style={styles.segmentLabel}>Medium</Text>
                </View>
              </View>
              <View style={styles.activitySegment}>
                <View style={[styles.segmentDot, { backgroundColor: '#EF4444' }]} />
                <View>
                  <Text style={styles.segmentValue}>{lowActivity}</Text>
                  <Text style={styles.segmentLabel}>Low</Text>
                </View>
              </View>
            </View>
            <View style={styles.activityBarContainer}>
              <View style={styles.activityBarStacked}>
                <View style={[styles.activityBarSegment, { flex: highActivity || 1, backgroundColor: '#10B981', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
                <View style={[styles.activityBarSegment, { flex: mediumActivity || 1, backgroundColor: '#F59E0B' }]} />
                <View style={[styles.activityBarSegment, { flex: lowActivity || 1, backgroundColor: '#EF4444', borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <BarChart3 size={18} color={Colors.navyDark} />
              <Text style={styles.sectionTitle}>Points Leaderboard</Text>
            </View>
          </View>
          <View style={styles.leaderboardCard}>
            {sortedMembers.slice(0, 5).map((member, idx) => (
              <ActivityBar
                key={member.id}
                label={member.name.split(' ')[0]}
                value={member.points}
                maxValue={maxPoints}
                color={idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#CD7F32' : '#1B2A4A'}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Users size={18} color={Colors.navyDark} />
              <Text style={styles.sectionTitle}>All Members</Text>
            </View>
            <View style={styles.sortRow}>
              {(['points', 'purchases', 'recent', 'name'] as SortBy[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
                  activeOpacity={0.7}
                  onPress={() => setSortBy(s)}
                >
                  <Text style={[styles.sortBtnText, sortBy === s && styles.sortBtnTextActive]}>
                    {s === 'points' ? 'Points' : s === 'purchases' ? 'Buys' : s === 'recent' ? 'Recent' : 'Name'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.membersListCard}>
            {displayedMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onPress={() => console.log('[BIZCOM DASHBOARD] Member tapped:', member.name)}
              />
            ))}
            {!showAllMembers && sortedMembers.length > 5 && (
              <TouchableOpacity
                style={styles.showAllBtn}
                activeOpacity={0.7}
                onPress={() => setShowAllMembers(true)}
              >
                <Text style={styles.showAllText}>View All {sortedMembers.length} Members</Text>
                <ChevronRight size={16} color={Colors.navyDark} />
              </TouchableOpacity>
            )}
            {showAllMembers && sortedMembers.length > 5 && (
              <TouchableOpacity
                style={styles.showAllBtn}
                activeOpacity={0.7}
                onPress={() => setShowAllMembers(false)}
              >
                <Text style={styles.showAllText}>Show Less</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {myBizComs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Target size={18} color={Colors.navyDark} />
                <Text style={styles.sectionTitle}>My BizCom Groups</Text>
              </View>
            </View>
            {myBizComs.map((bc) => (
              <TouchableOpacity
                key={bc.id}
                style={styles.bizComRow}
                activeOpacity={0.7}
                onPress={() => router.push(`/bizcom/${bc.id}` as never)}
              >
                <Image source={{ uri: bc.avatar }} style={styles.bizComAvatar} />
                <View style={styles.bizComInfo}>
                  <Text style={styles.bizComName}>{bc.name}</Text>
                  <Text style={styles.bizComMeta}>{bc.members.toLocaleString()} members · {bc.category}</Text>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  headerGradient: {
    paddingBottom: 16,
  },
  safeHeader: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  headerRight: {
    marginLeft: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  timeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  timeFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  timeFilterBtnActive: {
    backgroundColor: '#1B2A4A',
    borderColor: '#1B2A4A',
  },
  timeFilterText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  timeFilterTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  statCard: {
    width: (SCREEN_WIDTH - 40) / 2,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardInner: {
    padding: 16,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  topMemberCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  topMemberGradient: {
    padding: 18,
  },
  topMemberContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topMemberLeft: {
    flex: 1,
  },
  topMemberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  topMemberBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  topMemberName: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  topMemberStats: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  topMemberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    marginLeft: 12,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  activityBreakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityPieRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  activitySegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  segmentValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  activityBarContainer: {
    marginTop: 4,
  },
  activityBarStacked: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 2,
  },
  activityBarSegment: {
    height: 10,
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityBarLabel: {
    width: 56,
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  activityBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  activityBarFill: {
    height: 8,
    borderRadius: 4,
  },
  activityBarValue: {
    width: 40,
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'right',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  sortBtnActive: {
    backgroundColor: Colors.navyDark,
    borderColor: Colors.navyDark,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  sortBtnTextActive: {
    color: '#fff',
  },
  membersListCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F6F9',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  memberAvatarWrap: {
    position: 'relative',
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  memberMeta: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  memberStats: {
    flexDirection: 'row',
    gap: 10,
  },
  memberStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  memberStatValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activityBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  showAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  showAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
  bizComRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  bizComAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  bizComInfo: {
    flex: 1,
  },
  bizComName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  bizComMeta: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

