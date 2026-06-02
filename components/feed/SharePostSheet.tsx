import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share as RNShare,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Check,
  ExternalLink,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { phoneContacts as fallbackPhoneContacts } from '@/mocks/data';

const PURPLE = '#00B246';
const ORANGE = '#1A5C35';
const PAGE_SIZE = 10;

interface Props {
  visible: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
  postId: string;
  postType: 'post' | 'offer' | 'event' | 'broadcast';
  authorName: string;
  authorAvatarUrl?: string;
  contentPreview: string;
}

interface DeviceContact {
  id: string;
  name: string;
  phone: string;
  username?: string;
}

type PermissionState = 'pending' | 'granted' | 'denied';

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'U';
};

function buildReferralCode(userId: string): string {
  const safe = (userId ?? 'GUEST').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `APP_${safe.slice(0, 6).padEnd(6, 'X')}`;
}

export const SharePostSheet = React.memo(function SharePostSheet({
  visible,
  onClose,
  onToast,
  postId,
  postType,
  authorName,
  authorAvatarUrl,
  contentPreview,
}: Props) {
  const router = useRouter();
  const { currentUser } = useAuth();

  const referralCode = useMemo(() => buildReferralCode(currentUser?.id ?? ''), [currentUser?.id]);
  const shareUrl = useMemo(
    () => `https://touchpoint.app/post/${postId}?ref=${referralCode}`,
    [postId, referralCode],
  );
  const shareMessage = useMemo(
    () =>
      `Check out this ${postType} from ${authorName} on TouchPoint — discover local businesses, earn rewards, and get exclusive offers!\n\n${shareUrl}`,
    [postType, authorName, shareUrl],
  );

  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      backdropAnim.setValue(0);
    }
  }, [visible, slideAnim, backdropAnim]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  const [permission, setPermission] = useState<PermissionState>('pending');
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const fallbackContacts = useMemo<DeviceContact[]>(
    () =>
      fallbackPhoneContacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        username: c.isOnApp ? c.name.split(' ')[0]?.toLowerCase() : undefined,
      })),
    [],
  );

  const loadContacts = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        setPermission('denied');
        setContacts(fallbackContacts);
        return;
      }
      const mod: typeof import('expo-contacts') | null = await import('expo-contacts').catch(
        () => null as unknown as typeof import('expo-contacts'),
      );
      if (!mod) {
        setPermission('denied');
        setContacts(fallbackContacts);
        return;
      }
      const { status } = await mod.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermission('denied');
        setContacts(fallbackContacts);
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
      setPermission('granted');
      setContacts(mapped.length > 0 ? mapped : fallbackContacts);
    } catch (e) {
      console.log('[SharePostSheet] contacts error', e);
      setPermission('denied');
      setContacts(fallbackContacts);
    }
  }, [fallbackContacts]);

  useEffect(() => {
    if (visible) {
      void loadContacts();
    } else {
      setSelected(new Set());
      setSearch('');
      setVisibleCount(PAGE_SIZE);
    }
  }, [visible, loadContacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [contacts, search]);

  const visibleContacts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const toggleContact = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleEndReached = useCallback(() => {
    setVisibleCount((c) => (c < filtered.length ? c + PAGE_SIZE : c));
  }, [filtered.length]);

  // Social handlers
  const openUrl = useCallback(
    async (url: string, fallbackMsg?: string) => {
      try {
        await Linking.openURL(url);
      } catch (e) {
        console.log('[SharePostSheet] openUrl failed', e);
        if (fallbackMsg) onToast(fallbackMsg);
      }
    },
    [onToast],
  );

  const handleFacebook = useCallback(
    () =>
      openUrl(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`,
        'Could not open Facebook',
      ),
    [openUrl, shareUrl, shareMessage],
  );
  const handleTwitter = useCallback(
    () =>
      openUrl(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`,
        'Could not open X',
      ),
    [openUrl, shareUrl, shareMessage],
  );
  const handleInstagram = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      onToast('Link copied — paste in Instagram');
    } catch (e) {
      console.log('[SharePostSheet] instagram failed', e);
    }
  }, [shareUrl, onToast]);
  const handleTikTok = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      onToast('Link copied — paste in TikTok');
    } catch (e) {
      console.log('[SharePostSheet] tiktok failed', e);
    }
  }, [shareUrl, onToast]);
  const handleWhatsApp = useCallback(
    () => openUrl(`whatsapp://send?text=${encodeURIComponent(shareMessage)}`, 'WhatsApp is not installed'),
    [openUrl, shareMessage],
  );
  const handleMessenger = useCallback(
    () => openUrl(`fb-messenger://share?link=${encodeURIComponent(shareUrl)}`, 'Messenger is not installed'),
    [openUrl, shareUrl],
  );

  const navParams = useMemo(
    () => ({
      postId,
      postType,
      authorName,
      shareUrl,
      referralCode,
    }),
    [postId, postType, authorName, shareUrl, referralCode],
  );

  const handleOpenSms = useCallback(() => {
    onClose();
    setTimeout(() => {
      router.push({ pathname: '/share-sms', params: navParams });
    }, 220);
  }, [router, navParams, onClose]);

  const handleOpenEmail = useCallback(() => {
    onClose();
    setTimeout(() => {
      router.push({ pathname: '/share-email', params: navParams });
    }, 220);
  }, [router, navParams, onClose]);

  const handleNativeShare = useCallback(async () => {
    try {
      await RNShare.share({ message: shareMessage, url: shareUrl });
    } catch (e) {
      console.log('[SharePostSheet] native share failed', e);
    }
  }, [shareMessage, shareUrl]);

  const sendToSelected = useCallback(async () => {
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
          await smsMod.sendSMSAsync(phones, shareMessage);
          sent = true;
        }
      }
      if (!sent && Platform.OS !== 'web') {
        const sep = Platform.OS === 'ios' ? '&' : '?';
        const url = `sms:${phones.join(',')}${sep}body=${encodeURIComponent(shareMessage)}`;
        const supported = await Linking.canOpenURL(url).catch(() => false);
        if (supported) {
          await Linking.openURL(url);
          sent = true;
        }
      }
      if (!sent) {
        await Clipboard.setStringAsync(shareMessage);
        onToast('Message copied to clipboard');
      } else {
        onToast('🎉 Shared successfully!');
      }
      onClose();
    } catch (e) {
      console.log('[SharePostSheet] send sms failed', e);
      onToast('Could not send SMS');
    }
  }, [selected, contacts, shareMessage, onClose, onToast]);

  const renderContact = useCallback(
    ({ item }: { item: DeviceContact }) => {
      const isChecked = selected.has(item.id);
      return (
        <Pressable
          style={styles.contactRow}
          onPress={() => toggleContact(item.id)}
          testID={`share-contact-${item.id}`}
        >
          <View style={styles.contactAvatar}>
            <Text style={styles.contactAvatarText}>{initialsFor(item.name)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.contactSub} numberOfLines={1}>
              {item.username ? `@${item.username}` : item.phone}
            </Text>
          </View>
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
          </View>
        </Pressable>
      );
    },
    [selected, toggleContact],
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="share-sheet-backdrop" />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Share</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} testID="share-sheet-close">
              <X size={20} color="#1A5C35" />
            </Pressable>
          </View>

          <FlatList
            data={visibleContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <View>
                {/* Post preview */}
                <View style={styles.previewCard}>
                  {authorAvatarUrl ? (
                    <Image source={{ uri: authorAvatarUrl }} style={styles.previewAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.previewAvatar, styles.previewAvatarFallback]}>
                      <Text style={styles.previewInitials}>{initialsFor(authorName)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.previewName} numberOfLines={1}>{authorName}</Text>
                    {contentPreview ? (
                      <Text style={styles.previewBody} numberOfLines={2}>{contentPreview}</Text>
                    ) : (
                      <Text style={styles.previewBody} numberOfLines={1}>Tap a channel to share this {postType}</Text>
                    )}
                  </View>
                </View>

                {/* Section 1 — Social */}
                <View style={styles.sectionHead}>
                  <ExternalLink size={12} color="#9aa0b3" />
                  <Text style={styles.sectionLabel}>SHARE VIA SOCIAL MEDIA</Text>
                </View>
                <FlatList
                  horizontal
                  data={SOCIAL_CHANNELS}
                  keyExtractor={(c) => c.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.socialRow}
                  renderItem={({ item }) => (
                    <SocialIcon
                      channel={item}
                      onPress={() => {
                        switch (item.id) {
                          case 'facebook':
                            return handleFacebook();
                          case 'twitter':
                            return handleTwitter();
                          case 'instagram':
                            return handleInstagram();
                          case 'tiktok':
                            return handleTikTok();
                          case 'whatsapp':
                            return handleWhatsApp();
                          case 'messenger':
                            return handleMessenger();
                        }
                      }}
                    />
                  )}
                />

                {/* Section 2 — Other */}
                <View style={styles.sectionHead}>
                  <Send size={12} color="#9aa0b3" />
                  <Text style={styles.sectionLabel}>SHARE VIA OTHER</Text>
                </View>
                <View style={styles.otherRow}>
                  <OtherTile
                    label="SMS"
                    bg="#FFEEDD"
                    color={ORANGE}
                    icon={<MessageCircle size={22} color={ORANGE} />}
                    onPress={handleOpenSms}
                    testID="share-other-sms"
                  />
                  <OtherTile
                    label="Email"
                    bg="#E8F5EE"
                    color={PURPLE}
                    icon={<Mail size={22} color={PURPLE} />}
                    onPress={handleOpenEmail}
                    testID="share-other-email"
                  />
                  <OtherTile
                    label="More"
                    bg="#EEEEF2"
                    color="#5C6072"
                    icon={<MoreHorizontal size={22} color="#5C6072" />}
                    onPress={handleNativeShare}
                    testID="share-other-more"
                  />
                </View>

                {/* Section 3 — Contacts */}
                <View style={styles.sectionHead}>
                  <Users size={12} color="#9aa0b3" />
                  <Text style={styles.sectionLabel}>SHARE WITH CONTACTS</Text>
                </View>

                <View style={styles.searchWrap}>
                  <Search size={14} color="#9aa0b3" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search contacts..."
                    placeholderTextColor="#9aa0b3"
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    testID="share-contacts-search"
                  />
                </View>

                {permission === 'denied' ? (
                  <View style={styles.rationaleRow}>
                    <View style={styles.rationaleIcon}>
                      <ShieldCheck size={16} color={PURPLE} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rationaleTitle}>Allow contacts access</Text>
                      <Text style={styles.rationaleBody}>
                        Showing sample contacts so you can preview the flow.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => { try { (Linking as any).openSettings?.(); } catch {} }}
                      style={styles.rationaleBtn}
                      testID="share-contacts-allow"
                    >
                      <Text style={styles.rationaleBtnText}>Allow Access</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {permission === 'pending' ? 'Loading contacts…' : 'No contacts found'}
              </Text>
            }
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.bottomBar}>
            <Pressable
              disabled={selected.size === 0}
              onPress={sendToSelected}
              style={[styles.sendBtn, selected.size === 0 && styles.sendBtnDisabled]}
              testID="share-send-contacts"
            >
              <Send size={16} color="#fff" />
              <Text style={styles.sendBtnText}>
                {selected.size === 0
                  ? 'Select contacts'
                  : `Send to ${selected.size} Contact${selected.size === 1 ? '' : 's'}`}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

