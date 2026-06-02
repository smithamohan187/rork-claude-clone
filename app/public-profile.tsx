import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Snackbar, Divider, Button } from 'react-native-paper';
import { ArrowLeft, CheckCircle2, UserPlus, X } from 'lucide-react-native';

interface MutualBusiness {
  id: string;
  name: string;
  initials: string;
  color: string;
  tier: string;
  tierColor: string;
}

interface PublicProfile {
  name: string;
  initials: string;
  avatarColor: string;
  memberSince: string;
  totalBusinesses: number;
  totalRewards: number;
  referralCode: string;
  isReferredByMe: boolean;
  referralRelationship: string;
  mutualBusinesses: MutualBusiness[];
}

const publicProfile: PublicProfile = {
  name: 'Priya Nair',
  initials: 'PN',
  avatarColor: '#0F6E56',
  memberSince: 'April 2025',
  totalBusinesses: 4,
  totalRewards: 6,
  referralCode: 'PRIYA-A3M9',
  isReferredByMe: true,
  referralRelationship: 'You referred Priya to TouchPoint',
  mutualBusinesses: [
    {
      id: '1',
      name: "Richard's Pastry",
      initials: 'RP',
      color: '#1A5C35',
      tier: 'Silver',
      tierColor: '#9A9A9A',
    },
    {
      id: '2',
      name: 'Kochi Fitness Hub',
      initials: 'KF',
      color: '#0F6E56',
      tier: 'Bronze',
      tierColor: '#CD7F32',
    },
  ],
};

