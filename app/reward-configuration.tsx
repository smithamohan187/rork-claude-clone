import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Button,
  Surface,
  Text,
  TextInput,
  Switch,
  Chip,
  IconButton,
  Portal,
  Modal as PaperModal,
  Divider,
  Badge,
} from 'react-native-paper';
import {
  ArrowLeft,
  Gift,
  Plus,
  Trophy,
  Sparkles,
  Coins,
  Users,
  Share2,
  ShoppingBag,
  X,
  Tag,
  Percent,
  Package,
  Star,
  Trash2,
} from 'lucide-react-native';

const PURPLE = '#1A5C35';
const PURPLE_SOFT = '#E8F5EE';
const TEAL = '#0D9488';
const AMBER = '#F59E0B';
const TEXT = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F7F6FB';

type BadgeColor = '#CD7F32' | '#A8A9AD' | '#FFC107' | '#1A5C35';

interface Tier {
  id: string;
  name: string;
  minPoints: number;
  benefits: string[];
  color: BadgeColor;
}

type PrizeType = 'discount' | 'free_item' | 'perk';

interface Prize {
  id: string;
  name: string;
  description: string;
  type: PrizeType;
  points: number;
  stockLimit?: number;
  active: boolean;
}

const BADGE_COLORS: BadgeColor[] = ['#CD7F32', '#A8A9AD', '#FFC107', '#1A5C35'];

const PRIZE_TYPE_META: Record<PrizeType, { label: string; color: string; icon: React.ElementType }> = {
  discount: { label: 'Discount', color: PURPLE, icon: Percent },
  free_item: { label: 'Free Item', color: TEAL, icon: Package },
  perk: { label: 'Perk', color: AMBER, icon: Star },
};

const INITIAL_TIERS: Tier[] = [
  { id: 't1', name: 'Bronze', minPoints: 0, benefits: ['5% off', 'Birthday treat'], color: '#CD7F32' },
  { id: 't2', name: 'Silver', minPoints: 500, benefits: ['10% off', 'Early access', 'Free shipping'], color: '#A8A9AD' },
  { id: 't3', name: 'Gold', minPoints: 1500, benefits: ['15% off', 'VIP events', 'Priority support', 'Free drink'], color: '#FFC107' },
];

const INITIAL_PRIZES: Prize[] = [
  { id: 'p1', name: '10% Off Next Order', description: 'One-time discount on your next purchase', type: 'discount', points: 200, active: true },
  { id: 'p2', name: 'Free Coffee', description: 'Redeem for any medium coffee', type: 'free_item', points: 350, stockLimit: 50, active: true },
  { id: 'p3', name: 'VIP Lounge Access', description: 'Priority seating for one visit', type: 'perk', points: 800, active: false },
];

