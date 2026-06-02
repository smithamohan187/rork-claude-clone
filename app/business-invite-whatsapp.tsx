import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TextInput } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Circle, Eye, Search, Send, ShieldCheck } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '@/contexts/AuthContext';
import { phoneContacts as fallbackPhoneContacts } from '@/mocks/data';
import { buildBusinessReferralLink } from '@/components/feed/BusinessInviteBanner';

const PURPLE = '#00B246';
const ORANGE = '#1A5C35';

interface DeviceContact {
  id: string;
  name: string;
  phone: string;
}

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'U';
};

export default function BusinessInviteWhatsAppScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const params = useLocalSearchParams<{ referralLink?: string }>();
  const referralLink = params.referralLink ?? buildBusinessReferralLink(currentUser?.id);

  const message = useMemo(
    () =>
      `Hey! 👋 I think your business would be perfect on TouchPoint. It helps businesses grow with loyal customers through offers & rewards.\n\nJoin here 👇\n${referralLink}`,
    [referralLink],
  );

  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>('');

  const fallback = useMemo<DeviceContact[]>(
    () => fallbackPhoneContacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
    [],
  );

  const loadContacts = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        setContacts(fallback);
        setPermissionDenied(true);
        return;
      }
      const mod: typeof import('expo-contacts') | null = await import('expo-contacts').catch(
        () => null as unknown as typeof import('expo-contacts'),
      );
      if (!mod) {
        setContacts(fallback);
        setPermissionDenied(true);
        return;
      }
      const { status } = await mod.requestPermissionsAsync();
      if (status !== 'granted') {
        setContacts(fallback);
        setPermissionDenied(true);
        return;
      }
      const { data } = await mod.getContactsAsync({
        fields: [mod.Fields.PhoneNumbers, mod.Fields.Name],
      });
      const mapped: DeviceContact[] = (data ?? [])
        .filter((c) => !!c.name && (c.phoneNumbers?.length ?? 0) > 0)
        .map((c) => ({
          id: c.id ?? `${c.name}-${c.phoneNumbers?.[0]?.number ?? ''}`,
          name: c.name as string,
          phone: c.phoneNumbers?.[0]?.number ?? '',
        }))
        .filter((c) => !!c.phone)
        .sort((a, b) => a.name.localeCompare(b.name));
      setContacts(mapped.length > 0 ? mapped : fallback);
    } catch (e) {
      console.log('[BizInviteWa] contacts error', e);
      setContacts(fallback);
      setPermissionDenied(true);
    }
  }, [fallback]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [contacts, search]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  }, [allSelected, filtered]);

  const goExplore = useCallback(() => {
    router.replace('/(tabs)/marketplace');
  }, [router]);

  const handleSend = useCallback(async () => {
    if (selected.size === 0) return;
    const targets = contacts.filter((c) => selected.has(c.id));
    const encoded = encodeURIComponent(message);
    let sentAny = false;
    for (const t of targets) {
      const phone = t.phone.replace(/\D/g, '');
      const url = phone
        ? `whatsapp://send?phone=${phone}&text=${encoded}`
        : `whatsapp://send?text=${encoded}`;
      try {
        const supported = await Linking.canOpenURL(url).catch(() => false);
        if (supported) {
          await Linking.openURL(url);
          sentAny = true;
          // Stop after first to avoid stacking opens; user can return for more.
          break;
        }
      } catch (e) {
        console.log('[BizInviteWa] open error', e);
      }
    }
    if (!sentAny) {
      await Clipboard.setStringAsync(message);
      showSnackbar('WhatsApp not available — message copied');
    } else {
      showSnackbar("🎉 Invites sent! You'll earn points when they join TouchPoint.");
    }
    goExplore();
  }, [selected, contacts, message, goExplore, showSnackbar]);

  return (
    <View style={styles.container} testID="biz-invite-wa-screen">
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <ArrowLeft size={20} color={Colors.bannerText} />
          </Pressable>
          <Text style={styles.headerTitle}>Invite via WhatsApp</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          {permissionDenied ? (
            <View style={styles.rationale}>
              <ShieldCheck size={18} color={PURPLE} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rationaleTitle}>Contacts access disabled</Text>
                <Text style={styles.rationaleBody}>
                  Showing sample contacts so you can preview the flow. Enable Contacts in Settings to
                  invite real businesses.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionLabel}>SELECT WHATSAPP CONTACTS</Text>
              <Text style={styles.helperHint}>We'll send via WhatsApp to these numbers</Text>
            </View>
            <View style={styles.sectionHeadRight}>
              {selected.size > 0 ? (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{selected.size} selected</Text>
                </View>
              ) : null}
              <Pressable onPress={toggleSelectAll} hitSlop={6}>
                <Text style={styles.selectAll}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Search size={14} color="#9aa0b3" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search contacts..."
              placeholderTextColor="#9aa0b3"
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.contactsList}>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>No contacts found</Text>
            ) : (
              filtered.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={styles.contactRow}
                    onPress={() => toggle(item.id)}
                    testID={`biz-wa-contact-${item.id}`}
                  >
                    {isSelected ? (
                      <View style={styles.radioOn}>
                        <View style={styles.radioDot} />
                      </View>
                    ) : (
                      <Circle size={22} color="#E8F5EE" />
                    )}
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initialsFor(item.name)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.contactSub} numberOfLines={1}>
                        {item.phone}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          <View style={[styles.sectionHead, { marginTop: 22 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionLabel}>MESSAGE PREVIEW</Text>
              <Eye size={13} color="#9aa0b3" />
            </View>
          </View>
          <View style={styles.previewCard}>
            <View style={styles.previewBorder} />
            <View style={{ flex: 1, paddingVertical: 12, paddingRight: 12 }}>
              <Text style={styles.previewBody}>{message}</Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <Pressable
            onPress={handleSend}
            disabled={selected.size === 0}
            style={[styles.sendBtn, selected.size === 0 && styles.sendBtnDisabled]}
            testID="biz-wa-send"
          >
            <Send size={18} color="#fff" />
            <Text style={styles.sendBtnText}>
              Send on WhatsApp to {selected.size} Contact{selected.size === 1 ? '' : 's'}
            </Text>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
  headerTitle: { color: Colors.bannerText, fontSize: 17, fontWeight: '700' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rationale: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#E8F5EE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  rationaleTitle: { fontSize: 13, fontWeight: '700', color: '#1A5C35' },
  rationaleBody: { fontSize: 12, color: '#1A5C35', marginTop: 2, lineHeight: 17 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLabel: { fontSize: 11, color: '#9aa0b3', fontWeight: '700', letterSpacing: 0.6 },
  helperHint: { fontSize: 11, color: '#9aa0b3', fontStyle: 'italic', marginTop: 2 },
  selectAll: { color: PURPLE, fontWeight: '700', fontSize: 12 },
  countPill: {
    backgroundColor: ORANGE,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8F5EE',
  },
  searchInput: { flex: 1, backgroundColor: 'transparent', fontSize: 14, height: 44 },
  contactsList: { marginTop: 6 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  radioOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#1A5C35', fontWeight: '800', fontSize: 12 },
  contactName: { fontSize: 14, fontWeight: '700', color: '#1A5C35' },
  contactSub: { fontSize: 12, color: '#1A5C35', marginTop: 1 },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8F5EE',
  },
  previewBorder: { width: 4, backgroundColor: PURPLE, marginRight: 12 },
  previewBody: { fontSize: 13, color: '#1A5C35', lineHeight: 20 },
  empty: { textAlign: 'center', color: '#1A5C35', paddingVertical: 20, fontSize: 13 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E8F5EE',
  },
  sendBtn: {
    flexDirection: 'row',
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sendBtnDisabled: { backgroundColor: '#E8F5EE' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
