import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Button, Divider, List, Dialog, Portal, Paragraph } from 'react-native-paper';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Star,
  Gift,
  Store,
  ChevronRight,
  UserPen,
  Bookmark,
  Bell,
  Home,
  Newspaper,
  Shield,
  CircleHelp,
  LogOut,
  Briefcase,
  Users,
  FileText,
  DollarSign,
  MessageSquare,
  Users2,
  BarChart3,
  CreditCard,
  QrCode,
  ClipboardList,
  Sparkles,
  Store as StoreCheck,
  HandHeart,
  ArrowUpCircle,
  X as XIcon,
} from 'lucide-react-native';
import { Modal as RNModal } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BadgeCard, BadgeDetailModal } from '@/components/badges';
import { getBadgeForPoints, NO_BADGE_ICON } from '@/config/badgeTiers';

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#00B246';
const PURPLE_DARK = '#1A5C35';
const PURPLE_SURFACE = '#F3F0FF';
const PURPLE_MUTED = '#E8F5EE';

export default function UserProfileScreen() {
  const router = useRouter();
  const canGoBack = ((): boolean => {
    try {
      return typeof router.canGoBack === 'function' ? router.canGoBack() : false;
    } catch (e) {
      console.log('[UserProfile] canGoBack error', e);
      return false;
    }
  })();
  const { authUser, accountType, logout } = useAuth();

  const [showLogoutDialog, setShowLogoutDialog] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [showBadgeModal, setShowBadgeModal] = useState<boolean>(false);
  const [switchSheetStep, setSwitchSheetStep] = useState<0 | 1 | 2>(0);
  const [snackbar, setSnackbar] = useState<string>('');

  // Stub consts — replace when business module is wired
  const isGoodwillBusiness = false;
  const ownBusinessKey = 'self';
  const businessTypeSettings = { businessType: 'goodwill' as const };
  const setLocalBusinessTypeSettings = (_: typeof businessTypeSettings) => {};

  const isBusinessActive = accountType === 'business';
  const currentAvatar = authUser?.avatar ?? null;
  const currentName = authUser?.name ?? authUser?.email ?? '';
  const currentEmail = authUser?.email ?? '';

  const memberSince = isBusinessActive ? 'Business since March 2025' : 'Member since January 2025';

  const personalBadge = getBadgeForPoints(0);
  const personalBadgeIcon = personalBadge?.icon ?? NO_BADGE_ICON;
  const personalBadgeColor = personalBadge?.colors.text ?? '#A8B0BA';

  const personalStats = [
    { label: 'Total Points', value: (0).toLocaleString(), icon: Star, color: '#F59E0B' },
    { label: 'Subscribed', value: '7', icon: Store, color: '#0D9488' },
    { label: 'Redeemed', value: '12', icon: Gift, color: '#EC4899' },
    { label: 'Badge', value: personalBadge ? personalBadge.label : '—', icon: personalBadgeIcon, color: personalBadgeColor },
  ];

  const businessStats = [
    { label: 'Subscribers', value: '248', icon: Users, color: '#3B82F6' },
    { label: 'Posts', value: '36', icon: FileText, color: '#00B246' },
    { label: 'Revenue', value: '$4.2k', icon: DollarSign, color: '#22C55E' },
  ];

  const stats = isBusinessActive ? businessStats : personalStats;

  const handleLogout = useCallback(() => {
    setShowLogoutDialog(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    setShowLogoutDialog(false);
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  }, [logout]);

  return (
    <View style={styles.root}>
      <View style={styles.headerBg}>
        <View style={styles.headerBgOverlay} />
      </View>

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          {canGoBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
              testID="user-profile-back"
            >
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <Text style={styles.navTitle}>My Profile</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
        <View style={styles.avatarSection}>
          <Surface style={styles.avatarRing} elevation={3}>
            <Image
              source={{ uri: currentAvatar ?? '' }}
              style={styles.avatarImage}
              testID="user-profile-avatar"
            />
          </Surface>
        </View>

        <View style={styles.userInfoSection}>
          <Text style={styles.userName} testID="user-profile-name">
            {currentName}
          </Text>
          <Text style={styles.userEmail} testID="user-profile-email">
            {currentEmail}
          </Text>
          <View style={[styles.memberBadge, isBusinessActive && styles.memberBadgeBusiness]}>
            <Text style={[styles.memberBadgeText, isBusinessActive && styles.memberBadgeTextBusiness]}>
              {memberSince}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Surface key={`${isBusinessActive ? 'b' : 'p'}-${idx}`} style={styles.statCard} elevation={1}>
                <View style={[styles.statIconWrap, { backgroundColor: stat.color + '14' }]}>
                  <Icon size={18} color={stat.color} />
                </View>
                <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Surface>
            );
          })}
        </View>

        {!isBusinessActive && (
          <BadgeCard
            points={0}
            onPress={() => setShowBadgeModal(true)}
            testID="profile-badge-card"
          />
        )}

        <Surface style={styles.settingsCard} elevation={1}>
          <Text style={styles.settingsSectionTitle}>Settings</Text>

          {isBusinessActive ? (
            <>
              {false && (isGoodwillBusiness ? (
                <>
                  <View style={styles.goodwillBadgeWrap} testID="goodwill-business-badge">
                    <View style={styles.goodwillBadgeChip}>
                      <HandHeart size={16} color="#047857" />
                      <Text style={styles.goodwillBadgeChipText}>Goodwill Business</Text>
                    </View>
                    <Text style={styles.goodwillBadgeSub}>
                      This business operates without a points or rewards system.
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.switchTypeRow}
                    onPress={() => setSwitchSheetStep(1)}
                    testID="switch-to-points-row"
                  >
                    <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                      <ArrowUpCircle size={18} color={PURPLE} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemTitle}>Switch to Points & Rewards</Text>
                      <Text style={styles.listItemDesc}>Upgrade to offer points, reward tiers, and a rewards catalog.</Text>
                    </View>
                    <ChevronRight size={18} color="#A0AABB" />
                  </TouchableOpacity>
                  <Divider style={styles.divider} />
                </>
              ) : null)}
              <List.Item
                title="Business Settings"
                description="Manage your business profile"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                    <Briefcase size={18} color={PURPLE} />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/create-business-profile' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-business"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Analytics & Reports"
                description="View performance and customer insights"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: '#EC4899' + '12' }]}>
                    <BarChart3 size={18} color="#EC4899" />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/business-analytics' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-analytics"
              />
              {!isGoodwillBusiness ? (
                <>
                  <Divider style={styles.divider} />
                  <List.Item
                    title="Reward Configuration"
                    description="Set up tiers, rewards and points"
                    left={() => (
                      <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                        <Gift size={18} color={PURPLE} />
                      </View>
                    )}
                    right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                    onPress={() => router.push('/reward-configuration' as any)}
                    style={styles.listItem}
                    titleStyle={styles.listItemTitle}
                    descriptionStyle={styles.listItemDesc}
                    testID="settings-reward-configuration"
                  />
                  <Divider style={styles.divider} />
                  <List.Item
                    title="Scan Customer Coupon"
                description="Redeem customer rewards in-store"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: '#10B981' + '15' }]}>
                    <QrCode size={18} color="#10B981" />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                    onPress={() => router.push('/scan-coupon' as any)}
                    style={styles.listItem}
                    titleStyle={styles.listItemTitle}
                    descriptionStyle={styles.listItemDesc}
                    testID="settings-scan-coupon"
                  />
                </>
              ) : null}
              <Divider style={styles.divider} />
              <List.Item
                title="Manage Subscription"
                description="Your plan, billing and invoices"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: '#22C55E' + '12' }]}>
                    <CreditCard size={18} color="#22C55E" />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/manage-subscription' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-manage-subscription"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Manage Content"
                description="Offers, Events & Posts"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                    <ClipboardList size={18} color={PURPLE} />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/manage-content' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-manage-content"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="AI Studio"
                description="Generate offers, events & posts with AI"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                    <Sparkles size={18} color={PURPLE} />
                  </View>
                )}
                right={() => (
                  <View style={styles.aiStudioRight}>
                    <View style={styles.betaBadge}>
                      <Text style={styles.betaBadgeText}>Beta</Text>
                    </View>
                    <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />
                  </View>
                )}
                onPress={() => router.push('/ai-studio' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-ai-studio"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Messages"
                description="Your conversations with businesses"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                    <MessageSquare size={18} color={PURPLE} />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/(tabs)/messages' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-messages"
              />
              <Divider style={styles.divider} />
            </>
          ) : (
            <>
              <List.Item
                title="Bookmarks"
                description="Favourites, offers & events"
                left={() => (
                  <View style={[styles.settingsIconSmall, { backgroundColor: '#E8F5EE' }]}>
                    <Bookmark size={16} color="#1A5C35" />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/saved-activity' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-saved-activity"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="My Subscriptions"
                description="Manage businesses you follow"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                    <StoreCheck size={18} color={PURPLE} />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/subscribed-businesses' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-my-subscriptions"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="New User Feed"
                description="Discover the latest activity"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                    <Newspaper size={18} color={PURPLE} />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/feed-preview/new-user-feed' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-new-user-feed"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Trusted Friends"
                description="Friends you've brought into TouchPoint"
                left={() => (
                  <View style={[styles.settingsIconSmall, { backgroundColor: '#E8F5EE' }]}>
                    <Users2 size={16} color="#00B246" />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/my-referrals' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-trusted-friends"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Create Business Profile"
                description="Register your business on TouchPoint"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: '#3B82F6' + '12' }]}>
                    <Briefcase size={18} color="#3B82F6" />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/create-business-profile' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-create-business"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Edit Profile"
                description="Update your personal details"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                    <UserPen size={18} color={PURPLE} />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/edit-profile' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-edit-profile"
              />
              <Divider style={styles.divider} />
              <List.Item
                title="Messages"
                description="Your conversations with businesses"
                left={() => (
                  <View style={[styles.settingsIcon, { backgroundColor: PURPLE + '12' }]}>
                    <MessageSquare size={18} color={PURPLE} />
                  </View>
                )}
                right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
                onPress={() => router.push('/(tabs)/messages' as any)}
                style={styles.listItem}
                titleStyle={styles.listItemTitle}
                descriptionStyle={styles.listItemDesc}
                testID="settings-messages"
              />
              <Divider style={styles.divider} />
            </>
          )}

          <List.Item
            title="Notification Preferences"
            description="Manage alerts & push notifications"
            left={() => (
              <View style={[styles.settingsIcon, { backgroundColor: '#F59E0B' + '12' }]}>
                <Bell size={18} color="#F59E0B" />
              </View>
            )}
            right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
            onPress={() => router.push('/notification-preferences' as any)}
            style={styles.listItem}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDesc}
            testID="settings-notifications"
          />
          <Divider style={styles.divider} />

          <List.Item
            title="Privacy & Security"
            description="Manage your data & account safety"
            left={() => (
              <View style={[styles.settingsIcon, { backgroundColor: '#0D9488' + '12' }]}>
                <Shield size={18} color="#0D9488" />
              </View>
            )}
            right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
            onPress={() => router.push('/privacy-security' as any)}
            style={styles.listItem}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDesc}
            testID="settings-privacy"
          />
          <Divider style={styles.divider} />

          <List.Item
            title="Help & Support"
            description="FAQs, contact us, report a problem"
            left={() => (
              <View style={[styles.settingsIcon, { backgroundColor: '#3B82F6' + '12' }]}>
                <CircleHelp size={18} color="#3B82F6" />
              </View>
            )}
            right={() => <ChevronRight size={18} color="#A0AABB" style={styles.chevron} />}
            onPress={() => router.push('/help-support' as any)}
            style={styles.listItem}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDesc}
            testID="settings-help"
          />
          <Divider style={styles.divider} />

          <List.Item
            title="Logout"
            description="Sign out of your account"
            left={() => (
              <View style={[styles.settingsIcon, { backgroundColor: '#ED4956' + '12' }]}>
                <LogOut size={18} color="#ED4956" />
              </View>
            )}
            onPress={handleLogout}
            style={styles.listItem}
            titleStyle={[styles.listItemTitle, { color: '#ED4956' }]}
            descriptionStyle={styles.listItemDesc}
            testID="settings-logout"
          />
        </Surface>

        <Text style={styles.footerText}>TouchPoint v1.0.0</Text>
        </View>
      </ScrollView>

      <BadgeDetailModal
        visible={showBadgeModal}
        onDismiss={() => setShowBadgeModal(false)}
        currentPoints={0}
      />

      <Portal>
        <Dialog
          visible={showLogoutDialog}
          onDismiss={() => setShowLogoutDialog(false)}
          style={styles.logoutDialog}
        >
          <Dialog.Title style={styles.logoutDialogTitle}>Log out?</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.logoutDialogBody}>
              You will need to sign in again to access your points and rewards.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.logoutDialogActions}>
            <Button
              onPress={() => setShowLogoutDialog(false)}
              textColor="#6B7A8D"
              testID="logout-cancel"
            >
              Cancel
            </Button>
            <Button
              onPress={confirmLogout}
              textColor="#ED4956"
              disabled={loggingOut}
              testID="logout-confirm"
            >
              {loggingOut ? 'Logging out…' : 'Log Out'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {false && (
        <RNModal
          visible={switchSheetStep > 0}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setSwitchSheetStep(0)}
        >
          <View style={styles.switchSheetOverlay}>
            <TouchableOpacity style={styles.switchSheetBackdrop} activeOpacity={1} onPress={() => setSwitchSheetStep(0)} />
            <View style={styles.switchSheetCard}>
              <TouchableOpacity
                style={styles.switchSheetClose}
                onPress={() => setSwitchSheetStep(0)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID="switch-sheet-close"
              >
                <XIcon size={18} color="#6B7A8D" />
              </TouchableOpacity>
              <View style={styles.switchSheetIconWrap}>
                {switchSheetStep === 1 ? (
                  <ArrowUpCircle size={28} color={PURPLE} />
                ) : (
                  <Gift size={28} color={PURPLE} />
                )}
              </View>
              {switchSheetStep === 1 ? (
                <>
                  <Text style={styles.switchSheetTitle}>Switch to Points & Rewards Business?</Text>
                  <Text style={styles.switchSheetBody}>
                    Once switched, you can set up a full loyalty program for your members. This includes points, reward tiers, and a rewards catalog.
                  </Text>
                  <View style={styles.switchSheetActions}>
                    <TouchableOpacity
                      style={[styles.switchSheetBtn, styles.switchSheetBtnGhost]}
                      onPress={() => setSwitchSheetStep(0)}
                      activeOpacity={0.85}
                      testID="switch-sheet-cancel"
                    >
                      <Text style={styles.switchSheetBtnGhostText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.switchSheetBtn, styles.switchSheetBtnPrimary]}
                      onPress={() => setSwitchSheetStep(2)}
                      activeOpacity={0.85}
                      testID="switch-sheet-continue"
                    >
                      <Text style={styles.switchSheetBtnPrimaryText}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.switchSheetTitle}>Let&apos;s set up your rewards program</Text>
                  <Text style={styles.switchSheetBody}>
                    Before your members can start earning, you&apos;ll need to configure:
                  </Text>
                  <View style={styles.switchSheetList}>
                    <Text style={styles.switchSheetListItem}>🔹 Points rules — how members earn points</Text>
                    <Text style={styles.switchSheetListItem}>🔹 Reward tiers — Silver, Gold, Platinum etc.</Text>
                    <Text style={styles.switchSheetListItem}>🔹 Rewards catalog — what members can redeem</Text>
                  </View>
                  <View style={styles.switchSheetActions}>
                    <TouchableOpacity
                      style={[styles.switchSheetBtn, styles.switchSheetBtnGhost]}
                      onPress={() => {
                        const next = { ...businessTypeSettings, businessType: 'points_based' as const };
                        setLocalBusinessTypeSettings(next);
                        setSwitchSheetStep(0);
                        setSnackbar('Switched to Points & Rewards! Set up your rewards program anytime from Settings.');
                      }}
                      activeOpacity={0.85}
                      testID="switch-sheet-later"
                    >
                      <Text style={styles.switchSheetBtnGhostText}>Do It Later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.switchSheetBtn, styles.switchSheetBtnPrimary]}
                      onPress={() => {
                        const next = { ...businessTypeSettings, businessType: 'points_based' as const };
                        setLocalBusinessTypeSettings(next);
                        setSwitchSheetStep(0);
                        router.push('/reward-configuration' as any);
                      }}
                      activeOpacity={0.85}
                      testID="switch-sheet-setup"
                    >
                      <Text style={styles.switchSheetBtnPrimaryText}>Set Up Now</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </RNModal>
      )}

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={4000}
        style={styles.snackbar}
      >
        {snackbar}
      </Snackbar>

    </View>
  );
}

