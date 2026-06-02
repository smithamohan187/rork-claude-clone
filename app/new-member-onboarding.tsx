import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Download,
  UserPlus,
  ShieldCheck,
  Link2,
  Mail,
  Users,
  Gift,
  CheckCircle2,
  Play,
  ChevronRight,
  Sparkles,
  X,
  Clock,
  Zap,
  Send,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useInvitations } from '@/contexts/InvitationContext';
import type { InvitationReferralCode, NewMemberOnboarding, OnboardingEvent } from '@/types';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  download: <Download size={18} color="#3B82F6" />,
  signup: <UserPlus size={18} color="#00B246" />,
  code_verified: <ShieldCheck size={18} color="#F59E0B" />,
  referral_mapped: <Link2 size={18} color="#EC4899" />,
  bizcom_auto_invite_created: <Send size={18} color="#0891B2" />,
  bizcom_invite_sent: <Mail size={18} color="#06B6D4" />,
  bizcom_joined: <Users size={18} color="#22C55E" />,
  welcome_points: <Gift size={18} color="#F59E0B" />,
};

const EVENT_COLORS: Record<string, { bg: string; border: string }> = {
  download: { bg: '#EFF6FF', border: '#BFDBFE' },
  signup: { bg: '#E8F5EE', border: '#E8F5EE' },
  code_verified: { bg: '#FFFBEB', border: '#FDE68A' },
  referral_mapped: { bg: '#FDF2F8', border: '#FBCFE8' },
  bizcom_auto_invite_created: { bg: '#ECFEFF', border: '#67E8F9' },
  bizcom_invite_sent: { bg: '#ECFEFF', border: '#A5F3FC' },
  bizcom_joined: { bg: '#F0FDF4', border: '#BBF7D0' },
  welcome_points: { bg: '#FFFBEB', border: '#FDE68A' },
};

