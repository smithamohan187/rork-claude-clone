import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Search, Check, UserPlus, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useReferralList, type ReferralPerson } from '@/hooks/useReferralList';
import { useReferralChat, type OfferSharePayload } from '@/contexts/ReferralChatContext';

const PRIMARY = '#1A5C35';
const PRIMARY_DARK = '#1A5C35';
const PRIMARY_TINT = '#E8F5EE';
const TEXT_DARK = '#1A5C35';
const TEXT_MUTED = '#1A5C35';
const SURFACE = '#FFFFFF';
const BG = '#F8F6FE';
const BORDER = '#E8F5EE';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface ReferralPickerSendResult {
  recipientCount: number;
  firstChatId?: string;
  firstRecipientName?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  offer: OfferSharePayload;
  onSent?: (result: ReferralPickerSendResult) => void;
}

export const ReferralPickerModal = React.memo(function ReferralPickerModal({
  visible,
  onClose,
  offer,
  onSent,
}: Props) {
  const router = useRouter();
  const { referrals, loading } = useReferralList();
  const { ensureChat, sendOfferShare } = useReferralChat();

  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSearch('');
      setSelected(new Set());
      setError(null);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const filtered = useMemo<ReferralPerson[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return referrals;
    return referrals.filter((r) => r.name.toLowerCase().includes(q));
  }, [referrals, search]);

  const allFilteredSelected = useMemo(
    () => filtered.length > 0 && filtered.every((r) => selected.has(r.profileId)),
    [filtered, selected],
  );

  const toggleOne = useCallback((profileId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => next.add(r.profileId));
      return next;
    });
  }, [filtered]);

  const handleClear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleInviteFriend = useCallback(() => {
    onClose();
    setTimeout(() => {
      router.push('/my-referrals' as never);
    }, 220);
  }, [onClose, router]);

  const handleSend = useCallback(async () => {
    if (selected.size === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      const recipients = referrals.filter((r) => selected.has(r.profileId));
      let firstChatId: string | undefined;
      let firstRecipientName: string | undefined;
      for (const r of recipients) {
        const chatId = ensureChat({
          friend: {
            profileId: r.profileId,
            name: r.name,
            initials: r.initials,
            avatarColor: r.avatarColor,
          },
          contextType: 'app',
        });
        sendOfferShare(chatId, offer);
        if (!firstChatId) {
          firstChatId = chatId;
          firstRecipientName = r.name;
        }
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
      }
      console.log('[ReferralPicker] sent offer to', recipients.length, 'people');
      onSent?.({
        recipientCount: recipients.length,
        firstChatId,
        firstRecipientName,
      });
      setSending(false);
      onClose();
    } catch (e) {
      console.log('[ReferralPicker] send error', e);
      setSending(false);
      setError('Failed to send. Please try again.');
    }
  }, [selected, sending, referrals, ensureChat, sendOfferShare, offer, onSent, onClose]);

  const sendLabel = useMemo(() => {
    if (selected.size === 0) return 'Select someone to share';
    if (selected.size === 1) return 'Send to 1 person';
    return `Send to ${selected.size} people`;
  }, [selected.size]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          testID="referral-picker-modal"
        >
          <SafeAreaView edges={['top']} style={styles.headerSafe}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} testID="referral-picker-close">
                <X size={22} color={TEXT_DARK} />
              </Pressable>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>Share Offer with Referrals</Text>
                <Text style={styles.headerSubtitle}>Select people from your referral network</Text>
              </View>
              <View style={styles.closeBtn} />
            </View>
          </SafeAreaView>

          <View style={styles.previewWrap}>
            <View style={styles.previewCard}>
              <View style={styles.previewLogoWrap}>
                {offer.businessLogoUrl ? (
                  <Animated.Image
                    source={{ uri: offer.businessLogoUrl }}
                    style={styles.previewLogo}
                  />
                ) : (
                  <LinearGradient
                    colors={[PRIMARY, PRIMARY_DARK]}
                    style={styles.previewLogo}
                  >
                    <Text style={styles.previewLogoLetter}>
                      {offer.businessName?.charAt(0)?.toUpperCase() ?? 'B'}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.previewText}>
                <Text style={styles.previewBiz} numberOfLines={1}>
                  {offer.businessName}
                </Text>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {offer.offerTitle}
                </Text>
              </View>
              {offer.discountLabel ? (
                <View style={styles.previewDiscount}>
                  <Text style={styles.previewDiscountText}>{offer.discountLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              <Search size={16} color={TEXT_MUTED} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search your referrals..."
                placeholderTextColor={TEXT_MUTED}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                testID="referral-search"
              />
            </View>
          </View>

          {referrals.length > 0 ? (
            <View style={styles.actionRow}>
              <Text style={styles.networkCount}>{referrals.length} in your network</Text>
              <View style={styles.actionRowRight}>
                <Pressable
                  onPress={allFilteredSelected ? handleClear : handleSelectAll}
                  hitSlop={6}
                  testID="referral-select-all"
                >
                  <Text style={styles.actionLink}>
                    {allFilteredSelected ? 'Clear' : 'Select All'}
                  </Text>
                </Pressable>
                {selected.size > 0 && !allFilteredSelected ? (
                  <>
                    <Text style={styles.actionDivider}>|</Text>
                    <Pressable onPress={handleClear} hitSlop={6}>
                      <Text style={styles.actionLink}>Clear</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={PRIMARY} />
            </View>
          ) : referrals.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Users size={48} color={TEXT_MUTED} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>You have no referrals yet</Text>
              <Text style={styles.emptySub}>
                Invite friends to TouchPoint to grow your network
              </Text>
              <Pressable
                onPress={handleInviteFriend}
                style={styles.emptyBtn}
                testID="invite-friend-btn"
              >
                <UserPlus size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Invite a Friend</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.profileId}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    No referrals match &quot;{search.trim()}&quot;
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selected.has(item.profileId);
                return (
                  <Pressable
                    onPress={() => toggleOne(item.profileId)}
                    style={({ pressed }) => [
                      styles.row,
                      isSelected && styles.rowSelected,
                      pressed && styles.rowPressed,
                    ]}
                    testID={`referral-row-${item.profileId}`}
                  >
                    <View style={[styles.rowAvatar, { backgroundColor: item.avatarColor }]}>
                      <Text style={styles.rowAvatarText}>{item.initials}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {item.relation === 'referred_by_me'
                          ? 'Joined via your referral'
                          : 'Referred you'}
                      </Text>
                    </View>
                    <View
                      style={[styles.checkCircle, isSelected && styles.checkCircleOn]}
                    >
                      {isSelected ? <Check size={14} color="#fff" /> : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
            {error ? (
              <View style={styles.errorBar}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.footer}>
              <Pressable
                onPress={handleSend}
                disabled={selected.size === 0 || sending}
                style={({ pressed }) => [
                  styles.sendBtn,
                  selected.size === 0 && styles.sendBtnDisabled,
                  pressed && selected.size > 0 && styles.sendBtnPressed,
                ]}
                testID="referral-send-btn"
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.sendBtnText,
                      selected.size === 0 && styles.sendBtnTextDisabled,
                    ]}
                  >
                    {sendLabel}
                  </Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,8,40,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 60,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  headerSafe: {
    backgroundColor: SURFACE,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8F5EE',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  previewWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_TINT,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  previewLogoWrap: {},
  previewLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoLetter: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  previewText: {
    flex: 1,
  },
  previewBiz: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_DARK,
    letterSpacing: 0.2,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_DARK,
    marginTop: 2,
    lineHeight: 17,
  },
  previewDiscount: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  previewDiscountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_DARK,
    paddingVertical: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  networkCount: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MUTED,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  actionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
  },
  actionDivider: {
    color: BORDER,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: {
    backgroundColor: PRIMARY_TINT,
    borderColor: PRIMARY,
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  rowSub: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  checkCircleOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: PRIMARY_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  noResults: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  noResultsText: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  footerSafe: {
    backgroundColor: SURFACE,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
  },
  errorBar: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#E8F5EE',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sendBtnTextDisabled: {
    color: '#fff',
  },
});

export default ReferralPickerModal;
