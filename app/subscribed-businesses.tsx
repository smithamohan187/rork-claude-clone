import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  X,
  Star,
  MessageCircle,
  Bell,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
type Category = 'Food & Drink' | 'Retail' | 'Wellness' | 'Beauty' | 'Tech' | 'Fitness';

interface SubscribedBusiness {
  id: string;
  name: string;
  category: Category;
  description: string;
  cover: string;
  subscribedAt: string;
  rating: number;
  tags: string[];
  points: number;
  activeOffers: number;
  tier: Tier;
}

const TIER_COLORS: Record<Tier, { dot: string; text: string; bg: string }> = {
  Bronze: { dot: '#cd7f32', text: '#b5651d', bg: 'rgba(255,255,255,0.92)' },
  Silver: { dot: '#9ca3af', text: '#6b7280', bg: 'rgba(255,255,255,0.92)' },
  Gold: { dot: '#eab308', text: '#a16207', bg: 'rgba(255,255,255,0.92)' },
  Platinum: { dot: '#38bdf8', text: '#0369a1', bg: 'rgba(255,255,255,0.92)' },
};

const CATEGORIES: ReadonlyArray<'All' | Category> = [
  'All',
  'Food & Drink',
  'Retail',
  'Wellness',
  'Beauty',
  'Tech',
  'Fitness',
];

interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
}

const MOCK_CHAT_HISTORY: Record<string, ChatMessage[]> = {
  b1: [
    { id: 'm1', fromMe: false, text: 'Hey Oliver! Thanks for subscribing 🎉 Your first coffee is on us this weekend.', time: 'Mon 10:24' },
    { id: 'm2', fromMe: true, text: 'Amazing — can I bring a friend along too?', time: 'Mon 10:31' },
    { id: 'm3', fromMe: false, text: 'Of course! Just show this chat at the counter ☕', time: 'Mon 10:33' },
  ],
  b4: [
    { id: 'm1', fromMe: true, text: 'Hi! Do you have any slots free for a manicure on Saturday?', time: 'Wed 14:02' },
    { id: 'm2', fromMe: false, text: 'Hi there! We have 11am and 3:30pm available. Which works best?', time: 'Wed 14:10' },
    { id: 'm3', fromMe: true, text: 'The 3:30pm please 💅', time: 'Wed 14:12' },
    { id: 'm4', fromMe: false, text: 'Booked you in. See you then!', time: 'Wed 14:13' },
  ],
  b7: [
    { id: 'm1', fromMe: false, text: 'New sourdough drop this Saturday — saving one for you?', time: 'Fri 08:00' },
  ],
};

