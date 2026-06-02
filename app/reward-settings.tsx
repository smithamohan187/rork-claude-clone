import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  Heart,
  Share2,
  MessageCircle,
  UserPlus,
  ShoppingBag,
  Star,
  Trophy,
  TrendingUp,
  ArrowLeft,
  Gift,
  Award,
  Zap,
  Crown,
  Gem,
  Target,
  Plus,
  Eye,
  Users,
  Clock,
  Ticket,
  X,
  ChevronRight,
  Flame,
  BarChart3,
  Sparkles,
  CalendarDays,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import {
  rewardRules as defaultRewardRules,
  businessPrizes as mockBusinessPrizes,
  tierAnalytics as mockTierAnalytics,
  memberAchievements,
} from '@/mocks/data';
import type { BusinessPrize, TierAnalytics, MemberAchievement } from '@/mocks/data';
import type { RewardRule } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SimpleTier {
  id: string;
  name: string;
  points: number;
  reward: string;
  color: string;
  icon: React.ElementType;
}

const defaultTiers: SimpleTier[] = [
  { id: 't1', name: 'Bronze', points: 500, reward: '5% off', color: '#CD7F32', icon: Target },
  { id: 't2', name: 'Silver', points: 1500, reward: '10% off', color: '#A8A9AD', icon: Award },
  { id: 't3', name: 'Gold', points: 3000, reward: '15% off + Free Drink', color: '#FFD000', icon: Zap },
  { id: 't4', name: 'Platinum', points: 5000, reward: '20% off + VIP Access', color: '#00B246', icon: Crown },
  { id: 't5', name: 'Diamond', points: 10000, reward: '30% off + Gift Hamper', color: '#06B6D4', icon: Gem },
];

const iconMap: Record<string, React.ElementType> = {
  Heart, Share2, MessageCircle, UserPlus, ShoppingBag, Star, Gift,
};

type PrizeFormType = 'draw' | 'milestone' | 'challenge' | 'tier_reward';

interface NewPrizeForm {
  title: string;
  description: string;
  prizeType: PrizeFormType;
  pointsCost: string;
  maxWinners: string;
  tierRequired: string;
  endDate: string;
  showInCarousel: boolean;
}

const prizeTypeLabels: Record<PrizeFormType, { label: string; color: string; icon: React.ElementType }> = {
  draw: { label: 'Draw / Raffle', color: '#F59E0B', icon: Ticket },
  milestone: { label: 'Points Milestone', color: '#10B981', icon: Target },
  challenge: { label: 'Challenge', color: '#1A5C35', icon: Flame },
  tier_reward: { label: 'Tier Reward', color: '#00B246', icon: Crown },
};

function getAchievementIcon(type: MemberAchievement['type'], color: string) {
  switch (type) {
    case 'prize_won': return <Trophy size={16} color={color} />;
    case 'points_milestone': return <Target size={16} color={color} />;
    case 'streak': return <Flame size={16} color={color} />;
    case 'referral_bonus': return <UserPlus size={16} color={color} />;
    case 'top_contributor': return <Crown size={16} color={color} />;
    case 'level_up': return <TrendingUp size={16} color={color} />;
    default: return <Award size={16} color={color} />;
  }
}

