import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Switch, Divider, Dialog, Portal, Button } from 'react-native-paper';
import {
  ArrowLeft,
  Megaphone,
  CalendarDays,
  BadgePercent,
  Radio,
  Coins,
  TrendingUp,
  Timer,
  CheckCircle2,
  UserPlus,
  CreditCard,
  Smartphone,
  Mail,
  MessageSquare,
  BellOff,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const PURPLE = '#1A5C35';
const PURPLE_LIGHT = '#F3F0FF';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  defaultValue: boolean;
  icon: React.ElementType;
  iconColor: string;
}

interface NotificationSection {
  id: string;
  title: string;
  settings: NotificationSetting[];
}

const SECTIONS: NotificationSection[] = [
  {
    id: 'businesses',
    title: 'From Businesses',
    settings: [
      { id: 'new_offers', title: 'New Offers & Promotions', description: 'Get notified when businesses post new deals', defaultValue: true, icon: Megaphone, iconColor: '#EC4899' },
      { id: 'new_events', title: 'New Events', description: 'Stay updated on upcoming events near you', defaultValue: true, icon: CalendarDays, iconColor: '#3B82F6' },
      { id: 'subscriber_deals', title: 'Subscriber-only Deals', description: 'Exclusive offers for your subscribed businesses', defaultValue: true, icon: BadgePercent, iconColor: '#F59E0B' },
      { id: 'biz_announcements', title: 'Business Announcements', description: 'General updates from businesses you follow', defaultValue: false, icon: Radio, iconColor: '#6B7280' },
    ],
  },
  {
    id: 'rewards',
    title: 'Rewards & Points',
    settings: [
      { id: 'points_earned', title: 'Points Earned', description: 'Notify when you earn points from a purchase', defaultValue: true, icon: Coins, iconColor: '#F59E0B' },
      { id: 'tier_upgrade', title: 'Reward Tier Upgrade', description: 'Celebrate when you reach a new reward tier', defaultValue: true, icon: TrendingUp, iconColor: '#22C55E' },
      { id: 'coupon_expiring', title: 'Coupon About to Expire', description: 'Reminder before your coupon expires', defaultValue: true, icon: Timer, iconColor: '#EF4444' },
      { id: 'redemption_confirmed', title: 'Redemption Confirmed', description: 'Confirmation when you successfully redeem a reward', defaultValue: true, icon: CheckCircle2, iconColor: '#0D9488' },
    ],
  },
  {
    id: 'referrals',
    title: 'Referrals',
    settings: [
      { id: 'friend_joined', title: 'Friend Joined via Your Referral', description: 'Know when a friend signs up using your link', defaultValue: true, icon: UserPlus, iconColor: '#00B246' },
      { id: 'points_credited', title: 'Points Credited After Purchase', description: 'Earn referral points when your friend shops', defaultValue: true, icon: CreditCard, iconColor: '#0D9488' },
    ],
  },
  {
    id: 'general',
    title: 'General',
    settings: [
      { id: 'app_updates', title: 'App Updates & Announcements', description: 'New features and important app changes', defaultValue: false, icon: Smartphone, iconColor: '#00B246' },
      { id: 'email_notifs', title: 'Email Notifications', description: 'Receive digest emails for important activity', defaultValue: true, icon: Mail, iconColor: '#3B82F6' },
      { id: 'sms_notifs', title: 'SMS Notifications', description: 'Get text messages for urgent alerts', defaultValue: false, icon: MessageSquare, iconColor: '#22C55E' },
    ],
  },
];

function buildDefaults(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const section of SECTIONS) {
    for (const setting of section.settings) {
      defaults[setting.id] = setting.defaultValue;
    }
  }
  return defaults;
}

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(buildDefaults);
  const [showTurnOffDialog, setShowTurnOffDialog] = useState<boolean>(false);

  const togglePref = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrefs(prev => ({ ...prev, [id]: !prev[id] }));
    console.log('[NotifPrefs] Toggled:', id);
  }, []);

  const turnOffAll = useCallback(() => {
    setShowTurnOffDialog(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setPrefs(prev => {
      const updated: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) {
        updated[key] = false;
      }
      return updated;
    });
    console.log('[NotifPrefs] All notifications turned off');
  }, []);

  const anyEnabled = Object.values(prefs).some(v => v);

  return (
    <View style={styles.root}>
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="notif-prefs-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Notifications</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SECTIONS.map((section, sIdx) => (
          <View key={section.id}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Surface style={styles.sectionCard} elevation={1}>
              {section.settings.map((setting, idx) => {
                const Icon = setting.icon;
                return (
                  <React.Fragment key={setting.id}>
                    {idx > 0 && <Divider style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.settingRow}
                      onPress={() => togglePref(setting.id)}
                      activeOpacity={0.7}
                      testID={`notif-toggle-${setting.id}`}
                    >
                      <View style={[styles.settingIconWrap, { backgroundColor: setting.iconColor + '14' }]}>
                        <Icon size={18} color={setting.iconColor} />
                      </View>
                      <View style={styles.settingTextWrap}>
                        <Text style={styles.settingTitle}>{setting.title}</Text>
                        <Text style={styles.settingDesc}>{setting.description}</Text>
                      </View>
                      <Switch
                        value={prefs[setting.id]}
                        onValueChange={() => togglePref(setting.id)}
                        color={PURPLE}
                        testID={`notif-switch-${setting.id}`}
                      />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </Surface>
          </View>
        ))}

        {anyEnabled && (
          <TouchableOpacity
            style={styles.turnOffAllBtn}
            onPress={() => setShowTurnOffDialog(true)}
            activeOpacity={0.7}
            testID="turn-off-all-button"
          >
            <BellOff size={16} color="#ED4956" />
            <Text style={styles.turnOffAllText}>Turn Off All Notifications</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={showTurnOffDialog}
          onDismiss={() => setShowTurnOffDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Icon icon="bell-off" color="#ED4956" size={32} />
          <Dialog.Title style={styles.dialogTitle}>Turn off all notifications?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>
              This will disable all notifications. You won't receive any alerts until you turn them back on individually.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setShowTurnOffDialog(false)}
              textColor="#6B7A8D"
              testID="turn-off-cancel"
            >
              Cancel
            </Button>
            <Button
              onPress={turnOffAll}
              textColor="#ED4956"
              testID="turn-off-confirm"
            >
              Turn Off All
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F5FA',
  },
  headerBg: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: PURPLE,
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
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#6B7A8D',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden' as const,
  },
  settingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  settingTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1B2A4A',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#6B7A8D',
    lineHeight: 16,
  },
  divider: {
    marginHorizontal: 16,
    backgroundColor: '#F0EDF5',
  },
  turnOffAllBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 28,
    paddingVertical: 12,
    gap: 8,
  },
  turnOffAllText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ED4956',
  },
  bottomSpacer: {
    height: 20,
  },
  dialog: {
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  dialogTitle: {
    textAlign: 'center' as const,
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B2A4A',
  },
  dialogBody: {
    fontSize: 14,
    color: '#6B7A8D',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  dialogActions: {
    justifyContent: 'center' as const,
    paddingBottom: 8,
  },
});