const mySubscribedBusinesses: { id: string; name: string; initials: string; color: string }[] = [
  { id: '1', name: "Richard's Pastry", initials: 'RP', color: '#1A5C35' },
  { id: '2', name: 'Kochi Fitness Hub', initials: 'KF', color: '#0F6E56' },
];

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId?: string; name?: string }>();
  const displayName = (params.name as string) || publicProfile.name;
  const firstName = displayName.split(' ')[0];

  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMsg, setSnackMsg] = useState<string>('');
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);

  const handleReferToBusiness = (businessName: string) => {
    setSheetVisible(false);
    setSnackMsg(`Referral link sent to ${firstName} for ${businessName}!`);
    setSnackVisible(true);
  };

  const navToBusiness = (businessId: string) => {
    router.push({ pathname: '/business-profile/[id]', params: { id: businessId } } as never);
  };

  return (
    <View style={styles.root} testID="public-profile-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="public-profile-back"
          >
            <ArrowLeft size={22} color="#1A5C35" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View
              style={[styles.avatar, { backgroundColor: publicProfile.avatarColor }]}
            >
              <Text style={styles.avatarText}>{publicProfile.initials}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{displayName}</Text>
              <Text style={styles.heroMeta}>
                Member since {publicProfile.memberSince}
              </Text>
              {publicProfile.isReferredByMe && (
                <View style={styles.relChip}>
                  <Text style={styles.relChipText}>You referred this person</Text>
                </View>
              )}
            </View>
          </View>

          <Divider style={styles.heroDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>businesses</Text>
              <Text style={styles.statValue}>{publicProfile.totalBusinesses}</Text>
            </View>
            <View style={styles.statDividerV} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>rewards redeemed</Text>
              <Text style={styles.statValue}>{publicProfile.totalRewards}</Text>
            </View>
          </View>
        </View>

        {publicProfile.isReferredByMe && (
          <View style={styles.refStrip}>
            <CheckCircle2 size={18} color="#0F6E56" />
            <View style={styles.refStripText}>
              <Text style={styles.refStripTitle}>
                {publicProfile.referralRelationship}
              </Text>
              <Text style={styles.refStripSub}>
                Joined using your code {publicProfile.referralCode}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>BUSINESSES IN COMMON</Text>

        {publicProfile.mutualBusinesses.length === 0 ? (
          <Text style={styles.emptyMutual}>No businesses in common yet</Text>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mutualScroll}
            >
              {publicProfile.mutualBusinesses.map((biz) => (
                <TouchableOpacity
                  key={biz.id}
                  style={styles.mutualChip}
                  onPress={() => navToBusiness(biz.id)}
                  testID={`mutual-${biz.id}`}
                >
                  <View style={[styles.mutualLogo, { backgroundColor: biz.color }]}>
                    <Text style={styles.mutualLogoText}>{biz.initials}</Text>
                  </View>
                  <View>
                    <Text style={styles.mutualName}>{biz.name}</Text>
                    <View
                      style={[
                        styles.tierPill,
                        { backgroundColor: hexWithAlpha(biz.tierColor, 0.15) },
                      ]}
                    >
                      <Text style={[styles.tierText, { color: biz.tierColor }]}>
                        {biz.tier}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.mutualLinks}>
              {publicProfile.mutualBusinesses.map((biz) => (
                <TouchableOpacity
                  key={`link-${biz.id}`}
                  onPress={() => navToBusiness(biz.id)}
                >
                  <Text style={styles.mutualLinkText}>
                    View {firstName}&apos;s profile on {biz.name} →
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {publicProfile.isReferredByMe && (
          <Button
            mode="outlined"
            icon={() => <UserPlus size={16} color="#1A5C35" />}
            style={styles.referBtn}
            contentStyle={styles.referBtnContent}
            labelStyle={styles.referBtnLabel}
            textColor="#1A5C35"
            onPress={() => setSheetVisible(true)}
            testID="refer-to-business-btn"
          >
            {`Refer ${firstName} to a Business`}
          </Button>
        )}

        <Text style={styles.privacyNote}>
          Only mutual connections can view each other&apos;s profile on TouchPoint
        </Text>
      </ScrollView>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                Refer {firstName} to which business?
              </Text>
              <TouchableOpacity
                onPress={() => setSheetVisible(false)}
                style={styles.sheetClose}
                testID="sheet-close"
              >
                <X size={18} color="#1A5C35" />
              </TouchableOpacity>
            </View>

            {mySubscribedBusinesses.map((biz) => (
              <TouchableOpacity
                key={biz.id}
                style={styles.sheetRow}
                onPress={() => handleReferToBusiness(biz.name)}
                testID={`sheet-biz-${biz.id}`}
              >
                <View style={[styles.sheetLogo, { backgroundColor: biz.color }]}>
                  <Text style={styles.sheetLogoText}>{biz.initials}</Text>
                </View>
                <Text style={styles.sheetRowName}>{biz.name}</Text>
                <Text style={styles.sheetArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2500}
        style={styles.snackbar}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },
  safeTop: { backgroundColor: '#F8F7FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8F7FF',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A5C35',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 30 },

  heroCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#F8F7FF',
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    padding: 20,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '700', color: '#1A5C35' },
  heroMeta: { fontSize: 12, color: '#1A5C35', marginTop: 2 },
  relChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5EE',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  relChipText: { fontSize: 9, fontWeight: '700', color: '#1A5C35' },
  heroDivider: { marginVertical: 14, backgroundColor: '#E8F5EE' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#1A5C35' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1A5C35', marginTop: 2 },
  statDividerV: { width: 1, height: 28, backgroundColor: '#E8F5EE' },

  refStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1F5EE',
    borderWidth: 0.5,
    borderColor: '#9FE1CB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  refStripText: { flex: 1, marginLeft: 10 },
  refStripTitle: { fontSize: 12, color: '#085041', fontWeight: '700', lineHeight: 18 },
  refStripSub: { fontSize: 10, color: '#0F6E56', marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A5C35',
    marginHorizontal: 16,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  mutualScroll: { paddingHorizontal: 16, gap: 8 },
  mutualChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  mutualLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutualLogoText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  mutualName: { fontSize: 11, fontWeight: '700', color: '#1A5C35' },
  tierPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 1,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  tierText: { fontSize: 8, fontWeight: '700' },
  emptyMutual: {
    textAlign: 'center',
    fontSize: 12,
    color: '#1A5C35',
    marginHorizontal: 16,
  },
  mutualLinks: { marginTop: 8 },
  mutualLinkText: {
    fontSize: 11,
    color: '#1A5C35',
    marginHorizontal: 16,
    marginVertical: 4,
  },

  referBtn: {
    margin: 16,
    borderRadius: 12,
    borderColor: '#1A5C35',
    borderWidth: 1.5,
  },
  referBtnContent: { height: 48 },
  referBtnLabel: { fontSize: 13, fontWeight: '700' },

  privacyNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#888780',
    marginHorizontal: 16,
    marginTop: 8,
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8F5EE',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#1A5C35', flex: 1 },
  sheetClose: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  sheetLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetLogoText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  sheetRowName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1A5C35' },
  sheetArrow: { fontSize: 16, color: '#1A5C35', fontWeight: '700' },

  snackbar: { backgroundColor: '#1A5C35', marginBottom: 20 },
});