export default function RewardConfigurationScreen() {
  const router = useRouter();

  const [welcomePoints, setWelcomePoints] = useState<string>('100');
  const [referralPoints, setReferralPoints] = useState<string>('50');
  const [sharingPoints, setSharingPoints] = useState<string>('10');
  const [purchaseEnabled, setPurchaseEnabled] = useState<boolean>(true);
  const [pointsPerUnit, setPointsPerUnit] = useState<string>('1');

  const [tiers, setTiers] = useState<Tier[]>(INITIAL_TIERS);
  const [prizes, setPrizes] = useState<Prize[]>(INITIAL_PRIZES);

  const [showTierModal, setShowTierModal] = useState<boolean>(false);
  const [showPrizeModal, setShowPrizeModal] = useState<boolean>(false);

  const [tierName, setTierName] = useState<string>('');
  const [tierMin, setTierMin] = useState<string>('');
  const [tierBenefits, setTierBenefits] = useState<string[]>([]);
  const [tierBenefitDraft, setTierBenefitDraft] = useState<string>('');
  const [tierColor, setTierColor] = useState<BadgeColor>(BADGE_COLORS[3]);

  const [prizeName, setPrizeName] = useState<string>('');
  const [prizeDesc, setPrizeDesc] = useState<string>('');
  const [prizeType, setPrizeType] = useState<PrizeType>('discount');
  const [prizePoints, setPrizePoints] = useState<string>('');
  const [prizeStock, setPrizeStock] = useState<string>('');

  const resetTierForm = useCallback(() => {
    setTierName('');
    setTierMin('');
    setTierBenefits([]);
    setTierBenefitDraft('');
    setTierColor(BADGE_COLORS[3]);
  }, []);

  const resetPrizeForm = useCallback(() => {
    setPrizeName('');
    setPrizeDesc('');
    setPrizeType('discount');
    setPrizePoints('');
    setPrizeStock('');
  }, []);

  const handleAddBenefit = useCallback(() => {
    const v = tierBenefitDraft.trim();
    if (!v) return;
    setTierBenefits(prev => [...prev, v]);
    setTierBenefitDraft('');
  }, [tierBenefitDraft]);

  const handleRemoveBenefit = useCallback((idx: number) => {
    setTierBenefits(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSaveTier = useCallback(() => {
    if (!tierName.trim()) {
      Alert.alert('Missing name', 'Please enter a tier name.');
      return;
    }
    const min = parseInt(tierMin || '0', 10);
    const newTier: Tier = {
      id: `t_${Date.now()}`,
      name: tierName.trim(),
      minPoints: isNaN(min) ? 0 : min,
      benefits: tierBenefits,
      color: tierColor,
    };
    setTiers(prev => [...prev, newTier].sort((a, b) => a.minPoints - b.minPoints));
    resetTierForm();
    setShowTierModal(false);
  }, [tierName, tierMin, tierBenefits, tierColor, resetTierForm]);

  const handleRemoveTier = useCallback((id: string) => {
    setTiers(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSavePrize = useCallback(() => {
    if (!prizeName.trim()) {
      Alert.alert('Missing name', 'Please enter a prize name.');
      return;
    }
    const pts = parseInt(prizePoints || '0', 10);
    const stock = prizeStock.trim() ? parseInt(prizeStock, 10) : undefined;
    const newPrize: Prize = {
      id: `p_${Date.now()}`,
      name: prizeName.trim(),
      description: prizeDesc.trim(),
      type: prizeType,
      points: isNaN(pts) ? 0 : pts,
      stockLimit: stock && !isNaN(stock) ? stock : undefined,
      active: true,
    };
    setPrizes(prev => [newPrize, ...prev]);
    resetPrizeForm();
    setShowPrizeModal(false);
  }, [prizeName, prizeDesc, prizeType, prizePoints, prizeStock, resetPrizeForm]);

  const togglePrizeActive = useCallback((id: string) => {
    setPrizes(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }, []);

  const handleSaveConfig = useCallback(() => {
    console.log('[RewardConfig] Saving', {
      welcomePoints, referralPoints, sharingPoints, purchaseEnabled, pointsPerUnit,
      tiers, prizes,
    });
    Alert.alert('Configuration Saved', 'Your reward program has been updated successfully.');
  }, [welcomePoints, referralPoints, sharingPoints, purchaseEnabled, pointsPerUnit, tiers, prizes]);

  const paperTheme = useMemo(() => ({
    colors: { primary: PURPLE },
  }), []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7} testID="back-btn">
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Reward Configuration</Text>
          <Text style={styles.headerSubtitle}>Points, tiers & prizes</Text>
        </View>
        <View style={styles.headerIconWrap}>
          <Sparkles size={18} color="#fff" />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: PURPLE_SOFT }]}>
              <Coins size={18} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Points Setup</Text>
              <Text style={styles.sectionDesc}>Define how members earn points</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Users size={14} color={MUTED} />
              <Text style={styles.fieldLabel}>Welcome Points</Text>
            </View>
            <Text style={styles.fieldHint}>Points awarded when user subscribes</Text>
            <TextInput
              mode="outlined"
              value={welcomePoints}
              onChangeText={(t) => setWelcomePoints(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              right={<TextInput.Affix text="pts" />}
              theme={paperTheme}
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              style={styles.input}
              testID="welcome-points"
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Share2 size={14} color={MUTED} />
              <Text style={styles.fieldLabel}>Referral Points</Text>
            </View>
            <Text style={styles.fieldHint}>Points when user refers a friend</Text>
            <TextInput
              mode="outlined"
              value={referralPoints}
              onChangeText={(t) => setReferralPoints(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              right={<TextInput.Affix text="pts" />}
              theme={paperTheme}
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              style={styles.input}
              testID="referral-points"
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Share2 size={14} color={MUTED} />
              <Text style={styles.fieldLabel}>Sharing Points</Text>
            </View>
            <Text style={styles.fieldHint}>Points when user shares an offer</Text>
            <TextInput
              mode="outlined"
              value={sharingPoints}
              onChangeText={(t) => setSharingPoints(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              right={<TextInput.Affix text="pts" />}
              theme={paperTheme}
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              style={styles.input}
              testID="sharing-points"
            />
          </View>

          <View style={styles.switchCard}>
            <View style={styles.switchCardLeft}>
              <View style={[styles.switchIcon, { backgroundColor: PURPLE_SOFT }]}>
                <ShoppingBag size={16} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Purchase Points</Text>
                <Text style={styles.switchSub}>Reward members on every purchase</Text>
              </View>
            </View>
            <Switch
              value={purchaseEnabled}
              onValueChange={setPurchaseEnabled}
              color={PURPLE}
              testID="purchase-toggle"
            />
          </View>

          {purchaseEnabled && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Points per unit</Text>
              <Text style={styles.fieldHint}>Points earned per £1 spent</Text>
              <TextInput
                mode="outlined"
                value={pointsPerUnit}
                onChangeText={(t) => setPointsPerUnit(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                right={<TextInput.Affix text="pts / £" />}
                theme={paperTheme}
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                style={styles.input}
                testID="points-per-unit"
              />
            </View>
          )}
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: PURPLE_SOFT }]}>
              <Trophy size={18} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Reward Tiers</Text>
              <Text style={styles.sectionDesc}>{tiers.length} tiers configured</Text>
            </View>
            <Button
              mode="contained-tonal"
              icon={() => <Plus size={16} color={PURPLE} />}
              onPress={() => setShowTierModal(true)}
              buttonColor={PURPLE_SOFT}
              textColor={PURPLE}
              compact
              testID="add-tier"
            >
              Add Tier
            </Button>
          </View>

          <View style={styles.tiersList}>
            {tiers.map((tier) => (
              <Surface key={tier.id} style={styles.tierCard} elevation={0}>
                <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
                  <Text style={styles.tierBadgeText}>{tier.name.charAt(0)}</Text>
                </View>
                <View style={styles.tierInfo}>
                  <View style={styles.tierTopRow}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    <View style={styles.tierPointsPill}>
                      <Text style={styles.tierPointsText}>{tier.minPoints.toLocaleString()}+ pts</Text>
                    </View>
                  </View>
                  {tier.benefits.length > 0 && (
                    <View style={styles.chipRow}>
                      {tier.benefits.map((b, i) => (
                        <Chip
                          key={`${tier.id}-b-${i}`}
                          compact
                          style={styles.benefitChip}
                          textStyle={styles.benefitChipText}
                        >
                          {b}
                        </Chip>
                      ))}
                    </View>
                  )}
                </View>
                <IconButton
                  icon={() => <Trash2 size={16} color="#EF4444" />}
                  onPress={() => handleRemoveTier(tier.id)}
                  size={18}
                  testID={`remove-tier-${tier.id}`}
                />
              </Surface>
            ))}
          </View>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: PURPLE_SOFT }]}>
              <Gift size={18} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Rewards Catalog</Text>
              <Text style={styles.sectionDesc}>{prizes.filter(p => p.active).length} active · {prizes.length} total</Text>
            </View>
            <Button
              mode="contained-tonal"
              icon={() => <Plus size={16} color={PURPLE} />}
              onPress={() => setShowPrizeModal(true)}
              buttonColor={PURPLE_SOFT}
              textColor={PURPLE}
              compact
              testID="add-prize"
            >
              Add Prize
            </Button>
          </View>

          <View style={styles.prizesList}>
            {prizes.map((prize) => {
              const meta = PRIZE_TYPE_META[prize.type];
              const Icon = meta.icon;
              return (
                <Surface key={prize.id} style={styles.prizeCard} elevation={0}>
                  <View style={[styles.prizeIconWrap, { backgroundColor: meta.color + '15' }]}>
                    <Icon size={18} color={meta.color} />
                  </View>
                  <View style={styles.prizeInfo}>
                    <View style={styles.prizeTopRow}>
                      <Text style={styles.prizeName} numberOfLines={1}>{prize.name}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: meta.color + '15' }]}>
                        <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    {prize.description.length > 0 && (
                      <Text style={styles.prizeDesc} numberOfLines={2}>{prize.description}</Text>
                    )}
                    <View style={styles.prizeMetaRow}>
                      <View style={styles.prizeMeta}>
                        <Coins size={12} color={MUTED} />
                        <Text style={styles.prizeMetaText}>{prize.points.toLocaleString()} pts</Text>
                      </View>
                      {prize.stockLimit !== undefined && (
                        <View style={styles.prizeMeta}>
                          <Package size={12} color={MUTED} />
                          <Text style={styles.prizeMetaText}>{prize.stockLimit} left</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Switch
                    value={prize.active}
                    onValueChange={() => togglePrizeActive(prize.id)}
                    color={PURPLE}
                    testID={`toggle-prize-${prize.id}`}
                  />
                </Surface>
              );
            })}
          </View>
        </Surface>

        <Button
          mode="contained"
          onPress={handleSaveConfig}
          buttonColor={PURPLE}
          textColor="#fff"
          style={styles.saveBtn}
          contentStyle={styles.saveBtnContent}
          labelStyle={styles.saveBtnLabel}
          testID="save-config"
        >
          Save Configuration
        </Button>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Portal>
        <PaperModal
          visible={showTierModal}
          onDismiss={() => setShowTierModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Tier</Text>
            <IconButton icon={() => <X size={20} color={TEXT} />} onPress={() => setShowTierModal(false)} />
          </View>
          <Divider />
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 16 }}>
            <Text style={styles.modalLabel}>Tier name</Text>
            <TextInput
              mode="outlined"
              value={tierName}
              onChangeText={setTierName}
              placeholder="e.g. Platinum"
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              theme={paperTheme}
              style={styles.input}
              testID="tier-name-input"
            />

            <Text style={styles.modalLabel}>Minimum points</Text>
            <TextInput
              mode="outlined"
              value={tierMin}
              onChangeText={(t) => setTierMin(t.replace(/[^0-9]/g, ''))}
              placeholder="0"
              keyboardType="number-pad"
              right={<TextInput.Affix text="pts" />}
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              theme={paperTheme}
              style={styles.input}
              testID="tier-min-input"
            />

            <Text style={styles.modalLabel}>Benefits</Text>
            <View style={styles.benefitInputRow}>
              <TextInput
                mode="outlined"
                value={tierBenefitDraft}
                onChangeText={setTierBenefitDraft}
                placeholder="e.g. 20% off"
                outlineColor={BORDER}
                activeOutlineColor={PURPLE}
                theme={paperTheme}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                onSubmitEditing={handleAddBenefit}
                returnKeyType="done"
                left={<TextInput.Icon icon={() => <Tag size={16} color={MUTED} />} />}
                testID="benefit-input"
              />
              <Button
                mode="contained"
                onPress={handleAddBenefit}
                buttonColor={PURPLE}
                textColor="#fff"
                compact
                style={styles.benefitAddBtn}
              >
                Add
              </Button>
            </View>
            {tierBenefits.length > 0 && (
              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {tierBenefits.map((b, i) => (
                  <Chip
                    key={`draft-b-${i}`}
                    compact
                    onClose={() => handleRemoveBenefit(i)}
                    style={styles.benefitChip}
                    textStyle={styles.benefitChipText}
                  >
                    {b}
                  </Chip>
                ))}
              </View>
            )}

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Badge colour</Text>
            <View style={styles.colorRow}>
              {BADGE_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setTierColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    tierColor === c && styles.colorSwatchActive,
                  ]}
                  activeOpacity={0.8}
                  testID={`color-${c}`}
                />
              ))}
            </View>

            <Button
              mode="contained"
              onPress={handleSaveTier}
              buttonColor={PURPLE}
              textColor="#fff"
              style={[styles.saveBtn, { marginTop: 20 }]}
              contentStyle={styles.saveBtnContent}
              labelStyle={styles.saveBtnLabel}
              testID="save-tier"
            >
              Add Tier
            </Button>
          </ScrollView>
        </PaperModal>

        <PaperModal
          visible={showPrizeModal}
          onDismiss={() => setShowPrizeModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Prize</Text>
            <IconButton icon={() => <X size={20} color={TEXT} />} onPress={() => setShowPrizeModal(false)} />
          </View>
          <Divider />
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 16 }}>
            <Text style={styles.modalLabel}>Prize name</Text>
            <TextInput
              mode="outlined"
              value={prizeName}
              onChangeText={setPrizeName}
              placeholder="e.g. Free Dessert"
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              theme={paperTheme}
              style={styles.input}
              testID="prize-name-input"
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              mode="outlined"
              value={prizeDesc}
              onChangeText={setPrizeDesc}
              placeholder="Short description for members"
              multiline
              numberOfLines={3}
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              theme={paperTheme}
              style={[styles.input, { minHeight: 80 }]}
              testID="prize-desc-input"
            />

            <Text style={styles.modalLabel}>Reward type</Text>
            <View style={styles.typeRow}>
              {(Object.keys(PRIZE_TYPE_META) as PrizeType[]).map((key) => {
                const meta = PRIZE_TYPE_META[key];
                const Icon = meta.icon;
                const selected = prizeType === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setPrizeType(key)}
                    style={[
                      styles.typeOption,
                      selected && { borderColor: meta.color, backgroundColor: meta.color + '12' },
                    ]}
                    activeOpacity={0.75}
                    testID={`prize-type-${key}`}
                  >
                    <Icon size={16} color={selected ? meta.color : MUTED} />
                    <Text style={[styles.typeOptionText, selected && { color: meta.color }]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Required points</Text>
            <TextInput
              mode="outlined"
              value={prizePoints}
              onChangeText={(t) => setPrizePoints(t.replace(/[^0-9]/g, ''))}
              placeholder="0"
              keyboardType="number-pad"
              right={<TextInput.Affix text="pts" />}
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              theme={paperTheme}
              style={styles.input}
              testID="prize-points-input"
            />

            <Text style={styles.modalLabel}>Stock limit (optional)</Text>
            <TextInput
              mode="outlined"
              value={prizeStock}
              onChangeText={(t) => setPrizeStock(t.replace(/[^0-9]/g, ''))}
              placeholder="Leave empty for unlimited"
              keyboardType="number-pad"
              outlineColor={BORDER}
              activeOutlineColor={PURPLE}
              theme={paperTheme}
              style={styles.input}
              testID="prize-stock-input"
            />

            <Button
              mode="contained"
              onPress={handleSavePrize}
              buttonColor={PURPLE}
              textColor="#fff"
              style={[styles.saveBtn, { marginTop: 12 }]}
              contentStyle={styles.saveBtnContent}
              labelStyle={styles.saveBtnLabel}
              testID="save-prize"
            >
              Add Prize
            </Button>
          </ScrollView>
        </PaperModal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  safeTop: {
    backgroundColor: PURPLE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TEXT,
    letterSpacing: -0.2,
  },
  sectionDesc: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT,
  },
  fieldHint: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 4,
    fontSize: 14,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 12,
  },
  switchCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT,
  },
  switchSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  tiersList: {
    gap: 10,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  tierBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#fff',
  },
  tierInfo: {
    flex: 1,
  },
  tierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TEXT,
  },
  tierPointsPill: {
    backgroundColor: PURPLE_SOFT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tierPointsText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: PURPLE,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  benefitChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    height: 26,
  },
  benefitChipText: {
    fontSize: 11,
    color: TEXT,
    marginVertical: 0,
  },
  prizesList: {
    gap: 10,
  },
  prizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  prizeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeInfo: {
    flex: 1,
  },
  prizeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  prizeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700' as const,
    color: TEXT,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  prizeDesc: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 6,
    lineHeight: 16,
  },
  prizeMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  prizeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prizeMetaText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: MUTED,
  },
  saveBtn: {
    borderRadius: 14,
    marginTop: 4,
  },
  saveBtnContent: {
    height: 52,
  },
  saveBtnLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  modalContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 20,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TEXT,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT,
    marginBottom: 6,
    marginTop: 6,
  },
  benefitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitAddBtn: {
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: TEXT,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#fff',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: MUTED,
  },
});
