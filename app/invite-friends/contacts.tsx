import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  Share2,
  CheckCircle2,
  Circle,
  ChevronRight,
  Users,
  ShieldCheck,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { phoneContacts } from '@/mocks/data';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';

export interface InviteContact {
  id: string;
  name: string;
  phone: string;
}

type PermissionState = 'pending' | 'granted' | 'denied';

const REFERRAL_BASE = 'https://touchpoint.app/join?ref=';

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

export default function InviteContactsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showSnackbar } = useSnackbar();

  const referralCode = useMemo<string>(() => {
    const base = (currentUser?.name ?? 'YOU').split(' ')[0].toUpperCase().slice(0, 5);
    return `${base}-A3M9`;
  }, [currentUser]);
  const referralLink = `${REFERRAL_BASE}${referralCode}`;

  const [permission, setPermission] = useState<PermissionState>('pending');
  const [deviceContacts, setDeviceContacts] = useState<InviteContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fallbackContacts = useMemo<InviteContact[]>(() => {
    return phoneContacts
      .filter((c) => !c.isOnApp)
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const requestContacts = useCallback(async () => {
    try {
      const mod: typeof import('expo-contacts') | null = await import('expo-contacts').catch(
        () => null as unknown as typeof import('expo-contacts'),
      );
      if (!mod || Platform.OS === 'web') {
        setPermission('denied');
        setDeviceContacts(fallbackContacts);
        console.log('[InviteContacts] expo-contacts unavailable, using sample contacts');
        return;
      }
      const { status } = await mod.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermission('denied');
        setDeviceContacts(fallbackContacts);
        return;
      }
      const { data } = await mod.getContactsAsync({
        fields: [mod.Fields.PhoneNumbers, mod.Fields.Name],
      });
      const mapped: InviteContact[] = (data ?? [])
        .filter((c) => !!c.name && (c.phoneNumbers?.length ?? 0) > 0)
        .map((c) => ({
          id: c.id ?? `${c.name}-${c.phoneNumbers?.[0]?.number ?? ''}`,
          name: c.name as string,
          phone: c.phoneNumbers?.[0]?.number ?? '',
        }))
        .filter((c) => !!c.phone)
        .sort((a, b) => a.name.localeCompare(b.name));
      setPermission('granted');
      setDeviceContacts(mapped.length > 0 ? mapped : fallbackContacts);
    } catch (err) {
      console.log('[InviteContacts] permission error', err);
      setPermission('denied');
      setDeviceContacts(fallbackContacts);
    }
  }, [fallbackContacts]);

  React.useEffect(() => {
    void requestContacts();
  }, [requestContacts]);

  const useSampleInstead = useCallback(() => {
    setDeviceContacts(fallbackContacts);
    setPermission('granted');
  }, [fallbackContacts]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected =
    deviceContacts.length > 0 && deviceContacts.every((c) => selectedIds.has(c.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deviceContacts.map((c) => c.id)));
    }
  }, [allSelected, deviceContacts]);

  const handleShareLink = useCallback(async () => {
    const message = `Join me on TouchPoint! ${referralLink}`;
    try {
      if (Platform.OS === 'web') {
        const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as
          | (Navigator & { share?: (data: ShareData) => Promise<void>; canShare?: (data?: ShareData) => boolean })
          | undefined;
        if (nav?.share && (nav.canShare ? nav.canShare({ url: referralLink }) : true)) {
          await nav.share({ title: 'Join me on TouchPoint', text: message, url: referralLink });
          return;
        }
        await Clipboard.setStringAsync(message);
        showSnackbar('Link copied to clipboard');
        return;
      }
      await Share.share({ message });
    } catch (err) {
      console.log('[InviteContacts] share error', err);
      await Clipboard.setStringAsync(message);
      showSnackbar('Link copied to clipboard');
    }
  }, [referralLink, showSnackbar]);

  const goNext = useCallback(() => {
    if (selectedIds.size === 0) return;
    const selected = deviceContacts.filter((c) => selectedIds.has(c.id));
    router.push({
      pathname: '/invite-friends/review',
      params: {
        contacts: JSON.stringify(selected),
        referralCode,
        referralLink,
      },
    });
  }, [selectedIds, deviceContacts, router, referralCode, referralLink]);

  const renderItem = useCallback(
    ({ item }: { item: InviteContact }) => {
      const isSelected = selectedIds.has(item.id);
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleSelect(item.id)}
          style={styles.row}
          testID={`invite-row-${item.id}`}
        >
          <View style={styles.radio}>
            {isSelected ? (
              <CheckCircle2 size={24} color="#00B246" fill="#00B246" />
            ) : (
              <Circle size={24} color={Colors.border} />
            )}
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(item.name)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.phone} numberOfLines={1}>
              {item.phone}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleSelect(item.id)}
            style={[styles.inviteBtn, isSelected && styles.inviteBtnActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.inviteBtnText, isSelected && styles.inviteBtnTextActive]}>
              {isSelected ? 'Selected' : 'Invite'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [selectedIds, toggleSelect],
  );

  const selectedCount = selectedIds.size;

  return (
    <View style={styles.container} testID="invite-contacts-screen">
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="invite-close"
          >
            <X size={22} color={Colors.bannerText} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <TouchableOpacity
          style={styles.shareLinkRow}
          onPress={handleShareLink}
          activeOpacity={0.85}
          testID="share-invite-link"
        >
          <View style={styles.shareIconCircle}>
            <Share2 size={20} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.shareLinkTitle}>Share invite link</Text>
            <Text style={styles.shareLinkSub} numberOfLines={1}>
              {referralLink}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        {permission === 'denied' && deviceContacts.length === fallbackContacts.length && (
          <View style={styles.rationale}>
            <View style={styles.rationaleIcon}>
              <ShieldCheck size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rationaleTitle}>Contacts access disabled</Text>
              <Text style={styles.rationaleBody}>
                Showing sample contacts so you can preview the flow. Enable Contacts in Settings to
                invite real friends.
              </Text>
              <View style={styles.rationaleActions}>
                <TouchableOpacity
                  onPress={() => { try { (Linking as any).openSettings?.(); } catch {} }}
                  style={styles.rationaleBtn}
                >
                  <Text style={styles.rationaleBtnText}>Open Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={useSampleInstead} style={styles.rationaleBtnGhost}>
                  <Text style={styles.rationaleBtnGhostText}>Use sample contacts</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Users size={14} color={Colors.navyDark} />
            <Text style={styles.sectionTitle}>INVITE TO TOUCHPOINT</Text>
          </View>
          {deviceContacts.length > 0 && (
            <TouchableOpacity onPress={handleSelectAll}>
              <Text style={styles.selectAll}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={deviceContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          testID="invite-contacts-list"
        />
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar} pointerEvents="box-none">
        <TouchableOpacity
          disabled={selectedCount === 0}
          onPress={goNext}
          style={[styles.nextBtn, selectedCount === 0 && styles.nextBtnDisabled]}
          activeOpacity={0.9}
          testID="invite-next"
        >
          <Text style={styles.nextBtnText}>
            Next → {selectedCount} Selected
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeTop: { backgroundColor: Colors.navyDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.navyDark,
  },
  headerTitle: {
    color: Colors.bannerText,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  shareLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  shareIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00B246',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  shareLinkSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rationale: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EEF1FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  rationaleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rationaleTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  rationaleBody: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  rationaleActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  rationaleBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rationaleBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  rationaleBtnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rationaleBtnGhostText: { color: Colors.text, fontWeight: '700', fontSize: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },
  countBadge: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  selectAll: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 64 },
  radio: { width: 24 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text },
  phone: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#1A5C35',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inviteBtnActive: {
    backgroundColor: '#EA6C0A',
    borderColor: '#EA6C0A',
    shadowColor: '#EA6C0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  inviteBtnTextActive: { color: '#FFFFFF' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  nextBtn: {
    backgroundColor: '#1A5C35',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  nextBtnDisabled: { backgroundColor: Colors.textTertiary, opacity: 0.6 },
  nextBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