export default function NewMemberOnboardingScreen() {
  const router = useRouter();
  const { codes, simulateFullOnboarding, onboardings } = useInvitations();
  const [selectedCode, setSelectedCode] = useState<InvitationReferralCode | null>(null);
  const [activeOnboarding, setActiveOnboarding] = useState<NewMemberOnboarding | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const eventAnims = useRef<Animated.Value[]>([]).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  const pendingCodes = codes.filter(c => c.status !== 'joined');

  const startOnboarding = useCallback((code: InvitationReferralCode) => {
    setSelectedCode(code);
    const result = simulateFullOnboarding(code.id);
    if (!result) return;

    setActiveOnboarding(result);
    setVisibleEvents(0);
    setIsAnimating(true);
    setShowResult(false);
    resultAnim.setValue(0);

    while (eventAnims.length > 0) eventAnims.pop();
    result.events.forEach(() => {
      eventAnims.push(new Animated.Value(0));
    });

    let delay = 600;
    result.events.forEach((_, index) => {
      setTimeout(() => {
        setVisibleEvents(index + 1);
        Animated.spring(eventAnims[index], {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }).start();

        Animated.timing(progressAnim, {
          toValue: (index + 1) / result.events.length,
          duration: 400,
          useNativeDriver: false,
        }).start();

        if (index === result.events.length - 1) {
          setTimeout(() => {
            setIsAnimating(false);
            setShowResult(true);
            Animated.spring(resultAnim, {
              toValue: 1,
              useNativeDriver: true,
              tension: 50,
              friction: 8,
            }).start();
          }, 600);
        }
      }, delay);
      delay += 800;
    });

    console.log('[NewMemberOnboarding] Started onboarding simulation for:', code.contactName);
  }, [simulateFullOnboarding, eventAnims, progressAnim, resultAnim]);

  const resetSimulation = useCallback(() => {
    setSelectedCode(null);
    setActiveOnboarding(null);
    setVisibleEvents(0);
    setIsAnimating(false);
    setShowResult(false);
    progressAnim.setValue(0);
    resultAnim.setValue(0);
  }, [progressAnim, resultAnim]);

  const renderCodeCard = useCallback(({ item }: { item: InvitationReferralCode }) => {
    const isSelected = selectedCode?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.codeCard, isSelected && styles.codeCardSelected]}
        activeOpacity={0.7}
        onPress={() => {
          if (!isAnimating) setSelectedCode(item);
        }}
        disabled={isAnimating}
      >
        <Image source={{ uri: item.contactAvatar }} style={styles.codeAvatar} />
        <View style={styles.codeInfo}>
          <Text style={styles.codeName} numberOfLines={1}>{item.contactName}</Text>
          <View style={styles.codeTagRow}>
            <View style={styles.codePill}>
              <Link2 size={9} color={Colors.navyDark} />
              <Text style={styles.codePillText}>{item.code}</Text>
            </View>
          </View>
          <Text style={styles.codeBizcom} numberOfLines={1}>{item.bizComName}</Text>
        </View>
        <View style={styles.codeRight}>
          <View style={[styles.statusDot, { backgroundColor: item.status === 'pending' ? '#F59E0B' : item.status === 'clicked' ? '#3B82F6' : '#00B246' }]} />
          <Text style={styles.codeStatus}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [selectedCode, isAnimating]);

  const renderEventItem = useCallback((event: OnboardingEvent, index: number) => {
    if (index >= visibleEvents) return null;
    const anim = eventAnims[index];
    const colors = EVENT_COLORS[event.type] ?? { bg: '#F5F5F5', border: '#E5E5E5' };
    const icon = EVENT_ICONS[event.type] ?? <CheckCircle2 size={18} color={Colors.success} />;
    const isLast = index === (activeOnboarding?.events.length ?? 0) - 1;

    return (
      <Animated.View
        key={event.id}
        style={[
          styles.eventRow,
          {
            opacity: anim,
            transform: [{
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
        ]}
      >
        <View style={styles.timelineColumn}>
          <View style={[styles.eventIconCircle, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            {icon}
          </View>
          {!isLast && <View style={styles.timelineLine} />}
        </View>
        <View style={[styles.eventCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDescription}>{event.description}</Text>
          <View style={styles.eventTimestamp}>
            <Clock size={10} color={Colors.textTertiary} />
            <Text style={styles.eventTime}>
              {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }, [visibleEvents, eventAnims, activeOnboarding]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
            <Text style={styles.headerTitle}>New Member Onboarding</Text>
            <Text style={styles.headerSubtitle}>Simulate referral-to-BizCom flow</Text>
          </View>
          {activeOnboarding && (
            <TouchableOpacity
              onPress={resetSimulation}
              style={styles.resetBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={Colors.bannerText} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {!activeOnboarding ? (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introCard}>
            <View style={styles.introIconRow}>
              <View style={[styles.introIcon, { backgroundColor: '#EFF6FF' }]}>
                <Download size={20} color="#3B82F6" />
              </View>
              <ChevronRight size={14} color={Colors.textTertiary} />
              <View style={[styles.introIcon, { backgroundColor: '#E8F5EE' }]}>
                <ShieldCheck size={20} color="#00B246" />
              </View>
              <ChevronRight size={14} color={Colors.textTertiary} />
              <View style={[styles.introIcon, { backgroundColor: '#FDF2F8' }]}>
                <Link2 size={20} color="#EC4899" />
              </View>
              <ChevronRight size={14} color={Colors.textTertiary} />
              <View style={[styles.introIcon, { backgroundColor: '#ECFEFF' }]}>
                <Send size={20} color="#0891B2" />
              </View>
              <ChevronRight size={14} color={Colors.textTertiary} />
              <View style={[styles.introIcon, { backgroundColor: '#F0FDF4' }]}>
                <Users size={20} color="#22C55E" />
              </View>
            </View>
            <Text style={styles.introTitle}>How It Works</Text>
            <Text style={styles.introDesc}>
              When an SMS invite is sent, a BizCom invitation is automatically created. When the contact downloads the app, the system maps their referral code, delivers the BizCom invite, and completes onboarding.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Select a Pending Invitation</Text>
          <Text style={styles.sectionSub}>Choose a contact to simulate their onboarding journey</Text>

          {pendingCodes.length === 0 ? (
            <View style={styles.emptyState}>
              <Sparkles size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>All Contacts Joined</Text>
              <Text style={styles.emptySubtitle}>Send more invitations to simulate new onboardings</Text>
              <TouchableOpacity style={styles.inviteBtn} onPress={() => router.push('/invite' as any)}>
                <UserPlus size={14} color="#FFF" />
                <Text style={styles.inviteBtnText}>Invite Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.codesList}>
              {pendingCodes.map(code => (
                <View key={code.id}>
                  {renderCodeCard({ item: code })}
                </View>
              ))}
            </View>
          )}

          {selectedCode && (
            <View style={styles.startSection}>
              <View style={styles.selectedPreview}>
                <Image source={{ uri: selectedCode.contactAvatar }} style={styles.previewAvatar} />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{selectedCode.contactName}</Text>
                  <Text style={styles.previewDetail}>Code: {selectedCode.code}</Text>
                  <Text style={styles.previewDetail}>BizCom: {selectedCode.bizComName}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => startOnboarding(selectedCode)}
                activeOpacity={0.8}
              >
                <Play size={16} color="#FFF" fill="#FFF" />
                <Text style={styles.startBtnText}>Simulate Onboarding</Text>
              </TouchableOpacity>
            </View>
          )}

          {onboardings.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Completed Onboardings</Text>
              {onboardings.map(ob => (
                <View key={ob.id} style={styles.historyCard}>
                  <Image source={{ uri: ob.newMemberAvatar }} style={styles.historyAvatar} />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{ob.newMemberName}</Text>
                    <Text style={styles.historyDetail}>Joined {ob.bizComName}</Text>
                    <Text style={styles.historyTime}>
                      {new Date(ob.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.historyBadge}>
                    <CheckCircle2 size={14} color={Colors.success} />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.onboardingHeader}>
            <View style={styles.onboardingAvatarRow}>
              <View style={styles.onboardingAvatarWrap}>
                <Image source={{ uri: activeOnboarding.newMemberAvatar }} style={styles.onboardingAvatar} />
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>
              <View style={styles.onboardingMeta}>
                <Text style={styles.onboardingName}>{activeOnboarding.newMemberName}</Text>
                <Text style={styles.onboardingPhone}>{activeOnboarding.newMemberPhone}</Text>
                <View style={styles.onboardingCodeRow}>
                  <Link2 size={10} color={Colors.navyDark} />
                  <Text style={styles.onboardingCodeText}>{activeOnboarding.referralCode.code}</Text>
                </View>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.progressLabel}>
              {isAnimating ? `Processing... ${visibleEvents}/${activeOnboarding.events.length}` : 'Onboarding Complete'}
            </Text>
          </View>

          <View style={styles.eventsContainer}>
            {activeOnboarding.events.map((event, index) => renderEventItem(event, index))}
          </View>

          {showResult && (
            <Animated.View
              style={[
                styles.resultCard,
                {
                  opacity: resultAnim,
                  transform: [{
                    scale: resultAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.resultIconCircle}>
                <Sparkles size={28} color="#FFF" />
              </View>
              <Text style={styles.resultTitle}>Onboarding Complete!</Text>
              <Text style={styles.resultDesc}>
                {activeOnboarding.newMemberName} has been successfully onboarded via referral code {activeOnboarding.referralCode.code}
              </Text>

              <View style={styles.resultSummary}>
                <View style={styles.resultSummaryRow}>
                  <View style={styles.resultFlowPerson}>
                    <Image source={{ uri: activeOnboarding.inviterAvatar }} style={styles.resultFlowAvatar} />
                    <Text style={styles.resultFlowName} numberOfLines={1}>{activeOnboarding.inviterName}</Text>
                    <Text style={styles.resultFlowRole}>Inviter</Text>
                  </View>
                  <View style={styles.resultFlowArrow}>
                    <View style={styles.resultFlowLine} />
                    <View style={styles.resultFlowCodeChip}>
                      <Text style={styles.resultFlowCodeText}>{activeOnboarding.referralCode.code}</Text>
                    </View>
                    <View style={styles.resultFlowLine} />
                  </View>
                  <View style={styles.resultFlowPerson}>
                    <Image source={{ uri: activeOnboarding.newMemberAvatar }} style={styles.resultFlowAvatar} />
                    <Text style={styles.resultFlowName} numberOfLines={1}>{activeOnboarding.newMemberName}</Text>
                    <Text style={styles.resultFlowRole}>New Member</Text>
                  </View>
                </View>

                <View style={styles.resultBizcomCard}>
                  {activeOnboarding.bizComAvatar ? (
                    <Image source={{ uri: activeOnboarding.bizComAvatar }} style={styles.resultBizcomAvatar} />
                  ) : null}
                  <View style={styles.resultBizcomInfo}>
                    <Text style={styles.resultBizcomLabel}>Auto-Joined BizCom</Text>
                    <Text style={styles.resultBizcomName}>{activeOnboarding.bizComName}</Text>
                  </View>
                  <CheckCircle2 size={20} color={Colors.success} />
                </View>

                <View style={styles.messagePreview}>
                  <Mail size={14} color={Colors.navyDark} />
                  <Text style={styles.messagePreviewText}>{activeOnboarding.autoInviteMessage}</Text>
                </View>

                {activeOnboarding.bizComAutoInvite && (
                  <View style={styles.autoInviteResultCard}>
                    <View style={styles.autoInviteResultHeader}>
                      <Send size={12} color="#0891B2" />
                      <Text style={styles.autoInviteResultTitle}>BizCom Auto-Invite</Text>
                      <View style={styles.autoInviteResultStatusPill}>
                        <Text style={styles.autoInviteResultStatusText}>
                          {activeOnboarding.bizComAutoInvite.status === 'accepted' ? 'Accepted' : 'Sent'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.autoInviteResultDesc}>
                      Created at SMS send time from "{activeOnboarding.bizComAutoInvite.bizComName}" → delivered upon app download
                    </Text>
                    <View style={styles.autoInviteResultTimeline}>
                      <View style={styles.autoInviteTimelineStep}>
                        <View style={[styles.autoInviteTimelineDot, { backgroundColor: '#06B6D4' }]} />
                        <Text style={styles.autoInviteTimelineLabel}>Created with SMS</Text>
                      </View>
                      <View style={styles.autoInviteTimelineLine} />
                      <View style={styles.autoInviteTimelineStep}>
                        <View style={[styles.autoInviteTimelineDot, { backgroundColor: '#00B246' }]} />
                        <Text style={styles.autoInviteTimelineLabel}>Delivered in-app</Text>
                      </View>
                      <View style={styles.autoInviteTimelineLine} />
                      <View style={styles.autoInviteTimelineStep}>
                        <View style={[styles.autoInviteTimelineDot, { backgroundColor: '#22C55E' }]} />
                        <Text style={styles.autoInviteTimelineLabel}>Accepted</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.pointsAwardedRow}>
                  <View style={styles.pointsItem}>
                    <Gift size={14} color="#F59E0B" />
                    <Text style={styles.pointsItemText}>+25 pts</Text>
                    <Text style={styles.pointsItemLabel}>{activeOnboarding.newMemberName}</Text>
                  </View>
                  <View style={styles.pointsDivider} />
                  <View style={styles.pointsItem}>
                    <Zap size={14} color="#22C55E" />
                    <Text style={styles.pointsItemText}>+50 pts</Text>
                    <Text style={styles.pointsItemLabel}>{activeOnboarding.inviterName}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={resetSimulation}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>Run Another Simulation</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
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
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  introCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  introIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  introDesc: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 20,
    marginTop: 24,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 3,
    marginBottom: 12,
  },
  codesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  codeCardSelected: {
    borderColor: Colors.navyDark,
    backgroundColor: '#F0F3F8',
  },
  codeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  codeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  codeName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  codeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F3F8',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    letterSpacing: 0.3,
  },
  codeBizcom: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    marginTop: 3,
  },
  codeRight: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  codeStatus: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'capitalize' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  startSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  selectedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F3F8',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.navyDark,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.navyDark,
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  previewDetail: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 12,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  historySection: {
    marginTop: 8,
    paddingBottom: 20,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  historyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  historyInfo: {
    flex: 1,
    marginLeft: 10,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  historyDetail: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  historyTime: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  historyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingHeader: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  onboardingAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onboardingAvatarWrap: {
    position: 'relative' as const,
  },
  onboardingAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: Colors.navyDark,
  },
  newBadge: {
    position: 'absolute' as const,
    bottom: -3,
    right: -6,
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  onboardingMeta: {
    flex: 1,
    marginLeft: 14,
  },
  onboardingName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  onboardingPhone: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  onboardingCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F3F8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  onboardingCodeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.navyDark,
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 6,
  },
  eventsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineColumn: {
    width: 44,
    alignItems: 'center',
  },
  eventIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.borderLight,
    minHeight: 20,
  },
  eventCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginLeft: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  eventDescription: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  eventTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  eventTime: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
    alignItems: 'center',
  },
  resultIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.4,
    textAlign: 'center' as const,
  },
  resultDesc: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  resultSummary: {
    width: '100%',
    marginTop: 20,
  },
  resultSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  resultFlowPerson: {
    alignItems: 'center',
    width: 80,
  },
  resultFlowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  resultFlowName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  resultFlowRole: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  resultFlowArrow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultFlowLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#86EFAC',
  },
  resultFlowCodeChip: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resultFlowCodeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  resultBizcomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  resultBizcomAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  resultBizcomInfo: {
    flex: 1,
    marginLeft: 10,
  },
  resultBizcomLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  resultBizcomName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#166534',
    marginTop: 1,
  },
  messagePreview: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F8',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  messagePreviewText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 17,
  },
  pointsAwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 0,
  },
  pointsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
  },
  pointsItemText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#92400E',
  },
  pointsItemLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  pointsDivider: {
    width: 8,
  },
  doneBtn: {
    backgroundColor: Colors.navyDark,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  autoInviteResultCard: {
    backgroundColor: '#ECFEFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  autoInviteResultHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 6,
  },
  autoInviteResultTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#155E75',
    flex: 1,
  },
  autoInviteResultStatusPill: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoInviteResultStatusText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  autoInviteResultDesc: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#164E63',
    lineHeight: 16,
    marginBottom: 10,
  },
  autoInviteResultTimeline: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  autoInviteTimelineStep: {
    alignItems: 'center' as const,
    gap: 3,
  },
  autoInviteTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  autoInviteTimelineLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#0E7490',
  },
  autoInviteTimelineLine: {
    width: 24,
    height: 2,
    backgroundColor: '#A5F3FC',
    marginHorizontal: 4,
    marginBottom: 14,
  },
});

