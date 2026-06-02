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
import { Surface, Button, Divider } from 'react-native-paper';
import {
  ArrowLeft,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Clock,
  ShieldCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const PURPLE = '#1A5C35';
const BG = '#F6F5FA';

interface Session {
  id: string;
  deviceName: string;
  deviceType: 'phone' | 'desktop' | 'tablet';
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const MOCK_SESSIONS: Session[] = [
  {
    id: '1',
    deviceName: 'iPhone 15 Pro',
    deviceType: 'phone',
    location: 'London, UK',
    lastActive: 'Active now',
    isCurrent: true,
  },
  {
    id: '2',
    deviceName: 'MacBook Pro',
    deviceType: 'desktop',
    location: 'London, UK',
    lastActive: '2 hours ago',
    isCurrent: false,
  },
  {
    id: '3',
    deviceName: 'iPad Air',
    deviceType: 'tablet',
    location: 'Manchester, UK',
    lastActive: '3 days ago',
    isCurrent: false,
  },
  {
    id: '4',
    deviceName: 'Samsung Galaxy S24',
    deviceType: 'phone',
    location: 'Birmingham, UK',
    lastActive: '1 week ago',
    isCurrent: false,
  },
];

function DeviceIcon({ type, isCurrent }: { type: Session['deviceType']; isCurrent: boolean }) {
  const color = isCurrent ? PURPLE : '#6B7A8D';
  if (type === 'desktop') return <Monitor size={20} color={color} />;
  if (type === 'tablet') return <Tablet size={20} color={color} />;
  return <Smartphone size={20} color={color} />;
}

export default function ActiveSessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);

  const handleSignOut = useCallback((session: Session) => {
    Alert.alert(
      'Sign Out Device',
      `Sign out from "${session.deviceName}" in ${session.location}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSessions(prev => prev.filter(s => s.id !== session.id));
            console.log('[ActiveSessions] Signed out device:', session.deviceName);
          },
        },
      ]
    );
  }, []);

  const currentSession = sessions.find(s => s.isCurrent);
  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <View style={styles.root}>
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            testID="active-sessions-back"
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Active Sessions</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {currentSession && (
          <>
            <Text style={styles.sectionTitle}>Current Session</Text>
            <Surface style={styles.sessionCard} elevation={1}>
              <View style={styles.sessionRow}>
                <View style={[styles.deviceIconWrap, { backgroundColor: PURPLE + '14' }]}>
                  <DeviceIcon type={currentSession.deviceType} isCurrent={true} />
                </View>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionNameRow}>
                    <Text style={styles.sessionName}>{currentSession.deviceName}</Text>
                    <View style={styles.currentBadge}>
                      <ShieldCheck size={12} color={PURPLE} />
                      <Text style={styles.currentBadgeText}>This device</Text>
                    </View>
                  </View>
                  <View style={styles.sessionMeta}>
                    <MapPin size={12} color="#6B7A8D" />
                    <Text style={styles.sessionMetaText}>{currentSession.location}</Text>
                  </View>
                  <View style={styles.sessionMeta}>
                    <Clock size={12} color="#22C55E" />
                    <Text style={[styles.sessionMetaText, { color: '#22C55E' }]}>
                      {currentSession.lastActive}
                    </Text>
                  </View>
                </View>
              </View>
            </Surface>
          </>
        )}

        {otherSessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Other Devices</Text>
            <Surface style={styles.sessionCard} elevation={1}>
              {otherSessions.map((session, idx) => (
                <React.Fragment key={session.id}>
                  {idx > 0 && <Divider style={styles.divider} />}
                  <View style={styles.sessionRow}>
                    <View style={[styles.deviceIconWrap, { backgroundColor: '#6B7A8D' + '14' }]}>
                      <DeviceIcon type={session.deviceType} isCurrent={false} />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName}>{session.deviceName}</Text>
                      <View style={styles.sessionMeta}>
                        <MapPin size={12} color="#6B7A8D" />
                        <Text style={styles.sessionMetaText}>{session.location}</Text>
                      </View>
                      <View style={styles.sessionMeta}>
                        <Clock size={12} color="#6B7A8D" />
                        <Text style={styles.sessionMetaText}>{session.lastActive}</Text>
                      </View>
                    </View>
                    <Button
                      mode="outlined"
                      onPress={() => handleSignOut(session)}
                      style={styles.signOutBtn}
                      labelStyle={styles.signOutBtnLabel}
                      contentStyle={styles.signOutBtnContent}
                      textColor="#ED4956"
                      testID={`sign-out-${session.id}`}
                    >
                      Sign Out
                    </Button>
                  </View>
                </React.Fragment>
              ))}
            </Surface>
          </>
        )}

        {otherSessions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <ShieldCheck size={32} color={PURPLE} />
            </View>
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptyDesc}>
              No other devices are signed in to your account.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
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
  sessionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden' as const,
  },
  sessionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  deviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
    marginRight: 8,
  },
  sessionNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1B2A4A',
  },
  currentBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    backgroundColor: PURPLE + '12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: PURPLE,
  },
  sessionMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 3,
  },
  sessionMetaText: {
    fontSize: 12,
    color: '#6B7A8D',
  },
  divider: {
    marginHorizontal: 16,
    backgroundColor: '#F0EDF5',
  },
  signOutBtn: {
    borderColor: '#ED4956',
    borderRadius: 10,
  },
  signOutBtnLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  signOutBtnContent: {
    paddingHorizontal: 4,
    height: 34,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PURPLE + '14',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B2A4A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6B7A8D',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
});
