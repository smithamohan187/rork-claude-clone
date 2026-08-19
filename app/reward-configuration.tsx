import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import {
  Button,
  Surface,
  Text,
  TextInput,
  Switch,
  IconButton,
  Portal,
  Modal as PaperModal,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import {
  ArrowLeft,
  Gift,
  Plus,
  Sparkles,
  Coins,
  Users,
  Share2,
  ShoppingBag,
  X,
  Percent,
  Package,
  Star,
  Trash2,
  Pencil,
} from 'lucide-react-native';
import {
  fetchRewardConfig,
  upsertRewardConfig,
  createReward,
  updateReward,
  deleteReward,
  type RewardItem,
} from '@/api/services/rewardConfigService';
import { fetchMyBusinessId } from '@/api/services/businessDashboardService';
import { useAuth } from '@/contexts/AuthContext';

const PURPLE = '#1A5C35';
const PURPLE_SOFT = '#E8F5EE';
const TEAL = '#0D9488';
const AMBER = '#F59E0B';
const TEXT = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F7F6FB';

type PrizeType = 'discount' | 'free_item' | 'perk';

const PRIZE_TYPE_META: Record<PrizeType, { label: string; color: string; icon: React.ElementType }> = {
  discount: { label: 'Discount', color: PURPLE, icon: Percent },
  free_item: { label: 'Free Item', color: TEAL, icon: Package },
  perk: { label: 'Perk', color: AMBER, icon: Star },
};

export default function RewardConfigurationScreen() {
  const router = useRouter();
  const { authLoading, isAuthenticated } = useAuth();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading]   = useState<boolean>(true);
  const [saving, setSaving]     = useState<boolean>(false);

  // Base config
  const [welcomePoints,  setWelcomePoints]  = useState<string>('');
  const [referralPoints, setReferralPoints] = useState<string>('');
  const [sharingPoints,  setSharingPoints]  = useState<string>('');
  const [purchaseEnabled, setPurchaseEnabled] = useState<boolean>(true);
  const [pointsPerUnit,  setPointsPerUnit]  = useState<string>('');

  // Collections
  const [prizes, setPrizes] = useState<RewardItem[]>([]);

  // Prize modal
  const [showPrizeModal, setShowPrizeModal] = useState<boolean>(false);
  const [prizeName,      setPrizeName]      = useState<string>('');
  const [prizeDesc,      setPrizeDesc]      = useState<string>('');
  const [prizeType,      setPrizeType]      = useState<PrizeType>('discount');
  const [prizePoints,    setPrizePoints]    = useState<string>('');
  const [prizeStock,     setPrizeStock]     = useState<string>('');
  const [savingPrize,    setSavingPrize]    = useState<boolean>(false);

  // Edit mode tracking
  const [editingPrize, setEditingPrize] = useState<RewardItem | null>(null);

  const resetPrizeForm = useCallback(() => {
    setPrizeName('');
    setPrizeDesc('');
    setPrizeType('discount');
    setPrizePoints('');
    setPrizeStock('');
  }, []);

  const handleOpenAddPrize = useCallback(() => {
    setEditingPrize(null);
    resetPrizeForm();
    setShowPrizeModal(true);
  }, [resetPrizeForm]);

  const handleOpenEditPrize = useCallback((prize: RewardItem) => {
    setEditingPrize(prize);
    setPrizeName(prize.name);
    setPrizeDesc(prize.description ?? '');
    setPrizeType(prize.type ?? 'perk');
    setPrizePoints(String(prize.points_required));
    setPrizeStock(prize.quantity_available != null ? String(prize.quantity_available) : '');
    setShowPrizeModal(true);
  }, []);

  // Resolve the businessId once auth has finished restoring — firing this before authLoading
  // settles hits /businesses/me with no access token yet, 401s, and silently leaves businessId
  // null forever (fetchMyBusinessId swallows the error), so the screen never loads.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchMyBusinessId().then(id => setBusinessId(id));
  }, [authLoading, isAuthenticated]);

  const loadConfig = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await fetchRewardConfig(businessId);
      if (data.config) {
        setWelcomePoints(String(data.config.welcome_bonus_points ?? ''));
        setReferralPoints(String(data.config.referral_bonus_points ?? ''));
        setSharingPoints(String(data.config.share_points ?? ''));
        setPurchaseEnabled(data.config.purchase_enabled ?? true);
        // points_per_rupee comes back as a fixed-precision DECIMAL string (e.g. "2.5000") —
        // normalize it so the field shows "2.5" instead of the raw DB precision.
        setPointsPerUnit(
          data.config.points_per_rupee != null ? String(parseFloat(String(data.config.points_per_rupee))) : ''
        );
      }
      setPrizes(data.rewards);
    } catch (err) {
      if (__DEV__) console.log('[RewardConfig] load error', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // Fires whenever businessId resolves (loadConfig's identity changes with it) — useFocusEffect
  // alone isn't enough because it only re-runs on focus events, not on businessId settling after
  // its async fetch, which left the screen stuck on the loading spinner on first mount.
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useFocusEffect(useCallback(() => {
    loadConfig();
  }, [loadConfig]));

  const handleSaveConfig = useCallback(async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      await upsertRewardConfig(businessId, {
        welcome_bonus_points:  parseInt(welcomePoints  || '0', 10),
        referral_bonus_points: parseInt(referralPoints || '0', 10),
        share_points:          parseInt(sharingPoints  || '0', 10),
        purchase_enabled:      purchaseEnabled,
        points_per_rupee:      parseFloat(pointsPerUnit || '0'),
      });
      Alert.alert('Configuration Saved', 'Your reward program has been updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [businessId, welcomePoints, referralPoints, sharingPoints, purchaseEnabled, pointsPerUnit]);

  const handleSavePrize = useCallback(async () => {
    if (!prizeName.trim()) {
      Alert.alert('Missing name', 'Please enter a prize name.');
      return;
    }
    const pts = parseInt(prizePoints || '0', 10);
    if (!pts || pts < 1) {
      Alert.alert('Missing points', 'Please enter the required points.');
      return;
    }
    setSavingPrize(true);
    try {
      const stock = prizeStock.trim() ? parseInt(prizeStock, 10) : null;
      const qty = stock && !isNaN(stock) ? stock : null;
      const payload = {
        name:               prizeName.trim(),
        description:        prizeDesc.trim() || null,
        type:               prizeType,
        points_required:    pts,
        quantity_available: qty,
      };
      if (editingPrize) {
        const updated = await updateReward(editingPrize.id, payload);
        setPrizes(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const reward = await createReward(payload);
        setPrizes(prev => [reward, ...prev]);
      }
      resetPrizeForm();
      setEditingPrize(null);
      setShowPrizeModal(false);
    } catch (err) {
      Alert.alert('Error', editingPrize ? 'Failed to update prize. Please try again.' : 'Failed to add prize. Please try again.');
    } finally {
      setSavingPrize(false);
    }
  }, [editingPrize, prizeName, prizeDesc, prizeType, prizePoints, prizeStock, resetPrizeForm]);

  const handleRemovePrize = useCallback((id: string) => {
    Alert.alert(
      'Delete Prize',
      'This prize will no longer appear to members. Existing redemptions are preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReward(id);
              setPrizes(prev => prev.filter(p => p.id !== id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete prize. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

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
          <Text style={styles.headerSubtitle}>Points & prizes</Text>
        </View>
        <View style={styles.headerIconWrap}>
          <Sparkles size={18} color="#fff" />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={PURPLE} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Points Setup ─────────────────────────────────────── */}
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
                  onChangeText={(t) => setPointsPerUnit(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
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

          {/* ── Rewards Catalog ───────────────────────────────────── */}
          <Surface style={styles.section} elevation={1}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: PURPLE_SOFT }]}>
                <Gift size={18} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Rewards Catalog</Text>
                <Text style={styles.sectionDesc}>{prizes.length} active prizes</Text>
              </View>
              <Button
                mode="contained-tonal"
                icon={() => <Plus size={16} color={PURPLE} />}
                onPress={handleOpenAddPrize}
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
                const meta = PRIZE_TYPE_META[prize.type ?? 'perk'];
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
                      {!!prize.description && (
                        <Text style={styles.prizeDesc} numberOfLines={2}>{prize.description}</Text>
                      )}
                      <View style={styles.prizeMetaRow}>
                        <View style={styles.prizeMeta}>
                          <Coins size={12} color={MUTED} />
                          <Text style={styles.prizeMetaText}>{prize.points_required.toLocaleString()} pts</Text>
                        </View>
                        {prize.quantity_available !== null && prize.quantity_available !== undefined && (
                          <View style={styles.prizeMeta}>
                            <Package size={12} color={MUTED} />
                            <Text style={styles.prizeMetaText}>{prize.quantity_available} left</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <IconButton
                      icon={() => <Pencil size={16} color={PURPLE} />}
                      onPress={() => handleOpenEditPrize(prize)}
                      size={18}
                      testID={`edit-prize-${prize.id}`}
                    />
                    <IconButton
                      icon={() => <Trash2 size={16} color="#EF4444" />}
                      onPress={() => handleRemovePrize(prize.id)}
                      size={18}
                      testID={`remove-prize-${prize.id}`}
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
            loading={saving}
            disabled={saving}
            testID="save-config"
          >
            Save Configuration
          </Button>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <Portal>
        {/* ── Add / Edit Prize Modal ───────────────────────────── */}
        <PaperModal
          visible={showPrizeModal}
          onDismiss={() => { setShowPrizeModal(false); setEditingPrize(null); resetPrizeForm(); }}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingPrize ? 'Edit Prize' : 'Add New Prize'}</Text>
            <IconButton icon={() => <X size={20} color={TEXT} />} onPress={() => { setShowPrizeModal(false); setEditingPrize(null); resetPrizeForm(); }} />
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
              loading={savingPrize}
              disabled={savingPrize}
              testID="save-prize"
            >
              {editingPrize ? 'Save Changes' : 'Add Prize'}
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
  loadingWrap: {
    flex: 1,
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