interface SocialChannel {
  id: 'facebook' | 'twitter' | 'instagram' | 'tiktok' | 'whatsapp' | 'messenger';
  label: string;
}

const SOCIAL_CHANNELS: SocialChannel[] = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'X' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'messenger', label: 'Messenger' },
];

function SocialIcon({ channel, onPress }: { channel: SocialChannel; onPress: () => void }) {
  return (
    <Pressable style={styles.socialItem} onPress={onPress} hitSlop={6} testID={`share-social-${channel.id}`}>
      <View style={styles.socialIcon}>{renderSocialIcon(channel.id)}</View>
      <Text style={styles.socialLabel} numberOfLines={1}>{channel.label}</Text>
    </Pressable>
  );
}

function renderSocialIcon(id: SocialChannel['id']): React.ReactNode {
  switch (id) {
    case 'facebook':
      return (
        <View style={[styles.iconBg, { backgroundColor: '#1877F2' }]}>
          <FontAwesome name="facebook" size={24} color="#fff" />
        </View>
      );
    case 'twitter':
      return (
        <View style={[styles.iconBg, { backgroundColor: '#000' }]}>
          <FontAwesome name="twitter" size={22} color="#fff" />
        </View>
      );
    case 'instagram':
      return (
        <LinearGradient
          colors={['#F58529', '#DD2A7B', '#00B246', '#00B246']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBg}
        >
          <FontAwesome name="instagram" size={22} color="#fff" />
        </LinearGradient>
      );
    case 'tiktok':
      return (
        <View style={[styles.iconBg, { backgroundColor: '#000' }]}>
          <MaterialCommunityIcons name="music-note" size={22} color="#fff" />
        </View>
      );
    case 'whatsapp':
      return (
        <View style={[styles.iconBg, { backgroundColor: '#25D366' }]}>
          <FontAwesome name="whatsapp" size={24} color="#fff" />
        </View>
      );
    case 'messenger':
      return (
        <LinearGradient
          colors={['#00B246', '#00B246']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBg}
        >
          <FontAwesome name="facebook-messenger" size={22} color="#fff" />
        </LinearGradient>
      );
    default:
      return null;
  }
}

