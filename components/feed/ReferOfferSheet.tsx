import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Check, Search, Send, Users, X } from 'lucide-react-native';
import { shareContentToFriends, ReferContentType } from '@/api/services/sharesService';
import { getMyReferrals } from '@/api/services/referralService';
import type { ChatFriend } from '@/api/services/chatService';
import { useAuth } from '@/contexts/AuthContext';

const ACCENT = '#1A5C35';
const PURPLE = '#00B246';

interface OfferPreview {
  offerId: string;
  businessId: string;
  businessName: string;
  businessLogoUrl?: string;
  title: string;
  contentType?: ReferContentType;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  offer: OfferPreview;
  onShared: (recipientCount: number) => void;
  onError: (msg: string) => void;
}

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'F';
};

export const ReferOfferSheet = React.memo(function ReferOfferSheet({
  visible,
  onClose,
  offer,
  onShared,
  onError,
}: Props) {
  const { authLoading, isAuthenticated } = useAuth();
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<boolean>(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && (authLoading || !isAuthenticated)) return;
    if (visible) {
      setSearch('');
      setSelected(new Set());
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();

      let active = true;
      setLoading(true);
      getMyReferrals('all', '', offer.businessId)
        .then((rows) => {
          if (!active) return;
          const seen = new Set<string>();
          const deduped: ChatFriend[] = [];
          for (const r of rows) {
            if (seen.has(r.profile_id)) continue;
            seen.add(r.profile_id);
            deduped.push({ profile_id: r.profile_id, display_name: r.display_name, avatar_url: r.avatar_url });
          }
          setFriends(deduped);
        })
        .catch(() => {
          if (active) setFriends([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    } else {
      slideAnim.setValue(0);
      backdropAnim.setValue(0);
    }
  }, [visible, slideAnim, backdropAnim, offer.businessId, authLoading, isAuthenticated]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  const filtered = useMemo<ChatFriend[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.display_name.toLowerCase().includes(q));
  }, [friends, search]);

  const toggle = useCallback((profileId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (selected.size === 0 || sending) return;
    setSending(true);
    try {
      const targetProfileIds = Array.from(selected);
      const results = await shareContentToFriends(offer.contentType ?? 'offer', offer.offerId, targetProfileIds);
      const successCount = results.filter((r) => r.ok).length;
      setSending(false);
      onClose();
      if (successCount > 0) onShared(successCount);
      if (successCount < results.length) {
        onError(`Could not share with ${results.length - successCount} friend${results.length - successCount === 1 ? '' : 's'}.`);
      }
    } catch (e) {
      setSending(false);
      onError(e instanceof Error ? e.message : 'Failed to share offer');
    }
  }, [selected, sending, offer.offerId, offer.contentType, onClose, onShared, onError]);

  const sendLabel = selected.size === 0 ? 'Select friends' : `Send to ${selected.size} friend${selected.size === 1 ? '' : 's'}`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="refer-offer-backdrop" />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handleBar} />
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Refer to Friends</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} testID="refer-offer-close">
              <X size={20} color={ACCENT} />
            </Pressable>
          </View>

          <View style={styles.previewCard}>
            {offer.businessLogoUrl ? (
              <Image source={{ uri: offer.businessLogoUrl }} style={styles.previewLogo} contentFit="cover" />
            ) : (
              <View style={[styles.previewLogo, styles.previewLogoFallback]}>
                <Text style={styles.previewLogoLetter}>{offer.businessName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.previewBiz} numberOfLines={1}>{offer.businessName}</Text>
              <Text style={styles.previewOfferTitle} numberOfLines={2}>{offer.title}</Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Search size={14} color="#9aa0b3" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search friends..."
              placeholderTextColor="#9aa0b3"
              style={styles.searchInput}
              autoCorrect={false}
              testID="refer-offer-search"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.profile_id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyWrap}>
                  <Users size={40} color="#9aa0b3" strokeWidth={1.5} />
                  <Text style={styles.emptyTitle}>No referrals yet</Text>
                  <Text style={styles.emptySub}>Friends who joined via your referrals will show up here.</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = selected.has(item.profile_id);
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, isSelected && styles.rowSelected, pressed && styles.rowPressed]}
                  onPress={() => toggle(item.profile_id)}
                  testID={`refer-friend-${item.profile_id}`}
                >
                  <View style={styles.rowAvatar}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.rowAvatarImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.rowAvatarText}>{initialsFor(item.display_name)}</Text>
                    )}
                  </View>
                  <Text style={styles.rowName} numberOfLines={1}>{item.display_name}</Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={styles.bottomBar}>
            <Pressable
              disabled={selected.size === 0 || sending}
              onPress={handleSend}
              style={[styles.sendBtn, (selected.size === 0 || sending) && styles.sendBtnDisabled]}
              testID="refer-offer-send"
            >
              <Send size={16} color="#fff" />
              <Text style={styles.sendBtnText}>{sendLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    maxHeight: '85%',
    minHeight: '55%',
  },
  handleBar: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E0EC', marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: ACCENT },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1EEF7' },
  previewCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#F7F6FB', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E8F5EE', marginHorizontal: 18, marginTop: 4,
  },
  previewLogo: { width: 40, height: 40, borderRadius: 20 },
  previewLogoFallback: { backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  previewLogoLetter: { color: '#fff', fontWeight: '800', fontSize: 16 },
  previewBiz: { fontSize: 12, fontWeight: '700', color: ACCENT },
  previewOfferTitle: { fontSize: 13, fontWeight: '600', color: '#1A5C35', marginTop: 2, lineHeight: 17 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F4F2FA', borderRadius: 12, paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6, borderWidth: 1, borderColor: '#E8F5EE',
    marginHorizontal: 18, marginTop: 14, marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A5C35', padding: 0, margin: 0 },
  listContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 110 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'transparent', backgroundColor: '#fff',
  },
  rowSelected: { backgroundColor: '#E8F5EE', borderColor: ACCENT },
  rowPressed: { opacity: 0.85 },
  rowAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE9F6',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  rowAvatarImage: { width: 40, height: 40 },
  rowAvatarText: { color: ACCENT, fontWeight: '800', fontSize: 13 },
  rowName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A5C35' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#E8F5EE',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1A5C35', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#9aa0b3', textAlign: 'center', lineHeight: 17 },
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8F5EE',
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 14,
  },
  sendBtnDisabled: { backgroundColor: '#E8F5EE' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});

export default ReferOfferSheet;