const MOCK_SUBSCRIPTIONS: SubscribedBusiness[] = [
  {
    id: 'b1',
    name: 'The Bermondsey Roastery',
    category: 'Food & Drink',
    description: 'Small-batch coffee roasted daily in South London. Cosy cafe & brunch.',
    cover: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=1200&q=80',
    subscribedAt: '12 Jan 2025',
    rating: 4.8,
    tags: ['Coffee', 'Brunch', 'Organic'],
    points: 1240,
    activeOffers: 3,
    tier: 'Gold',
  },
  {
    id: 'b2',
    name: 'Camden Wellness Co.',
    category: 'Wellness',
    description: 'Yoga, meditation and holistic wellness studio in the heart of Camden.',
    cover: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80',
    subscribedAt: '04 Feb 2025',
    rating: 4.9,
    tags: ['Yoga', 'Meditation'],
    points: 860,
    activeOffers: 2,
    tier: 'Silver',
  },
  {
    id: 'b3',
    name: 'Shoreditch Tech Hub',
    category: 'Tech',
    description: 'Co-working, gadget repairs and creator workshops in East London.',
    cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
    subscribedAt: '21 Feb 2025',
    rating: 4.6,
    tags: ['Co-working', 'Workshops'],
    points: 320,
    activeOffers: 1,
    tier: 'Bronze',
  },
  {
    id: 'b4',
    name: 'Notting Hill Beauty Bar',
    category: 'Beauty',
    description: 'Independent salon offering nails, lashes and skincare treatments.',
    cover: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80',
    subscribedAt: '08 Mar 2025',
    rating: 4.7,
    tags: ['Nails', 'Lashes', 'Skincare'],
    points: 1820,
    activeOffers: 4,
    tier: 'Platinum',
  },
  {
    id: 'b5',
    name: 'Hackney Hot Iron',
    category: 'Fitness',
    description: 'Boutique strength gym with small group classes and 1:1 coaching.',
    cover: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80',
    subscribedAt: '17 Mar 2025',
    rating: 4.8,
    tags: ['Strength', 'PT', 'Classes'],
    points: 540,
    activeOffers: 2,
    tier: 'Silver',
  },
  {
    id: 'b6',
    name: 'Marylebone Mercantile',
    category: 'Retail',
    description: 'Curated homeware and gifts from independent British makers.',
    cover: 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=1200&q=80',
    subscribedAt: '02 Apr 2025',
    rating: 4.5,
    tags: ['Homeware', 'Gifts'],
    points: 210,
    activeOffers: 1,
    tier: 'Bronze',
  },
  {
    id: 'b7',
    name: 'Brixton Bakehouse',
    category: 'Food & Drink',
    description: 'Sourdough, pastries and seasonal cakes baked fresh every morning.',
    cover: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80',
    subscribedAt: '15 Apr 2025',
    rating: 4.9,
    tags: ['Bakery', 'Sourdough'],
    points: 990,
    activeOffers: 2,
    tier: 'Gold',
  },
];

const BG = '#f5f6f8' as const;

export default function SubscribedBusinessesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SubscribedBusiness[]>(MOCK_SUBSCRIPTIONS);
  const [query, setQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'All' | Category>('All');

  const [unsubTarget, setUnsubTarget] = useState<SubscribedBusiness | null>(null);
  const [messageTarget, setMessageTarget] = useState<SubscribedBusiness | null>(null);

  const filtered = useMemo<SubscribedBusiness[]>(() => {
    const q = query.trim().toLowerCase();
    return items.filter((b) => {
      const matchCat = activeCategory === 'All' || b.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
      );
    });
  }, [items, query, activeCategory]);

  const handleUnsubscribe = useCallback((id: string) => {
    setItems((prev) => prev.filter((b) => b.id !== id));
    setUnsubTarget(null);
  }, []);

  const renderItem = useCallback(({ item }: { item: SubscribedBusiness }) => (
    <BusinessCard
      item={item}
      onMessage={() => setMessageTarget(item)}
      onUnsubscribe={() => setUnsubTarget(item)}
    />
  ), []);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="subs-back"
            hitSlop={8}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>My Business Community</Text>
            <Text style={styles.headerSubtitle}>{items.length} businesses</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your subscriptions"
              placeholderTextColor="#9ca3af"
              value={query}
              onChangeText={setQuery}
              testID="subs-search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} testID="subs-clear">
                <X size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((c) => {
            const active = activeCategory === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setActiveCategory(c)}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                testID={`subs-chip-${c}`}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No businesses found</Text>
            <Text style={styles.emptySub}>
              Try a different search or clear the category filter.
            </Text>
          </View>
        }
      />

      <UnsubscribeSheet
        target={unsubTarget}
        onClose={() => setUnsubTarget(null)}
        onConfirm={handleUnsubscribe}
      />

      <MessageSheet
        target={messageTarget}
        onClose={() => setMessageTarget(null)}
      />
    </View>
  );
}