const styles = StyleSheet.create({
  goodwillBadgeWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  goodwillBadgeChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    alignSelf: 'flex-start' as const,
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goodwillBadgeChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#047857',
    letterSpacing: 0.1,
  },
  goodwillBadgeSub: {
    fontSize: 12.5,
    color: '#5A6B7A',
    marginTop: 8,
    lineHeight: 17,
  },
  switchTypeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  switchSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end' as const,
  },
  switchSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  switchSheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 30,
  },
  switchSheetClose: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    padding: 6,
  },
  switchSheetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F0FF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  switchSheetTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B1B2F',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  switchSheetBody: {
    fontSize: 14,
    color: '#5A6B7A',
    lineHeight: 20,
    marginBottom: 14,
  },
  switchSheetList: {
    marginBottom: 18,
    gap: 6,
  },
  switchSheetListItem: {
    fontSize: 13.5,
    color: '#3A4655',
    lineHeight: 19,
  },
  switchSheetActions: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 4,
  },
  switchSheetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  switchSheetBtnGhost: {
    backgroundColor: '#F1EFF7',
  },
  switchSheetBtnGhostText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A5C35',
  },
  switchSheetBtnPrimary: {
    backgroundColor: PURPLE,
  },
  switchSheetBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  snackbar: {
    backgroundColor: '#1B1B2F',
  },
  root: {
    flex: 1,
    backgroundColor: '#F6F5FA',
  },
  headerBg: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: PURPLE,
  },
  headerBgOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: PURPLE_DARK,
    opacity: 0.25,
  },
  safeTop: {
    zIndex: 10,
  },
  navRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center' as const,
    paddingTop: 8,
    paddingBottom: 0,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#fff',
    padding: 4,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  userInfoSection: {
    alignItems: 'center' as const,
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 100,
  },
  switcherWrap: {
    backgroundColor: '#F6F5FA',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1B2A4A',
    letterSpacing: 0.2,
  },
  chevronDownWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EDEBF4',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7A8D',
    marginTop: 4,
  },
  memberBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: PURPLE_MUTED,
    borderRadius: 20,
  },
  memberBadgeBusiness: {
    backgroundColor: '#E0F2FE',
  },
  memberBadgeText: {
    fontSize: 12,
    color: PURPLE,
    fontWeight: '600' as const,
  },
  memberBadgeTextBusiness: {
    color: '#0369A1',
  },
  dropdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute' as const,
    top: 240,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
    borderWidth: 1,
    borderColor: '#F0EDF5',
  },
  dropdownTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },
  dropdownRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  dropdownRowActive: {
    backgroundColor: PURPLE_SURFACE,
  },
  dropdownAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  dropdownInfo: {
    flex: 1,
    marginLeft: 10,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B2A4A',
    letterSpacing: -0.1,
  },
  dropdownBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
    marginTop: 3,
  },
  badgePersonal: {
    backgroundColor: '#E6FAF5',
  },
  badgeBusiness: {
    backgroundColor: '#1B2A4A',
  },
  dropdownBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  badgeTextPersonal: {
    color: '#0D9488',
  },
  badgeTextBusiness: {
    color: '#fff',
  },
  dropdownCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PURPLE + '14',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: 16,
    gap: 10,
    marginTop: -4,
    marginBottom: 16,
  },
  referralStrip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: '#E8F5EE',
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  referralStripIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(124,58,237,0.14)',
  },
  referralStripTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#00B246',
  },
  referralStripSubtitle: {
    fontSize: 10,
    color: '#1A5C35',
    marginTop: 1,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center' as const,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B2A4A',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#6B7A8D',
    marginTop: 2,
    textAlign: 'center' as const,
  },
  settingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 8,
    overflow: 'hidden' as const,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6B7A8D',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  feedSectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#5C5F72',
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 4,
  },
  settingsIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 13,
  },
  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 8,
  },
  listItem: {
    paddingVertical: 6,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1B2A4A',
  },
  listItemDesc: {
    fontSize: 12,
    color: '#6B7A8D',
    marginTop: 1,
  },
  chevron: {
    alignSelf: 'center' as const,
    marginRight: 8,
  },
  aiStudioRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  betaBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  betaBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  divider: {
    marginHorizontal: 20,
    backgroundColor: '#F0EDF5',
  },
  footerText: {
    textAlign: 'center' as const,
    fontSize: 12,
    color: '#A0AABB',
    marginTop: 8,
    marginBottom: 20,
  },
  logoutDialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  logoutDialogTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B2A4A',
  },
  logoutDialogBody: {
    fontSize: 14,
    color: '#6B7A8D',
    lineHeight: 20,
  },
  logoutDialogActions: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