interface OtherTileProps {
  label: string;
  bg: string;
  color: string;
  icon: React.ReactNode;
  onPress: () => void;
  testID?: string;
}

function OtherTile({ label, bg, color, icon, onPress, testID }: OtherTileProps) {
  return (
    <Pressable style={styles.otherTile} onPress={onPress} hitSlop={6} testID={testID}>
      <View style={[styles.otherIconBg, { backgroundColor: bg }]}>{icon}</View>
      <Text style={[styles.otherLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    maxHeight: '92%',
    minHeight: '70%',
  },
  handleBar: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E0EC',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A5C35' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EEF7',
  },
  listContent: { paddingHorizontal: 18, paddingBottom: 110 },
  // Preview
  previewCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#F7F6FB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8F5EE',
    marginTop: 4,
  },
  previewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE9F6' },
  previewAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  previewInitials: { color: PURPLE, fontWeight: '800', fontSize: 14 },
  previewName: { fontSize: 14, fontWeight: '800', color: '#1A5C35' },
  previewBody: { fontSize: 12, color: '#1A5C35', marginTop: 2, lineHeight: 16 },
  // Sections
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 11, color: '#9aa0b3', fontWeight: '700', letterSpacing: 0.7 },
  // Social
  socialRow: { gap: 14, paddingRight: 18 },
  socialItem: { alignItems: 'center', width: 64, gap: 6 },
  socialIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLabel: { fontSize: 11, color: '#1A5C35', fontWeight: '600', textAlign: 'center' },
  // Other
  otherRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  otherTile: { alignItems: 'center', gap: 6, width: 80 },
  otherIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherLabel: { fontSize: 11, fontWeight: '700' },
  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4F2FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#E8F5EE',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A5C35', padding: 0, margin: 0 },
  // Rationale
  rationaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4F2FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  rationaleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rationaleTitle: { fontSize: 13, fontWeight: '700', color: '#1A5C35' },
  rationaleBody: { fontSize: 11, color: '#1A5C35', marginTop: 2 },
  rationaleBtn: { backgroundColor: PURPLE, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  rationaleBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  // Contact rows
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: { color: '#1A5C35', fontWeight: '800', fontSize: 12 },
  contactName: { fontSize: 14, fontWeight: '700', color: '#1A5C35' },
  contactSub: { fontSize: 12, color: '#1A5C35', marginTop: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  emptyText: { textAlign: 'center', color: '#1A5C35', paddingVertical: 30, fontSize: 13 },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8F5EE',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sendBtnDisabled: { backgroundColor: '#E8F5EE' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
