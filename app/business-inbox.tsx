import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Megaphone,
  X,
  ChevronLeft,
} from 'lucide-react-native';
import {
  Snackbar,
  TextInput as PaperTextInput,
  Button as PaperButton,
} from 'react-native-paper';

const ACCENT = '#1A5C35';
const BG = '#F8F7FF';
const TEXT_DARK = '#1A5C35';
const TEXT_MUTED = '#1A5C35';
const BORDER = '#E8F5EE';
const CREAM = '#F1EFE8';

type Tier = 'Gold' | 'Silver' | 'Bronze';

interface Inquiry {
  id: string;
  customerName: string;
  customerInitials: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  tier: Tier;
  tierColor: string;
  subscriptionDate: string;
}

const INQUIRIES: Inquiry[] = [
  {
    id: '1',
    customerName: 'Sam Thomas',
    customerInitials: 'ST',
    lastMessage: 'Is the almond croissant available today?',
    lastMessageAt: '9:30 AM',
    unreadCount: 1,
    tier: 'Silver',
    tierColor: '#B8B8B8',
    subscriptionDate: 'Member since Jan 2025',
  },
  {
    id: '2',
    customerName: 'Priya Nair',
    customerInitials: 'PN',
    lastMessage: 'Thank you! See you tomorrow.',
    lastMessageAt: 'Yesterday',
    unreadCount: 0,
    tier: 'Gold',
    tierColor: '#D4A017',
    subscriptionDate: 'Member since Oct 2024',
  },
  {
    id: '3',
    customerName: 'Rahul Menon',
    customerInitials: 'RM',
    lastMessage: 'Can I use two coupons together?',
    lastMessageAt: '2 days ago',
    unreadCount: 3,
    tier: 'Bronze',
    tierColor: '#CD7F32',
    subscriptionDate: 'Member since Mar 2025',
  },
];

type FilterKey = 'All' | 'Unread' | 'Gold' | 'Silver' | 'Bronze';
const FILTERS: FilterKey[] = ['All', 'Unread', 'Gold', 'Silver', 'Bronze'];

type Audience = 'All Subscribers' | 'Gold only' | 'Silver only' | 'Bronze only';
const AUDIENCES: Audience[] = [
  'All Subscribers',
  'Gold only',
  'Silver only',
  'Bronze only',
];

