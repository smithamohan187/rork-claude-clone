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
import { ArrowLeft, Check, Circle, Eye, Pencil, Search, Send, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { phoneContacts as fallbackPhoneContacts } from '@/mocks/data';

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

export default function ShareSmsScreen() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const params = useLocalSearchParams<{
    postId?: string;
    postType?: string;
    authorName?: string;
    shareUrl?: string;
    referralCode?: string;
  }>();

  const shareUrl = params.shareUrl ?? 'https://touchpoint.app';
  const authorName = params.authorName ?? 'a business';

  const defaultMsg = useMemo(
    () =>
      `Hey! Check out this post by ${authorName} on TouchPoint — discover amazing local businesses, earn rewards, and get exclusive offers in your area!`,
    [authorName],
  );

  const [draft, setDraft] = useState<string>(defaultMsg);
  const [hasFocused, setHasFocused] = useState<boolean>(false);
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
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
        return;
      }
      const mod: typeof import('expo-contacts') | null = await import('expo-contacts').catch(
        () => null as unknown as typeof import('expo-contacts'),
      );
      if (!mod) {
        setContacts(fallback);
        return;
      }
      const { status } = await mod.requestPermissionsAsync();
      if (status !== 'granted') {
        setContacts(fallback);
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
      console.log('[ShareSms] contacts error', e);
      setContacts(fallback);
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

  const toggleContact = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }, [allSelected, filtered]);

  const fullMessage = useMemo(() => `${draft.trim()}\n\nView it here: ${shareUrl}`, [draft, shareUrl]);

  const handleSend = useCallback(async () => {
    if (selected.size === 0) return;
    const phones = contacts
      .filter((c) => selected.has(c.id))
      .map((c) => c.phone)
      .filter(Boolean);
    try {
      const smsMod: typeof import('expo-sms') | null = await import('expo-sms').catch(
        () => null as unknown as typeof import('expo-sms'),
      );
      let sent = false;
      if (smsMod && Platform.OS !== 'web') {
        const available = await smsMod.isAvailableAsync();
        if (available) {
          await smsMod.sendSMSAsync(phones, fullMessage);
          sent = true;
        }
      }
      if (!sent && Platform.OS !== 'web') {
        const sep = Platform.OS === 'ios' ? '&' : '?';
        const url = `sms:${phones.join(',')}${sep}body=${encodeURIComponent(fullMessage)}`;
        const supported = await Linking.canOpenURL(url).catch(() => false);
        if (supported) {
          await Linking.openURL(url);
          sent = true;
        }
      }
      if (!sent) {
        await Clipboard.setStringAsync(fullMessage);
        showSnackbar('Message copied to clipboard');
      } else {
        showSnackbar('🎉 Shared successfully!');
      }
      router.replace('/(tabs)/feed');
    } catch (e) {
      console.log('[ShareSms] send error', e);
      showSnackbar('Could not send SMS');
    }
  }, [selected, contacts, fullMessage, router, showSnackbar]);

  const closeAndGoHome = useCallback(() => {
    router.replace('/(tabs)/feed');
  }, [router]);

  return (
    <View style={styles.container} testID="share-sms-screen">
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8} testID="share-sms-back">
            <ArrowLeft size={20} color={Colors.bannerText} />
          </Pressable>
          <Text style={styles.headerTitle}>Share via SMS</Text>
          <Pressable onPress={closeAndGoHome} style={styles.iconBtn} hitSlop={8} testID="share-sms-close">
            <X size={20} color={Colors.bannerText} />
          </Pressable>
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
          {/* Select Contacts */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>SELECT CONTACTS</Text>
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
              testID="share-sms-search"
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
                    onPress={() => toggleContact(item.id)}
                    testID={`share-sms-contact-${item.id}`}
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
                      <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.contactSub} numberOfLines={1}>{item.phone}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Message */}
          <View style={[styles.sectionHead, { marginTop: 22 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionLabel}>YOUR MESSAGE</Text>
              <Pencil size={12} color={PURPLE} />
            </View>
          </View>
          <TextInput
            mode="outlined"
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setHasFocused(true)}
            multiline
            numberOfLines={4}
            placeholder="Tap to personalise your message…"
            outlineColor={PURPLE}
            activeOutlineColor={PURPLE}
            style={styles.messageInput}
            testID="share-sms-message"
          />
          {!hasFocused ? (
            <Text style={styles.helperHint}>✏️ Tap to personalise your message</Text>
          ) : null}

          {/* Preview */}
          <View style={[styles.sectionHead, { marginTop: 22 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionLabel}>PREVIEW</Text>
              <Eye size={13} color="#9aa0b3" />
            </View>
          </View>
          <View style={styles.previewCard}>
            <View style={styles.previewBorder} />
            <View style={{ flex: 1, paddingVertical: 12, paddingRight: 12 }}>
              <Text style={styles.previewBody}>{draft.trim()}</Text>
              <Text style={styles.previewLink} numberOfLines={2}>
                View it here: {shareUrl}
              </Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <Pressable
            onPress={handleSend}
            disabled={selected.size === 0}
            style={[styles.sendBtn, selected.size === 0 && styles.sendBtnDisabled]}
            testID="share-sms-send"
          >
            <Send size={18} color="#fff" />
            <Text style={styles.sendBtnText}>
              Send SMS to {selected.size} Contact{selected.size === 1 ? '' : 's'}
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLabel: { fontSize: 11, color: '#9aa0b3', fontWeight: '700', letterSpacing: 0.6 },
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
  messageInput: { backgroundColor: Colors.surface, fontSize: 14 },
  helperHint: { fontSize: 11, color: '#9aa0b3', fontStyle: 'italic', marginTop: 4 },
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
  previewLink: { fontSize: 12, color: '#9aa0b3', marginTop: 10 },
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