function BusinessCard({
  item,
  onMessage,
  onUnsubscribe,
}: {
  item: SubscribedBusiness;
  onMessage: () => void;
  onUnsubscribe: () => void;
}) {
  const router = useRouter();
  const tier = TIER_COLORS[item.tier];
  const openProfile = useCallback(() => {
    router.push({
      pathname: '/business-profile/[id]',
      params: { id: item.id, businessName: item.name },
    } as never);
  }, [router, item.id, item.name]);
  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openProfile}
        style={styles.coverWrap}
        testID={`open-business-${item.id}`}
      >
        <Image source={{ uri: item.cover }} style={styles.cover} contentFit="cover" />
        <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
          <View style={[styles.tierDot, { backgroundColor: tier.dot }]} />
          <Text style={[styles.tierText, { color: tier.text }]}>{item.tier}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openProfile}
              style={styles.nameRow}
              testID={`open-business-name-${item.id}`}
            >
              <Text style={styles.bizName} numberOfLines={1}>{item.name}</Text>
              <ChevronRight size={16} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={styles.bizMeta}>
              {item.category} • Joined {item.subscribedAt}
            </Text>
          </View>
          <View style={styles.ratingPill}>
            <Star size={12} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.tagsRow}>
          {item.tags.map((t) => (
            <View key={t} style={styles.tagPill}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{item.points.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{item.activeOffers}</Text>
            <Text style={styles.statLabel}>Active Offers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <View style={styles.tierInline}>
              <View style={[styles.tierDot, { backgroundColor: tier.dot }]} />
              <Text style={[styles.statValue, { color: tier.text }]}>{item.tier}</Text>
            </View>
            <Text style={styles.statLabel}>Tier</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={onMessage}
            style={[styles.actionBtn, styles.msgBtn]}
            testID={`msg-${item.id}`}
          >
            <MessageCircle size={16} color="#fff" />
            <Text style={styles.msgBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onUnsubscribe}
            style={[styles.actionBtn, styles.unsubBtn]}
            testID={`unsub-${item.id}`}
          >
            <Text style={styles.unsubBtnText}>Unsubscribe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function useSheetAnim(open: boolean) {
  const translateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: open ? 0 : Dimensions.get('window').height,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [open, translateY]);
  return translateY;
}

function UnsubscribeSheet({
  target,
  onClose,
  onConfirm,
}: {
  target: SubscribedBusiness | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}) {
  const visible = !!target;
  const translateY = useSheetAnim(visible);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetIconCircle}>
            <Bell size={26} color={Colors.accent} />
          </View>
          <Text style={styles.sheetTitle}>Unsubscribe?</Text>
          <Text style={styles.sheetBody}>
            You&apos;ll lose your {target?.points.toLocaleString() ?? 0} points and all rewards with{' '}
            {target?.name ?? 'this business'}. This can&apos;t be undone.
          </Text>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnGrey]} onPress={onClose} testID="unsub-keep">
              <Text style={styles.sheetBtnGreyText}>Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnRed]}
              onPress={() => target && onConfirm(target.id)}
              testID="unsub-confirm"
            >
              <Text style={styles.sheetBtnRedText}>Yes, Unsubscribe</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function MessageSheet({
  target,
  onClose,
}: {
  target: SubscribedBusiness | null;
  onClose: () => void;
}) {
  const visible = !!target;
  const translateY = useSheetAnim(visible);
  const [text, setText] = useState<string>('');
  const [sent, setSent] = useState<boolean>(false);
  const [thread, setThread] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (visible && target) {
      setThread(MOCK_CHAT_HISTORY[target.id] ?? []);
    } else {
      setText('');
      setSent(false);
      setThread([]);
    }
  }, [visible, target]);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setThread((prev) => [...prev, { id: `local-${Date.now()}`, fromMe: true, text: text.trim(), time }]);
    setText('');
    setSent(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  }, [text, onClose]);

  const hasHistory = thread.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kbWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />
            {sent ? (
              <View style={styles.sentWrap}>
                <View style={styles.sentCircle}>
                  <Check size={28} color="#fff" />
                </View>
                <Text style={styles.sheetTitle}>Message sent!</Text>
              </View>
            ) : (
              <>
                <View style={styles.msgHeader}>
                  {target ? (
                    <Image
                      source={{ uri: target.cover }}
                      style={styles.msgAvatar}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={styles.msgHeaderText}>
                    <Text style={styles.msgBizName}>{target?.name ?? ''}</Text>
                    <Text style={styles.msgBizMeta}>Usually replies within a few hours</Text>
                  </View>
                </View>
                {hasHistory ? (
                  <ScrollView
                    style={styles.threadScroll}
                    contentContainerStyle={styles.threadContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {thread.map((m) => (
                      <View
                        key={m.id}
                        style={[
                          styles.bubbleRow,
                          m.fromMe ? styles.bubbleRowMe : styles.bubbleRowThem,
                        ]}
                      >
                        <View
                          style={[
                            styles.bubble,
                            m.fromMe ? styles.bubbleMe : styles.bubbleThem,
                          ]}
                        >
                          <Text
                            style={[
                              styles.bubbleText,
                              m.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem,
                            ]}
                          >
                            {m.text}
                          </Text>
                          <Text
                            style={[
                              styles.bubbleTime,
                              m.fromMe ? styles.bubbleTimeMe : styles.bubbleTimeThem,
                            ]}
                          >
                            {m.time}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
                <TextInput
                  style={hasHistory ? styles.msgInputCompact : styles.msgInput}
                  placeholder={`Write a message to ${target?.name ?? 'this business'}…`}
                  placeholderTextColor="#9ca3af"
                  value={text}
                  onChangeText={setText}
                  multiline
                  textAlignVertical="top"
                  testID="msg-input"
                />
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={[styles.sheetBtn, styles.sheetBtnGrey]}
                    onPress={onClose}
                    testID="msg-cancel"
                  >
                    <Text style={styles.sheetBtnGreyText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sheetBtn,
                      styles.sheetBtnDark,
                      !text.trim() && styles.sheetBtnDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={!text.trim()}
                    testID="msg-send"
                  >
                    <Text style={styles.sheetBtnDarkText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerWrap: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
  chipsRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 2,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  chipActive: { backgroundColor: Colors.accent },
  chipInactive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e5e7eb' },
  chipText: { fontSize: 13, fontWeight: '600' as const },
  chipTextActive: { color: '#fff' },
  chipTextInactive: { color: '#374151' },

  listContent: { padding: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  coverWrap: { width: '100%', height: 150, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  tierBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierText: { fontSize: 12, fontWeight: '700' as const },
  cardBody: { padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleLeft: { flex: 1, paddingRight: 8 },
  nameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  bizName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, flexShrink: 1 },
  bizMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: { fontSize: 12, fontWeight: '700' as const, color: Colors.accent },
  desc: { fontSize: 13, color: '#374151', marginTop: 8, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: { fontSize: 11, color: Colors.accent, fontWeight: '600' as const },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 24, backgroundColor: '#e5e7eb' },
  statValue: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  tierInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  msgBtn: { backgroundColor: Colors.primary },
  msgBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  unsubBtn: { borderWidth: 1.5, borderColor: '#fecaca', backgroundColor: '#fff' },
  unsubBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' as const },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginTop: 10 },
  emptySub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  kbWrap: { width: '100%' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginBottom: 14,
  },
  sheetIconCircle: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' },
  sheetBody: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnGrey: { backgroundColor: '#f3f4f6' },
  sheetBtnGreyText: { color: '#374151', fontSize: 15, fontWeight: '700' as const },
  sheetBtnRed: { backgroundColor: '#ef4444' },
  sheetBtnRedText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  sheetBtnDark: { backgroundColor: Colors.primary },
  sheetBtnDarkText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  sheetBtnDisabled: { opacity: 0.4 },

  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  msgAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#e5e7eb' },
  msgHeaderText: { flex: 1 },
  msgBizName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  msgBizMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  msgInput: {
    minHeight: 110,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    padding: 14,
    fontSize: 14,
    color: Colors.text,
  },
  msgInputCompact: {
    minHeight: 56,
    maxHeight: 110,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    padding: 12,
    fontSize: 14,
    color: Colors.text,
  },
  threadScroll: {
    maxHeight: 280,
    marginBottom: 12,
  },
  threadContent: {
    paddingVertical: 4,
    gap: 8,
  },
  bubbleRow: { flexDirection: 'row', width: '100%' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMe: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#f1f1f3', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: Colors.text },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' as const },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },
  bubbleTimeThem: { color: Colors.textSecondary },
  sentWrap: { alignItems: 'center', paddingVertical: 24 },
  sentCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});
