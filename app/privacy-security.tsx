import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface, Switch, Divider, Dialog, Portal, Button } from 'react-native-paper';
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Eye,
  Activity,
  Sparkles,
  Download,
  Trash2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const PURPLE = '#1A5C35';

interface ToggleItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  defaultValue: boolean;
}

const PRIVACY_TOGGLES: ToggleItem[] = [
  {
    id: 'profile_visibility',
    title: 'Profile Visibility',
    description: 'Make my profile visible to businesses',
    icon: Eye,
    iconColor: '#3B82F6',
    defaultValue: true,
  },
  {
    id: 'activity_status',
    title: 'Activity Status',
    description: 'Show when I was last active',
    icon: Activity,
    iconColor: '#22C55E',
    defaultValue: true,
  },
  {
    id: 'personalised_recs',
    title: 'Personalised Recommendations',
    description: 'Allow TouchPoint to use my activity for recommendations',
    icon: Sparkles,
    iconColor: '#F59E0B',
    defaultValue: true,
  },
];

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const [privacyPrefs, setPrivacyPrefs] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const t of PRIVACY_TOGGLES) {
      defaults[t.id] = t.defaultValue;
    }
    return defaults;
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [show2FADialog, setShow2FADialog] = useState<boolean>(false);

  const togglePrivacy = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrivacyPrefs(prev => ({ ...prev, [id]: !prev[id] }));
    console.log('[PrivacySecurity] Toggled:', id);
  }, []);

  const handle2FAToggle = useCallback(() => {
    if (!twoFactorEnabled) {
      setShow2FADialog(true);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTwoFactorEnabled(false);
      console.log('[PrivacySecurity] 2FA disabled');
    }
  }, [twoFactorEnabled]);

  const confirm2FA = useCallback(() => {
    setShow2FADialog(false);
    setTwoFactorEnabled(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[PrivacySecurity] 2FA enabled');
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="privacy-security-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Privacy & Security</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>Account Security</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/change-password' as any)}
            activeOpacity={0.7}
            testID="privacy-change-password"
          >
            <View style={[styles.iconWrap, { backgroundColor: '#00B246' + '14' }]}>
              <KeyRound size={18} color="#00B246" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Change Password</Text>
              <Text style={styles.listDesc}>Update your account password</Text>
            </View>
            <ChevronRight size={18} color="#A0AABB" />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.listRow}
            onPress={handle2FAToggle}
            activeOpacity={0.7}
            testID="privacy-2fa-toggle"
          >
            <View style={[styles.iconWrap, { backgroundColor: '#0D9488' + '14' }]}>
              <ShieldCheck size={18} color="#0D9488" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Two-Factor Authentication</Text>
              <Text style={styles.listDesc}>Extra security on every login</Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={handle2FAToggle}
              color={PURPLE}
              testID="privacy-2fa-switch"
            />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/active-sessions' as any)}
            activeOpacity={0.7}
            testID="privacy-active-sessions"
          >
            <View style={[styles.iconWrap, { backgroundColor: '#3B82F6' + '14' }]}>
              <Smartphone size={18} color="#3B82F6" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Active Sessions</Text>
              <Text style={styles.listDesc}>Manage your logged-in devices</Text>
            </View>
            <ChevronRight size={18} color="#A0AABB" />
          </TouchableOpacity>
        </Surface>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          {PRIVACY_TOGGLES.map((toggle, idx) => {
            const Icon = toggle.icon;
            return (
              <React.Fragment key={toggle.id}>
                {idx > 0 && <Divider style={styles.divider} />}
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => togglePrivacy(toggle.id)}
                  activeOpacity={0.7}
                  testID={`privacy-toggle-${toggle.id}`}
                >
                  <View style={[styles.iconWrap, { backgroundColor: toggle.iconColor + '14' }]}>
                    <Icon size={18} color={toggle.iconColor} />
                  </View>
                  <View style={styles.listTextWrap}>
                    <Text style={styles.listTitle}>{toggle.title}</Text>
                    <Text style={styles.listDesc}>{toggle.description}</Text>
                  </View>
                  <Switch
                    value={privacyPrefs[toggle.id]}
                    onValueChange={() => togglePrivacy(toggle.id)}
                    color={PURPLE}
                    testID={`privacy-switch-${toggle.id}`}
                  />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </Surface>

        <Text style={styles.sectionTitle}>Data</Text>
        <Surface style={styles.sectionCard} elevation={1}>
          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/download-data' as any)}
            activeOpacity={0.7}
            testID="privacy-download-data"
          >
            <View style={[styles.iconWrap, { backgroundColor: '#00B246' + '14' }]}>
              <Download size={18} color="#00B246" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Download My Data</Text>
              <Text style={styles.listDesc}>Request a copy of your personal data</Text>
            </View>
            <ChevronRight size={18} color="#A0AABB" />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.listRow}
            onPress={() => router.push('/delete-account' as any)}
            activeOpacity={0.7}
            testID="privacy-delete-account"
          >
            <View style={[styles.iconWrap, { backgroundColor: '#ED4956' + '14' }]}>
              <Trash2 size={18} color="#ED4956" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={[styles.listTitle, { color: '#ED4956' }]}>Delete Account</Text>
              <Text style={styles.listDesc}>Permanently remove your account</Text>
            </View>
            <ChevronRight size={18} color="#A0AABB" />
          </TouchableOpacity>
        </Surface>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={show2FADialog}
          onDismiss={() => setShow2FADialog(false)}
          style={styles.dialog}
        >
          <Dialog.Icon icon="shield-check" color={PURPLE} size={32} />
          <Dialog.Title style={styles.dialogTitle}>Enable Two-Factor Authentication?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>
              A verification code will be sent to your phone on every login. This adds an extra layer of security to your account.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setShow2FADialog(false)}
              textColor="#6B7A8D"
              testID="2fa-cancel"
            >
              Cancel
            </Button>
            <Button
              onPress={confirm2FA}
              textColor={PURPLE}
              testID="2fa-confirm"
            >
              Enable
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
  listRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  listTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1B2A4A',
    marginBottom: 2,
  },
  listDesc: {
    fontSize: 12,
    color: '#6B7A8D',
    lineHeight: 16,
  },
  divider: {
    marginHorizontal: 16,
    backgroundColor: '#F0EDF5',
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