const AUDIENCE_COUNTS: Record<Audience, number> = {
  'All Subscribers': 1284,
  'Gold only': 128,
  'Silver only': 412,
  'Bronze only': 744,
};

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export default function BusinessInboxScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('All');
  const [composeOpen, setComposeOpen] = useState<boolean>(false);
  const [audience, setAudience] = useState<Audience>('All Subscribers');
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMsg, setSnackMsg] = useState<string>('');

  const filtered = useMemo<Inquiry[]>(() => {
    if (filter === 'All') return INQUIRIES;
    if (filter === 'Unread')
      return INQUIRIES.filter((i) => i.unreadCount > 0);
    return INQUIRIES.filter((i) => i.tier === filter);
  }, [filter]);

  const handleOpenChat = useCallback(
    (item: Inquiry) => {
      console.log('[BusinessInbox] open chat', item.id);
      router.push({
        pathname: '/chat-detail/[id]',
        params: {
          id: item.id,
          businessName: item.customerName,
          businessInitials: item.customerInitials,
          businessColor: ACCENT,
        },
      });
    },
    [router],
  );

  const resetCompose = useCallback(() => {
    setAudience('All Subscribers');
    setTitle('');
    setBody('');
  }, []);

  const handleSendBroadcast = useCallback(() => {
    const count = AUDIENCE_COUNTS[audience];
    console.log('[BusinessInbox] broadcast', audience, title, body);
    setComposeOpen(false);
    setSnackMsg(`Broadcast sent to ${count} subscribers!`);
    setSnackVisible(true);
    resetCompose();
  }, [audience, title, body, resetCompose]);

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const renderItem = useCallback(
    ({ item }: { item: Inquiry }) => (
      <TouchableOpacity
        testID={`inquiry-${item.id}`}
        activeOpacity={0.7}
        style={styles.row}
        onPress={() => handleOpenChat(item)}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.customerInitials}</Text>
          </View>
          <View
            style={[styles.tierDot, { backgroundColor: item.tierColor }]}
          />
        </View>

        <View style={styles.rowCenter}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>
              {item.customerName}
            </Text>
            <Text style={styles.time}>{item.lastMessageAt}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {item.subscriptionDate}
            </Text>
            <View
              style={[
                styles.tierPill,
                { backgroundColor: withAlpha(item.tierColor, 0.15) },
              ]}
            >
              <Text style={[styles.tierPillText, { color: item.tierColor }]}>
                {item.tier}
              </Text>
            </View>
          </View>
        </View>

        {item.unreadCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    ),
    [handleOpenChat],
  );

  const charCount = body.length;

  return (
    <View style={styles.screen} testID="business-inbox-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerIconBtn}
            testID="back-btn"
          >
            <ChevronLeft size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Inbox</Text>
          <TouchableOpacity
            onPress={() => setComposeOpen(true)}
            style={styles.headerIconBtn}
            testID="compose-btn"
          >
            <Megaphone size={20} color={ACCENT} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Total Chats</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#E24B4A' }]}>4</Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>2 hrs</Text>
            <Text style={styles.statLabel}>Avg Response</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.chip,
                  active ? styles.chipActive : styles.chipInactive,
                ]}
                testID={`filter-${f}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#fff' : '#6B6B6B' },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No inquiries</Text>
            <Text style={styles.emptySub}>
              Nothing matches the selected filter.
            </Text>
          </View>
        }
      />

      <Modal
        visible={composeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setComposeOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalRoot}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.backdrop}
            onPress={() => setComposeOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Send Broadcast Message</Text>
              <TouchableOpacity
                onPress={() => setComposeOpen(false)}
                testID="close-compose"
              >
                <X size={20} color={TEXT_DARK} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Send to</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.audienceRow}
            >
              {AUDIENCES.map((a) => {
                const active = a === audience;
                return (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setAudience(a)}
                    style={[
                      styles.audChip,
                      active ? styles.audChipActive : styles.audChipInactive,
                    ]}
                    testID={`audience-${a}`}
                  >
                    <Text
                      style={[
                        styles.audChipText,
                        { color: active ? '#fff' : TEXT_DARK },
                      ]}
                    >
                      {a}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.audienceCount}>
              ~{AUDIENCE_COUNTS[audience]} subscribers will receive this
            </Text>

            <PaperTextInput
              mode="outlined"
              label="Message title"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              outlineColor={BORDER}
              activeOutlineColor={ACCENT}
              style={styles.input}
              testID="broadcast-title"
            />

            <PaperTextInput
              mode="outlined"
              label="Write your message..."
              value={body}
              onChangeText={(t) => {
                if (t.length <= 300) setBody(t);
              }}
              multiline
              numberOfLines={4}
              outlineColor={BORDER}
              activeOutlineColor={ACCENT}
              style={[styles.input, styles.textarea]}
              testID="broadcast-body"
            />
            <Text style={styles.counter}>{charCount}/300</Text>

            <View style={styles.actions}>
              <PaperButton
                mode="outlined"
                onPress={() => setComposeOpen(false)}
                textColor={ACCENT}
                style={styles.cancelBtn}
              >
                Cancel
              </PaperButton>
              <PaperButton
                mode="contained"
                onPress={handleSendBroadcast}
                disabled={!canSend}
                buttonColor={ACCENT}
                style={styles.sendBtn}
                testID="send-broadcast"
              >
                Send Broadcast
              </PaperButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2500}
        style={{ backgroundColor: '#1A5C35' }}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  safeTop: { backgroundColor: '#fff' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700' as const,
    color: TEXT_DARK,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: CREAM,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statDivider: {
    width: 0.5,
    backgroundColor: '#D9D5CB',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TEXT_DARK,
  },
  statLabel: {
    fontSize: 10,
    color: '#7C7A72',
    marginTop: 2,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipActive: { backgroundColor: ACCENT },
  chipInactive: {
    borderWidth: 1,
    borderColor: '#D6D2C4',
    backgroundColor: 'transparent',
  },
  chipText: { fontSize: 12, fontWeight: '600' as const },

  listContent: { paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0EFF8',
    backgroundColor: BG,
  },
  avatarWrap: { width: 46, height: 46 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700' as const, color: '#444441' },
  tierDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: BG,
  },
  rowCenter: { flex: 1, marginLeft: 12 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT_DARK,
  },
  time: { fontSize: 11, color: TEXT_MUTED, marginLeft: 8 },
  preview: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  metaText: { fontSize: 10, color: TEXT_MUTED },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tierPillText: { fontSize: 10, fontWeight: '700' as const },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E24B4A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' as const },

  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TEXT_DARK,
  },
  emptySub: { fontSize: 12, color: TEXT_MUTED, marginTop: 6 },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0DCCF',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TEXT_DARK,
  },
  fieldLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  audienceRow: { gap: 8, paddingVertical: 2 },
  audChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
  },
  audChipActive: { backgroundColor: ACCENT },
  audChipInactive: {
    backgroundColor: CREAM,
  },
  audChipText: { fontSize: 12, fontWeight: '600' as const },
  audienceCount: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 8,
    marginBottom: 12,
  },
  input: { backgroundColor: '#fff', marginBottom: 6 },
  textarea: { minHeight: 96 },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 10,
    color: TEXT_MUTED,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    borderColor: ACCENT,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  sendBtn: {
    flex: 1,
    borderRadius: 10,
  },
});