function CarouselPreview() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<FlatList<MemberAchievement>>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const CARD_WIDTH = SCREEN_WIDTH * 0.72;
  const CARD_SPACING = 8;
  const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;

  const relevantAchievements = useMemo(() =>
    memberAchievements.filter(a => a.businessId === 'b1' || !a.businessId).slice(0, 6),
  []);

  const onScrollEnd = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setActiveIndex(idx);
  }, [SNAP_INTERVAL]);

  const renderCard = useCallback(({ item, index }: { item: MemberAchievement; index: number }) => {
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.93, 1, 0.93], extrapolate: 'clamp' });

    return (
      <Animated.View style={[previewStyles.cardOuter, { width: CARD_WIDTH, marginRight: CARD_SPACING, transform: [{ scale }] }]}>
        <View style={[previewStyles.card, { borderLeftColor: item.accentColor }]}>
          <View style={previewStyles.cardTop}>
            <View style={[previewStyles.iconCircle, { backgroundColor: item.iconBg }]}>
              {getAchievementIcon(item.type, item.accentColor)}
            </View>
            <View style={previewStyles.cardInfo}>
              <Text style={previewStyles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={previewStyles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </View>
            <View style={[previewStyles.valueBadge, { backgroundColor: item.accentColor }]}>
              <Text style={previewStyles.valueText}>{item.value}</Text>
            </View>
          </View>
          <View style={previewStyles.cardBottom}>
            <Image source={{ uri: item.memberAvatar }} style={previewStyles.memberAvatar} />
            <Text style={previewStyles.memberName}>{item.memberName}</Text>
            <Text style={previewStyles.timestamp}>{item.timestamp}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }, [scrollX, SNAP_INTERVAL, CARD_WIDTH, CARD_SPACING]);

  return (
    <View style={previewStyles.container}>
      <Animated.FlatList
        ref={scrollRef as any}
        data={relevantAchievements}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={renderCard}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
      />
      <View style={previewStyles.dots}>
        {relevantAchievements.map((_, i) => (
          <View key={i} style={[previewStyles.dot, i === activeIndex && previewStyles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function TierAnalyticsBar({ tier, maxCount }: { tier: TierAnalytics; maxCount: number }) {
  const barWidth = useMemo(() => {
    const ratio = tier.memberCount / maxCount;
    return Math.max(ratio * 100, 8);
  }, [tier.memberCount, maxCount]);

  return (
    <View style={analyticsStyles.tierRow}>
      <View style={analyticsStyles.tierLabel}>
        <View style={[analyticsStyles.tierDot, { backgroundColor: tier.color }]} />
        <Text style={analyticsStyles.tierName}>{tier.tierName}</Text>
      </View>
      <View style={analyticsStyles.barContainer}>
        <View style={[analyticsStyles.bar, { width: `${barWidth}%`, backgroundColor: tier.color }]} />
      </View>
      <View style={analyticsStyles.tierStats}>
        <Text style={analyticsStyles.tierCount}>{tier.memberCount.toLocaleString()}</Text>
        <Text style={analyticsStyles.tierPercent}>{tier.percentage}%</Text>
      </View>
    </View>
  );
}

function PrizeCard({ prize, onEdit }: { prize: BusinessPrize; onEdit: () => void }) {
  const typeInfo = prizeTypeLabels[prize.prizeType];
  const TypeIcon = typeInfo.icon;
  const daysLeft = useMemo(() => {
    const end = new Date(prize.endsAt);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [prize.endsAt]);

  const progressPct = useMemo(() => {
    if (prize.maxWinners === 0) return 0;
    return Math.min((prize.winnersSelected / prize.maxWinners) * 100, 100);
  }, [prize.winnersSelected, prize.maxWinners]);

  return (
    <TouchableOpacity style={prizeStyles.card} onPress={onEdit} activeOpacity={0.7}>
      <View style={prizeStyles.cardHeader}>
        <View style={[prizeStyles.typeIconWrap, { backgroundColor: typeInfo.color + '15' }]}>
          <TypeIcon size={18} color={typeInfo.color} />
        </View>
        <View style={prizeStyles.cardHeaderInfo}>
          <Text style={prizeStyles.prizeTitle} numberOfLines={1}>{prize.title}</Text>
          <Text style={prizeStyles.prizeDesc} numberOfLines={1}>{prize.description}</Text>
        </View>
        <View style={[prizeStyles.statusPill, { backgroundColor: prize.status === 'active' ? '#D1FAE5' : '#FEF3C7' }]}>
          <View style={[prizeStyles.statusDot, { backgroundColor: prize.status === 'active' ? '#10B981' : '#F59E0B' }]} />
          <Text style={[prizeStyles.statusLabel, { color: prize.status === 'active' ? '#059669' : '#D97706' }]}>
            {prize.status === 'active' ? 'Live' : prize.status.charAt(0).toUpperCase() + prize.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={prizeStyles.statsRow}>
        <View style={prizeStyles.stat}>
          <Users size={13} color={Colors.textTertiary} />
          <Text style={prizeStyles.statValue}>{prize.totalEntries}</Text>
          <Text style={prizeStyles.statUnit}>entries</Text>
        </View>
        {prize.pointsCost > 0 && (
          <View style={prizeStyles.stat}>
            <Zap size={13} color={Colors.textTertiary} />
            <Text style={prizeStyles.statValue}>{prize.pointsCost.toLocaleString()}</Text>
            <Text style={prizeStyles.statUnit}>pts</Text>
          </View>
        )}
        <View style={prizeStyles.stat}>
          <Clock size={13} color={Colors.textTertiary} />
          <Text style={prizeStyles.statValue}>{daysLeft}</Text>
          <Text style={prizeStyles.statUnit}>days left</Text>
        </View>
        {prize.tierRequired && (
          <View style={prizeStyles.stat}>
            <Crown size={13} color={Colors.textTertiary} />
            <Text style={prizeStyles.statValue}>{prize.tierRequired}+</Text>
          </View>
        )}
      </View>

      <View style={prizeStyles.progressRow}>
        <View style={prizeStyles.progressBarBg}>
          <View style={[prizeStyles.progressBarFill, { width: `${progressPct}%`, backgroundColor: typeInfo.color }]} />
        </View>
        <Text style={prizeStyles.progressText}>{prize.winnersSelected}/{prize.maxWinners} won</Text>
      </View>
    </TouchableOpacity>
  );
}

function RewardRuleCard({ rule, onPointsChange }: { rule: RewardRule; onPointsChange: (id: string, points: string) => void }) {
  const IconComp = iconMap[rule.icon] || Star;

  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleIconWrap}>
        <IconComp size={20} color={Colors.navyDark} />
      </View>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleAction}>{rule.action}</Text>
        <Text style={styles.ruleDesc}>{rule.description}</Text>
      </View>
      <View style={styles.rulePointsEditable}>
        <TextInput
          style={styles.pointsInput}
          keyboardType="number-pad"
          value={String(rule.points)}
          onChangeText={(text) => onPointsChange(rule.id, text)}
          selectTextOnFocus
          maxLength={5}
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
        />
        <Text style={styles.rulePointsUnit}>pts</Text>
      </View>
    </View>
  );
}

function SimpleTierRow({ tier, index, total, analytics, onPointsChange, onRewardChange }: {
  tier: SimpleTier;
  index: number;
  total: number;
  analytics?: TierAnalytics;
  onPointsChange: (id: string, value: string) => void;
  onRewardChange: (id: string, value: string) => void;
}) {
  const IconComp = tier.icon;
  const isLast = index === total - 1;

  return (
    <View style={[styles.tierRow, !isLast && styles.tierRowBorder]}>
      <View style={[styles.tierIconWrap, { backgroundColor: tier.color + '18' }]}>
        <IconComp size={18} color={tier.color} />
      </View>
      <View style={styles.tierDetails}>
        <View style={styles.tierNameRow}>
          <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
          {analytics && (
            <Text style={styles.tierMemberCount}>{analytics.memberCount.toLocaleString()} members</Text>
          )}
        </View>
        <TextInput
          style={[styles.tierRewardInput, { borderColor: tier.color + '40' }]}
          value={tier.reward}
          onChangeText={(text) => onRewardChange(tier.id, text)}
          placeholder="e.g. 10% off"
          placeholderTextColor={Colors.textTertiary}
          selectTextOnFocus
        />
      </View>
      <View style={styles.tierPointsBadge}>
        <TextInput
          style={[styles.tierPointsInput, { borderColor: tier.color + '40' }]}
          keyboardType="number-pad"
          value={String(tier.points)}
          onChangeText={(text) => onPointsChange(tier.id, text)}
          selectTextOnFocus
          maxLength={6}
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
        />
        <Text style={styles.tierPointsUnit}>pts</Text>
      </View>
    </View>
  );
}

function CreatePrizeModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (form: NewPrizeForm) => void }) {
  const [form, setForm] = useState<NewPrizeForm>({
    title: '',
    description: '',
    prizeType: 'draw',
    pointsCost: '',
    maxWinners: '1',
    tierRequired: '',
    endDate: '',
    showInCarousel: true,
  });

  const updateField = useCallback(<K extends keyof NewPrizeForm>(key: K, value: NewPrizeForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!form.title.trim()) {
      Alert.alert('Missing Title', 'Please enter a prize title.');
      return;
    }
    onSave(form);
    setForm({
      title: '',
      description: '',
      prizeType: 'draw',
      pointsCost: '',
      maxWinners: '1',
      tierRequired: '',
      endDate: '',
      showInCarousel: true,
    });
    onClose();
  }, [form, onSave, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={modalStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handleBar} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Create Prize / Campaign</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={modalStyles.body}>
            <Text style={modalStyles.label}>Prize Type</Text>
            <View style={modalStyles.typeRow}>
              {(Object.keys(prizeTypeLabels) as PrizeFormType[]).map((key) => {
                const info = prizeTypeLabels[key];
                const TypeIcon = info.icon;
                const isSelected = form.prizeType === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[modalStyles.typeChip, isSelected && { backgroundColor: info.color + '15', borderColor: info.color }]}
                    onPress={() => updateField('prizeType', key)}
                    activeOpacity={0.7}
                  >
                    <TypeIcon size={14} color={isSelected ? info.color : Colors.textTertiary} />
                    <Text style={[modalStyles.typeChipText, isSelected && { color: info.color }]}>{info.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={modalStyles.label}>Title</Text>
            <TextInput
              style={modalStyles.input}
              value={form.title}
              onChangeText={(t) => updateField('title', t)}
              placeholder="e.g. $50 Gift Card Weekly Draw"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={modalStyles.label}>Description</Text>
            <TextInput
              style={[modalStyles.input, { height: 72, textAlignVertical: 'top' as const }]}
              value={form.description}
              onChangeText={(t) => updateField('description', t)}
              placeholder="Describe the prize and how to enter..."
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <View style={modalStyles.fieldRow}>
              <View style={modalStyles.fieldHalf}>
                <Text style={modalStyles.label}>Points Cost</Text>
                <TextInput
                  style={modalStyles.input}
                  value={form.pointsCost}
                  onChangeText={(t) => updateField('pointsCost', t.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={modalStyles.fieldHalf}>
                <Text style={modalStyles.label}>Max Winners</Text>
                <TextInput
                  style={modalStyles.input}
                  value={form.maxWinners}
                  onChangeText={(t) => updateField('maxWinners', t.replace(/[^0-9]/g, ''))}
                  placeholder="1"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {(form.prizeType === 'tier_reward' || form.prizeType === 'draw') && (
              <>
                <Text style={modalStyles.label}>Required Tier (optional)</Text>
                <View style={modalStyles.tierChipRow}>
                  {['', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((t) => (
                    <TouchableOpacity
                      key={t || 'none'}
                      style={[modalStyles.tierChip, form.tierRequired === t && modalStyles.tierChipSelected]}
                      onPress={() => updateField('tierRequired', t)}
                      activeOpacity={0.7}
                    >
                      <Text style={[modalStyles.tierChipText, form.tierRequired === t && modalStyles.tierChipTextSelected]}>
                        {t || 'None'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={modalStyles.switchRow}>
              <View style={modalStyles.switchInfo}>
                <Sparkles size={18} color={Colors.lavender} />
                <View>
                  <Text style={modalStyles.switchLabel}>Show in Newsfeed Carousel</Text>
                  <Text style={modalStyles.switchDesc}>Winners appear in Points & Prizes on personal feed</Text>
                </View>
              </View>
              <Switch
                value={form.showInCarousel}
                onValueChange={(v) => updateField('showInCarousel', v)}
                trackColor={{ false: Colors.borderLight, true: Colors.teal + '60' }}
                thumbColor={form.showInCarousel ? Colors.teal : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={modalStyles.saveBtnText}>Create Prize Campaign</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function RewardSettingsScreen() {
  const router = useRouter();
  const [rewardRules, setRewardRules] = useState<RewardRule[]>(defaultRewardRules);
  const [tiers, setTiers] = useState<SimpleTier[]>(defaultTiers);
  const [prizes, setPrizes] = useState<BusinessPrize[]>(mockBusinessPrizes.filter(p => p.businessId === 'b1'));
  const [showCreatePrize, setShowCreatePrize] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'tiers' | 'prizes'>('overview');

  const maxTierCount = useMemo(() => Math.max(...mockTierAnalytics.map(t => t.memberCount)), []);

  const handleTierPointsChange = useCallback((id: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const points = numericValue === '' ? 0 : parseInt(numericValue, 10);
    setTiers(prev => prev.map(t => t.id === id ? { ...t, points } : t));
  }, []);

  const handleTierRewardChange = useCallback((id: string, value: string) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, reward: value } : t));
  }, []);

  const handleSaveTiers = useCallback(() => {
    Alert.alert('Saved', 'Reward tiers updated. Changes will reflect in the member carousel.');
    console.log('Updated tiers:', tiers);
  }, [tiers]);

  const handlePointsChange = useCallback((id: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const points = numericValue === '' ? 0 : parseInt(numericValue, 10);
    setRewardRules(prev => prev.map(r => r.id === id ? { ...r, points } : r));
  }, []);

  const handleSavePoints = useCallback(() => {
    Alert.alert('Saved', 'Point values updated. Members will earn at the new rates.');
    console.log('Updated reward rules:', rewardRules);
  }, [rewardRules]);

  const handleCreatePrize = useCallback((form: NewPrizeForm) => {
    const newPrize: BusinessPrize = {
      id: `bp_new_${Date.now()}`,
      businessId: 'b1',
      businessName: 'Rivera Coffee Co.',
      businessAvatar: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&h=200&fit=crop',
      title: form.title,
      description: form.description,
      prizeType: form.prizeType,
      status: 'active',
      pointsCost: parseInt(form.pointsCost || '0', 10),
      tierRequired: form.tierRequired || undefined,
      totalEntries: 0,
      maxWinners: parseInt(form.maxWinners || '1', 10),
      winnersSelected: 0,
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      accentColor: prizeTypeLabels[form.prizeType].color,
      iconBg: prizeTypeLabels[form.prizeType].color + '20',
    };
    setPrizes(prev => [newPrize, ...prev]);
    Alert.alert(
      'Prize Created!',
      form.showInCarousel
        ? 'Your prize is live and winners will appear in the Points & Prizes carousel on member newsfeeds.'
        : 'Your prize is live. Winners will not appear in the newsfeed carousel.',
    );
    console.log('New prize created:', newPrize);
  }, []);

  const handleEditPrize = useCallback((prize: BusinessPrize) => {
    Alert.alert(
      prize.title,
      `Type: ${prizeTypeLabels[prize.prizeType].label}\nEntries: ${prize.totalEntries}\nWinners: ${prize.winnersSelected}/${prize.maxWinners}\n\nWinners from this prize appear in the Points & Prizes carousel on the personal newsfeed.`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: prize.status === 'active' ? 'End Campaign' : 'Reactivate',
          style: prize.status === 'active' ? 'destructive' : 'default',
          onPress: () => {
            setPrizes(prev => prev.map(p =>
              p.id === prize.id
                ? { ...p, status: (p.status === 'active' ? 'ended' : 'active') as BusinessPrize['status'] }
                : p
            ));
          },
        },
        {
          text: 'Select Winner',
          onPress: () => {
            Alert.alert('Winner Selected!', 'The winner will be notified and their achievement will appear in the Points & Prizes carousel on member newsfeeds.');
            setPrizes(prev => prev.map(p =>
              p.id === prize.id ? { ...p, winnersSelected: p.winnersSelected + 1 } : p
            ));
          },
        },
      ],
    );
  }, []);

  const tabs = useMemo(() => [
    { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { key: 'points' as const, label: 'Points', icon: Zap },
    { key: 'tiers' as const, label: 'Tiers', icon: Crown },
    { key: 'prizes' as const, label: 'Prizes', icon: Gift },
  ], []);

  const totalPoints = useMemo(() => mockTierAnalytics.reduce((s, t) => s + t.memberCount, 0), []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.bannerText} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Rewards Manager</Text>
          <Text style={styles.subtitle}>Configure rewards & feed carousel</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <TabIcon size={15} color={isActive ? Colors.navyDark : Colors.textTertiary} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {activeTab === 'overview' && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <TrendingUp size={22} color={Colors.teal} />
                <Text style={styles.statValue}>{totalPoints.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Members</Text>
              </View>
              <View style={styles.statCard}>
                <Trophy size={22} color={Colors.lavender} />
                <Text style={styles.statValue}>45,200</Text>
                <Text style={styles.statLabel}>Points Given</Text>
              </View>
              <View style={styles.statCard}>
                <Gift size={22} color="#F59E0B" />
                <Text style={styles.statValue}>{prizes.filter(p => p.status === 'active').length}</Text>
                <Text style={styles.statLabel}>Active Prizes</Text>
              </View>
            </View>

            <View style={styles.carouselPreviewSection}>
              <View style={styles.carouselPreviewHeader}>
                <View style={styles.carouselPreviewTitleRow}>
                  <Eye size={16} color={Colors.lavender} />
                  <Text style={styles.carouselPreviewTitle}>Newsfeed Carousel Preview</Text>
                </View>
                <Text style={styles.carouselPreviewDesc}>How your rewards appear to members</Text>
              </View>
              <View style={styles.carouselPreviewBox}>
                <View style={styles.carouselMockHeader}>
                  <Zap size={14} color="#F59E0B" />
                  <Text style={styles.carouselMockTitle}>Points & Prizes</Text>
                </View>
                <CarouselPreview />
              </View>
            </View>

            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Member Tier Distribution</Text>
              </View>
              <View style={analyticsStyles.container}>
                {mockTierAnalytics.map((tier) => (
                  <TierAnalyticsBar key={tier.tierName} tier={tier} maxCount={maxTierCount} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Prize Campaigns</Text>
                <TouchableOpacity onPress={() => setActiveTab('prizes')}>
                  <Text style={styles.editText}>View All</Text>
                </TouchableOpacity>
              </View>
              {prizes.filter(p => p.status === 'active').slice(0, 2).map((prize) => (
                <PrizeCard key={prize.id} prize={prize} onEdit={() => handleEditPrize(prize)} />
              ))}
            </View>
          </>
        )}

        {activeTab === 'points' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Guideline 1 point=£.001 value</Text>
              <TouchableOpacity onPress={handleSavePoints}>
                <Text style={styles.editText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoCard}>
              <Sparkles size={16} color={Colors.lavender} />
              <Text style={styles.infoCardText}>
                Points earned by members through these actions determine their tier level and eligibility for prizes shown in the newsfeed carousel.
              </Text>
            </View>
            {rewardRules.map(rule => (
              <RewardRuleCard key={rule.id} rule={rule} onPointsChange={handlePointsChange} />
            ))}
          </View>
        )}

        {activeTab === 'tiers' && (
          <>
            <View style={styles.tiersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.tiersSectionTitle}>Reward Tiers</Text>
                <TouchableOpacity onPress={handleSaveTiers}>
                  <Text style={styles.editText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.infoCard}>
                <Crown size={16} color="#FFD000" />
                <Text style={styles.infoCardText}>
                  When members reach a new tier, it appears as a "Level Up" achievement in the Points & Prizes carousel on the personal newsfeed.
                </Text>
              </View>
              <Text style={styles.tiersSectionSubtitle}>Set up your points thresholds & rewards</Text>
              <View style={styles.tiersCard}>
                {tiers.map((tier, i) => {
                  const analytics = mockTierAnalytics.find(a => a.tierName === tier.name);
                  return (
                    <SimpleTierRow
                      key={tier.id}
                      tier={tier}
                      index={i}
                      total={tiers.length}
                      analytics={analytics}
                      onPointsChange={handleTierPointsChange}
                      onRewardChange={handleTierRewardChange}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tier Distribution</Text>
              </View>
              <View style={analyticsStyles.container}>
                {mockTierAnalytics.map((tier) => (
                  <TierAnalyticsBar key={tier.tierName} tier={tier} maxCount={maxTierCount} />
                ))}
              </View>
            </View>
          </>
        )}

        {activeTab === 'prizes' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prize Campaigns</Text>
              <TouchableOpacity
                style={styles.addPrizeBtn}
                onPress={() => setShowCreatePrize(true)}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.addPrizeBtnText}>New Prize</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoCard}>
              <Trophy size={16} color="#F59E0B" />
              <Text style={styles.infoCardText}>
                Prize winners are automatically showcased in the Points & Prizes carousel on the personal newsfeed, driving engagement and excitement.
              </Text>
            </View>
            {prizes.length === 0 ? (
              <View style={styles.emptyPrizes}>
                <Gift size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyPrizesText}>No prizes yet</Text>
                <Text style={styles.emptyPrizesDesc}>Create your first prize campaign to engage members</Text>
              </View>
            ) : (
              prizes.map((prize) => (
                <PrizeCard key={prize.id} prize={prize} onEdit={() => handleEditPrize(prize)} />
              ))
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <CreatePrizeModal
        visible={showCreatePrize}
        onClose={() => setShowCreatePrize(false)}
        onSave={handleCreatePrize}
      />
    </View>
  );
}

const previewStyles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  cardOuter: {
    overflow: 'visible',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  valueBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  valueText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#fff',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
    gap: 6,
  },
  memberAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  memberName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  timestamp: {
    fontSize: 9,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    width: 16,
    backgroundColor: Colors.navyDark,
    borderRadius: 3,
  },
});

const analyticsStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: 6,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  barContainer: {
    flex: 1,
    height: 14,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 7,
    overflow: 'hidden' as const,
    marginHorizontal: 8,
  },
  bar: {
    height: 14,
    borderRadius: 7,
  },
  tierStats: {
    alignItems: 'flex-end',
    width: 60,
  },
  tierCount: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  tierPercent: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
});

const prizeStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  typeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  prizeTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  prizeDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 12,
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  tierChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tierChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  tierChipSelected: {
    backgroundColor: Colors.navyDark,
    borderColor: Colors.navyDark,
  },
  tierChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tierChipTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  switchDesc: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: Colors.navyDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.banner,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.banner,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.bannerText,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,215,0,0.7)',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabBar: {
    backgroundColor: Colors.banner,
    paddingBottom: 12,
  },
  tabBarInner: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.navyMid,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  tabLabelActive: {
    color: Colors.navyDark,
  },
  scroll: {
    paddingBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 3,
    letterSpacing: 0.1,
    textAlign: 'center' as const,
  },
  carouselPreviewSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  carouselPreviewHeader: {
    marginBottom: 10,
  },
  carouselPreviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carouselPreviewTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  carouselPreviewDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
    marginLeft: 22,
  },
  carouselPreviewBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  carouselMockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  carouselMockTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
  analyticsSection: {
    marginTop: 20,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  editText: {
    fontSize: 13,
    color: Colors.teal,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  infoCardText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  addPrizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addPrizeBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  emptyPrizes: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyPrizesText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyPrizesDesc: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  ruleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ruleAction: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  ruleDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  rulePointsEditable: {
    alignItems: 'center',
    minWidth: 70,
  },
  pointsInput: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.navyDark,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border ?? '#ddd',
    textAlign: 'center' as const,
    width: 64,
    height: 36,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  rulePointsUnit: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  tiersSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  tiersSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  tiersSectionSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
    marginBottom: 12,
  },
  tiersCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tierRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tierIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierDetails: {
    flex: 1,
    marginLeft: 12,
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  tierMemberCount: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden' as const,
  },
  tierPointsBadge: {
    alignItems: 'center',
  },
  tierPointsInput: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center' as const,
    width: 68,
    height: 34,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  tierRewardInput: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 30,
  },
  tierPointsUnit: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    marginTop: 1,
  },
});

