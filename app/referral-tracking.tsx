import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Link2,
  CheckCircle2,
  Clock,
  MousePointerClick,
  UserCheck,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Award,
  Copy,
  TrendingUp,
  Zap,
  PlayCircle,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useInvitations } from '@/contexts/InvitationContext';
import type { InvitationReferralCode } from '@/types';

type FilterType = 'all' | 'pending' | 'clicked' | 'registered' | 'joined';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7', icon: <Clock size={14} color="#F59E0B" /> },
  clicked: { label: 'Clicked', color: '#3B82F6', bg: '#DBEAFE', icon: <MousePointerClick size={14} color="#3B82F6" /> },
  registered: { label: 'Registered', color: '#00B246', bg: '#E8F5EE', icon: <UserCheck size={14} color="#00B246" /> },
  joined: { label: 'Joined', color: '#22C55E', bg: '#DCFCE7', icon: <CheckCircle2 size={14} color="#22C55E" /> },
};

export default function ReferralTrackingScreen() {
  const router = useRouter();
  const { codes, stats, simulateJoin, isSimulating } = useInvitations();
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredCodes = useMemo(() => {
    if (filter === 'all') return codes;
    return codes.filter(c => c.status === filter);
  }, [codes, filter]);

  const handleCopyCode = useCallback((code: string) => {
    Alert.alert('Copied', `Referral code ${code} copied to clipboard`);
  }, []);

  const handleSimulateJoin = useCallback((item: InvitationReferralCode) => {
    if (item.status === 'joined') return;
    Alert.alert(
      'Simulate Join',
      `Simulate ${item.contactName} joining via referral code ${item.code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate',
          onPress: () => {
            simulateJoin(item.id);
            console.log('[ReferralTracking] Simulated join for:', item.contactName, 'code:', item.code);
          },
        },
      ]
    );
  }, [simulateJoin]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const formatTime = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const renderStatCard = useCallback((label: string, value: number, color: string, bg: string, icon: React.ReactNode) => (
    <View style={[styles.statCard, { borderLeftColor: color }]} key={label}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  ), []);

  const renderCodeItem = useCallback(({ item }: { item: InvitationReferralCode }) => {
    const config = STATUS_CONFIG[item.status];
    const isExpanded = expandedId === item.id;
    const isJoined = item.status === 'joined';

    return (
      <TouchableOpacity
        style={[styles.codeCard, isJoined && styles.codeCardJoined]}
        activeOpacity={0.7}
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.codeCardTop}>
          <View style={styles.codeCardLeft}>
            <Image source={{ uri: item.contactAvatar }} style={styles.contactAvatar} />
            {isJoined && (
              <View style={styles.joinedBadgeOverlay}>
                <CheckCircle2 size={12} color="#FFF" />
              </View>
            )}
          </View>
          <View style={styles.codeCardCenter}>
            <Text style={styles.contactName} numberOfLines={1}>{item.contactName}</Text>
            <View style={styles.codeRow}>
              <View style={styles.codePill}>
                <Link2 size={10} color={Colors.navyDark} />
                <Text style={styles.codeText}>{item.code}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleCopyCode(item.code)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Copy size={13} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.bizcomTag} numberOfLines={1}>{item.bizComName}</Text>
          </View>
          <View style={styles.codeCardRight}>
            <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
              {config.icon}
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={16} color={Colors.textTertiary} />
            ) : (
              <ChevronDown size={16} color={Colors.textTertiary} />
            )}
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.divider} />

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{item.contactPhone}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Sent</Text>
                <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{formatTime(item.createdAt)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Inviter</Text>
                <Text style={styles.detailValue}>{item.inviterName}</Text>
              </View>
            </View>

            {isJoined && item.joinedUserName && (
              <View style={styles.joinedLinkup}>
                <View style={styles.linkupHeader}>
                  <Zap size={14} color={Colors.success} />
                  <Text style={styles.linkupTitle}>Member Linked</Text>
                </View>
                <View style={styles.linkupFlow}>
                  <View style={styles.linkupPerson}>
                    <Image source={{ uri: item.inviterAvatar }} style={styles.linkupAvatar} />
                    <Text style={styles.linkupName} numberOfLines={1}>{item.inviterName}</Text>
                    <Text style={styles.linkupRole}>Inviter</Text>
                  </View>
                  <View style={styles.linkupArrow}>
                    <View style={styles.linkupLine} />
                    <View style={styles.linkupCodeChip}>
                      <Text style={styles.linkupCodeText}>{item.code}</Text>
                    </View>
                    <View style={styles.linkupLine} />
                  </View>
                  <View style={styles.linkupPerson}>
                    <Image source={{ uri: item.joinedUserAvatar }} style={styles.linkupAvatar} />
                    <Text style={styles.linkupName} numberOfLines={1}>{item.joinedUserName}</Text>
                    <Text style={styles.linkupRole}>Joined</Text>
                  </View>
                </View>
                {item.joinedAt && (
                  <Text style={styles.linkupDate}>Joined on {formatDate(item.joinedAt)}</Text>
                )}
                {item.pointsAwarded != null && item.pointsAwarded > 0 && (
                  <View style={styles.pointsRow}>
                    <Award size={14} color="#F59E0B" />
                    <Text style={styles.pointsText}>{item.pointsAwarded} points awarded</Text>
                  </View>
                )}
              </View>
            )}

            {!isJoined && (
              <TouchableOpacity
                style={styles.simulateBtn}
                onPress={() => handleSimulateJoin(item)}
                disabled={isSimulating}
                activeOpacity={0.7}
              >
                <UserPlus size={14} color="#FFF" />
                <Text style={styles.simulateBtnText}>Simulate Join</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [expandedId, toggleExpand, handleCopyCode, handleSimulateJoin, isSimulating, formatDate, formatTime]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: `All (${codes.length})` },
    { key: 'pending', label: `Pending (${stats.pending})` },
    { key: 'clicked', label: `Clicked (${stats.clicked})` },
    { key: 'registered', label: `Registered (${stats.registered})` },
    { key: 'joined', label: `Joined (${stats.joined})` },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color={Colors.bannerText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Referral Tracking</Text>
            <Text style={styles.headerSubtitle}>{codes.length} invitation codes generated</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.inviteShortcut}
              onPress={() => router.push('/new-member-onboarding' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <PlayCircle size={18} color={Colors.bannerText} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={filteredCodes}
        keyExtractor={(item) => item.id}
        renderItem={renderCodeItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.statsRow}>
              {renderStatCard('Total', stats.total, Colors.navyDark, '#E8ECF0', <Link2 size={14} color={Colors.navyDark} />)}
              {renderStatCard('Pending', stats.pending, '#F59E0B', '#FEF3C7', <Clock size={14} color="#F59E0B" />)}
              {renderStatCard('Joined', stats.joined, '#22C55E', '#DCFCE7', <CheckCircle2 size={14} color="#22C55E" />)}
              {renderStatCard('Points', stats.totalPointsAwarded, '#00B246', '#E8F5EE', <Award size={14} color="#00B246" />)}
            </View>

            {stats.joined > 0 && (
              <View style={styles.conversionCard}>
                <View style={styles.conversionLeft}>
                  <TrendingUp size={18} color={Colors.success} />
                  <Text style={styles.conversionLabel}>Conversion Rate</Text>
                </View>
                <Text style={styles.conversionValue}>
                  {stats.total > 0 ? Math.round((stats.joined / stats.total) * 100) : 0}%
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.onboardingBanner}
              onPress={() => router.push('/new-member-onboarding' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.onboardingBannerLeft}>
                <PlayCircle size={18} color="#166534" />
                <View>
                  <Text style={styles.onboardingBannerTitle}>Simulate New Member Onboarding</Text>
                  <Text style={styles.onboardingBannerSub}>Test referral-to-BizCom auto-invite flow</Text>
                </View>
              </View>
              <ChevronDown size={16} color="#166534" style={{ transform: [{ rotate: '-90deg' }] }} />
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {filters.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Link2 size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No referral codes</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all'
                ? 'Send invitations to generate tracking codes'
                : `No ${filter} invitations found`}
            </Text>
          </View>
        }
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.bannerText,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  headerRight: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteShortcut: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  conversionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  conversionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conversionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#166534',
  },
  conversionValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.success,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.navyDark,
    borderColor: Colors.navyDark,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFF',
  },
  codeCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  codeCardJoined: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FEFFFE',
  },
  codeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeCardLeft: {
    position: 'relative' as const,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  joinedBadgeOverlay: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  codeCardCenter: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F3F8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    letterSpacing: 0.3,
  },
  bizcomTag: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    marginTop: 3,
  },
  codeCardRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  expandedSection: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  detailItem: {
    width: '48%',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  joinedLinkup: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  linkupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  linkupTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#166534',
  },
  linkupFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  linkupPerson: {
    alignItems: 'center',
    width: 80,
  },
  linkupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  linkupName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  linkupRole: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  linkupArrow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  linkupLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#86EFAC',
  },
  linkupCodeChip: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  linkupCodeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  linkupDate: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#15803D',
    textAlign: 'center' as const,
    marginTop: 10,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    paddingVertical: 6,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#92400E',
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navyDark,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  simulateBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  onboardingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  onboardingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  onboardingBannerTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#166534',
  },
  onboardingBannerSub: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#15803D',
    marginTop: 1,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
});

