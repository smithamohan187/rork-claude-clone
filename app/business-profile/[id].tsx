import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Share,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Switch as RNSwitch,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Share2,
  Bookmark,
  Users,
  Tag,
  Gift,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  ChevronRight,
  Sparkles,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Pencil,
  XCircle,
  RefreshCw,
  MoreVertical,
  Plus,
  Camera,
  Image as ImageIcon,
  X,
  Trash2,
  MessageCircle,
  UserPlus,
  Zap,
  Trophy,
  Check,
} from 'lucide-react-native';
import { Switch, Snackbar, Dialog, Portal, Button as PaperButton, TextInput as PaperTextInput } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import { fetchRewardConfig, type RewardConfigFull } from '@/api/services/rewardConfigService';
import BusinessQRCard from '@/components/business/BusinessQRCard';
import { QrCode } from 'lucide-react-native';
import type { BusinessProfileData } from '@/mocks/businessProfile';
import { useBusinessOffers, type OfferFilter } from '@/hooks/useBusinessOffers';
import { useBusinessEvents, type EventFilter } from '@/hooks/useBusinessEvents';
import { useBusinessPosts, type PostFilter } from '@/hooks/useBusinessPosts';
import type { Offer } from '@/api/services/offersService';
import { StarRatingDisplay } from '@/components/ratings/StarRatingDisplay';
import { RatingBottomSheet } from '@/components/ratings/RatingBottomSheet';
import { useBusinessRating, type ReviewItem } from '@/hooks/useBusinessRating';
import { Star as StarIcon } from 'lucide-react-native';
import LikeButton from '@/components/feed/LikeButton';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import type { BusinessProfile } from '@/api/services/businessProfileService';
import { fetchBusinessCategories } from '@/api/services/categoriesService';
import { updateMyBusiness, type BusinessHour } from '@/api/services/businessService';
import CommentSheet from '@/components/feed/CommentSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useSavedBusiness } from '@/hooks/useSavedBusiness';
import MembersTab from '@/components/MembersTab';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ACCENT = '#1A5C35';
const ACCENT_LIGHT = '#EDE9F6';
const COVER_HEIGHT = 210;
const LOGO_SIZE = 80;


type TabKey = 'offers' | 'events' | 'posts' | 'about' | 'members';

type OfferStatus = 'active' | 'expired' | 'disabled';
type EventStatus = 'upcoming' | 'past' | 'cancelled';

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'offers', label: 'Offers' },
  { key: 'events', label: 'Events' },
  { key: 'posts', label: 'Posts' },
  { key: 'about', label: 'About' },
];

const OFFER_FILTERS: { key: OfferFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#1A5C35' },
  { key: 'active', label: 'Active', color: '#0F6E56' },
  { key: 'expired', label: 'Expired', color: '#888780' },
  { key: 'disabled', label: 'Disabled', color: '#E24B4A' },
];

const EVENT_FILTERS: { key: EventFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#1A5C35' },
  { key: 'upcoming', label: 'Upcoming', color: '#0F6E56' },
  { key: 'past', label: 'Past', color: '#888780' },
  { key: 'cancelled', label: 'Cancelled', color: '#E24B4A' },
];

const EVENT_STATUS_STYLES: Record<EventStatus, { bg: string; fg: string; label: string }> = {
  upcoming: { bg: '#E1F5EE', fg: '#0F6E56', label: 'Upcoming' },
  past: { bg: '#F1EFE8', fg: '#5F5E5A', label: 'Past' },
  cancelled: { bg: '#FCEBEB', fg: '#A32D2D', label: 'Cancelled' },
};

const DAYS_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_HOURS: BusinessHour[] = [0, 1, 2, 3, 4, 5, 6].map(day_of_week => ({
  day_of_week, open_time: '09:00', close_time: '18:00', is_closed: false,
}));

function validateDraft(
  draft: BusinessProfileData,
  categoryId: string,
  categories: { id: string }[],
  hours: BusinessHour[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = draft.name?.trim() ?? '';
  if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (name.length > 100) errors.name = 'Name must be at most 100 characters';
  if (!categoryId || !categories.some(c => c.id === categoryId))
    errors.category = 'Please select a valid category';
  if ((draft.description?.length ?? 0) > 500)
    errors.description = 'Description must be at most 500 characters';
  if (!draft.phone?.trim()) errors.phone = 'Phone is required';
  else if (!/^\+?[\d\s\-()+]{7,20}$/.test(draft.phone.trim()))
    errors.phone = 'Invalid phone number format';
  const addr = draft.address?.trim() ?? '';
  if (addr.length < 5) errors.address = 'Address must be at least 5 characters';
  hours.forEach(h => {
    if (!h.is_closed) {
      if (!h.open_time) errors[`hours_${h.day_of_week}`] = 'Open time required';
      else if (!h.close_time) errors[`hours_${h.day_of_week}`] = 'Close time required';
      else if (h.close_time <= h.open_time)
        errors[`hours_${h.day_of_week}`] = 'Close time must be after open time';
    }
  });
  return errors;
}

export default function BusinessProfileScreen() {
  const { id, subscribe: subscribeParam } = useLocalSearchParams<{ id: string; subscribe?: string }>();
  const { business: realBusiness, loading: profileLoading, error: profileError,
          formattedHours, formattedAddress } = useBusinessProfile(id ?? '');
  const { authUser, activeProfile } = useAuth();
  const { isSubscribed, isToggling, subscribe, unsubscribe } = useSubscription(id ?? '');
  const { isSaved, isSaving, save: saveBusinessFn, unsave: unsaveBusinessFn } = useSavedBusiness(id ?? '');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('offers');
  const [showSubscribeBanner, setShowSubscribeBanner] = useState<boolean>(
    subscribeParam === '1',
  );
  const subscribeBannerSlide = useRef(new Animated.Value(subscribeParam === '1' ? 0 : -80)).current;
  const [savedOffers, setSavedOffers] = useState<Record<string, boolean>>({});
  const [favTooltipVisible, setFavTooltipVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!favTooltipVisible) return;
    const t = setTimeout(() => setFavTooltipVisible(false), 1500);
    return () => clearTimeout(t);
  }, [favTooltipVisible]);
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleToggleFavorite = useCallback(() => {
    if (isSaving) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (isSaved) {
      unsaveBusinessFn();
    } else {
      saveBusinessFn();
    }
  }, [isSaving, isSaved, heartScale, saveBusinessFn, unsaveBusinessFn]);

  const tabUnderlineX = useRef(new Animated.Value(0)).current;

  const [rewardData, setRewardData] = useState<RewardConfigFull | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);

  const loadRewardConfig = useCallback(async () => {
    if (!id) return;
    setRewardLoading(true);
    try {
      const data = await fetchRewardConfig(id);
      setRewardData(data);
    } catch {
      // silent fail — sections render empty state
    } finally {
      setRewardLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadRewardConfig(); }, [loadRewardConfig]));

  const [offerFilter, setOfferFilter] = useState<OfferFilter>('active');
  const isOwner = useMemo(
    () => !!authUser && !!realBusiness && authUser.id === realBusiness.owner_user_id,
    [authUser, realBusiness],
  );
  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMsg, setSnackMsg] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; offerId: string | null }>({ visible: false, offerId: null });

  const EMPTY_BUSINESS: BusinessProfileData = {
    id: '', name: '', category: '', description: '',
    coverImage: '', logo: '', subscriberCount: 0, activeOfferCount: 0,
    welcomePoints: 0, phone: '', email: '', website: '',
    address: '', hours: '', founded: '',
  };
  const [business, setBusiness] = useState<BusinessProfileData>(EMPTY_BUSINESS);

  useEffect(() => {
    if (!realBusiness) return;
    setBusiness((prev) => ({
      ...prev,
      id:               realBusiness.id,
      name:             realBusiness.name,
      description:      realBusiness.description ?? '',
      category:         realBusiness.category_name ?? '',
      phone:            realBusiness.phone ?? '',
      website:          realBusiness.website ?? '',
      address:          formattedAddress,
      hours:            formattedHours,
      logo:             realBusiness.logo_url ?? prev.logo,
      coverImage:       realBusiness.cover_url ?? prev.coverImage,
      subscriberCount:  realBusiness.subscriber_count,
      welcomePoints:    prev.welcomePoints,
      activeOfferCount: realBusiness.active_offer_count ?? 0,
      updatedAt:        realBusiness.updated_at,
    }));
    setDraft((prev) => ({ ...prev, name: realBusiness.name }));
  }, [realBusiness, formattedAddress, formattedHours]);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<BusinessProfileData>(EMPTY_BUSINESS);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [draftCategoryId, setDraftCategoryId] = useState<string>('');
  const [draftHours, setDraftHours] = useState<BusinessHour[]>(DEFAULT_HOURS);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleStartEdit = useCallback(async () => {
    setDraft(business);
    setDraftCategoryId(realBusiness?.category_id ?? '');
    setDraftHours(
      realBusiness?.hours?.map(h => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time ?? undefined,
        close_time: h.close_time ?? undefined,
        is_closed: h.is_closed,
      })) ?? DEFAULT_HOURS,
    );
    setFieldErrors({});
    setSaveError(null);
    setCategoryDropdownOpen(false);
    setActiveTab('about');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const cats = await fetchBusinessCategories();
      setCategories(cats);
    } catch { /* non-fatal */ }
    setIsEditing(true);
  }, [business, realBusiness]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft(business);
    setFieldErrors({});
    setSaveError(null);
    setSaving(false);
  }, [business]);

  const handleSaveEdit = useCallback(async () => {
    const errors = validateDraft(draft, draftCategoryId, categories, draftHours);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateMyBusiness({
        business_name: draft.name.trim(),
        category_id: draftCategoryId,
        business_type: realBusiness?.business_type ?? 'goodwill',
        description: draft.description ?? '',
        phone: draft.phone ?? '',
        website: draft.website ?? '',
        address: draft.address ?? '',
        hours: draftHours,
        inhouse_referral: realBusiness?.inhouse_referral ?? false,
        inhouse_referral_url: realBusiness?.inhouse_referral_url ?? undefined,
      });
      setIsEditing(false);
      setSnackMsg('Business profile updated');
      setSnackVisible(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [draft, draftCategoryId, categories, draftHours, realBusiness]);

  const updateDraft = useCallback(<K extends keyof BusinessProfileData>(key: K, value: BusinessProfileData[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateDraftHour = useCallback((index: number, changes: Partial<BusinessHour>) => {
    setDraftHours(prev => prev.map((h, i) => i === index ? { ...h, ...changes } : h));
  }, []);

  const rating = useBusinessRating({
    businessId: id ?? business.id,
    isSubscriber: isSubscribed,
    isOwner: false,
    initialAverageRating: Number(realBusiness?.avg_rating ?? 0),
    initialRatingCount: Number(realBusiness?.rating_count ?? 0),
  });
  const [ratingSheetVisible, setRatingSheetVisible] = useState<boolean>(false);

  const handleOpenRatingSheet = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRatingSheetVisible(true);
  }, []);

  const handleSubmitRating = useCallback(
    async (stars: number, review: string) => {
      await rating.submitRating(stars, review);
      setRatingSheetVisible(false);
      setSnackMsg(rating.hasRated ? 'Your rating was updated' : 'Thanks for rating!');
      setSnackVisible(true);
    },
    [rating],
  );

  const handleDeleteRating = useCallback(async () => {
    await rating.deleteRating();
    setRatingSheetVisible(false);
    setSnackMsg('Your rating was removed');
    setSnackVisible(true);
  }, [rating]);
  const { offers: businessOffers, isLoading: offersLoading, toggleDisable: toggleOfferDisable } =
    useBusinessOffers(id ?? '', offerFilter);

  const handleRequestToggle = useCallback((offerId: string) => {
    const offer = businessOffers.find((o) => o.id === offerId);
    if (!offer) return;
    if (offer.effective_status === 'expired') return;
    if (offer.effective_status === 'active') {
      setConfirmDialog({ visible: true, offerId });
    } else {
      toggleOfferDisable(offerId, 'disabled');
    }
  }, [businessOffers, toggleOfferDisable]);

  const visibleTabs = useMemo(
    () => isOwner
      ? [...TAB_ITEMS, { key: 'members' as TabKey, label: 'Members' }]
      : TAB_ITEMS,
    [isOwner],
  );
  const tabWidth = useMemo(() => (SCREEN_WIDTH - 32) / visibleTabs.length, [visibleTabs.length]);

  const handleTabPress = useCallback(
    (tab: TabKey, index: number) => {
      setActiveTab(tab);
      Animated.spring(tabUnderlineX, {
        toValue: index * tabWidth,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }).start();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [tabUnderlineX, tabWidth],
  );

  const handleSubscribe = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await subscribe();
    if (showSubscribeBanner) {
      Animated.timing(subscribeBannerSlide, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }).start(() => setShowSubscribeBanner(false));
      setSnackMsg(`You're now subscribed to ${business.name}!`);
      setSnackVisible(true);
    }
  }, [subscribe, showSubscribeBanner, subscribeBannerSlide, business.name]);

  const handleUnsubscribe = useCallback(() => {
    Alert.alert(
      'Unsubscribe?',
      "You'll stop receiving offers and updates from this business.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unsubscribe', style: 'destructive', onPress: unsubscribe },
      ],
    );
  }, [unsubscribe]);

  const handleSaveOffer = useCallback((offerId: string) => {
    setSavedOffers((prev) => ({ ...prev, [offerId]: !prev[offerId] }));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log('[BusinessProfile] Toggled save for offer:', offerId);
  }, []);

  const handleOpenOffer = useCallback((offer: Offer) => {
    console.log('[BusinessProfile] Open offer:', offer.id);
    router.push({ pathname: '/view-offer', params: { offerId: offer.id, businessId: id ?? '' } } as never);
  }, [router, id]);

  const handleShareOffer = useCallback(async (offer: Offer) => {
    try {
      await Share.share({
        message: `Check out "${offer.title}" from ${business.name}! ${formatDiscount(offer)} — valid until ${formatDate(offer.expires_at ?? '')}`,
      });
    } catch (e) {
      console.log('[BusinessProfile] Share error:', e);
    }
  }, [business.name]);

  if (profileLoading && !business.name) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F5FA' }}>
        <ActivityIndicator size="large" color="#1A5C35" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.coverWrap}>
          <Image source={{ uri: business.coverImage + (business.updatedAt ? `?t=${business.updatedAt}` : '') }} style={styles.coverImage} contentFit="cover" />
          <View style={styles.coverOverlay} />
          {isEditing && (
            <View style={styles.coverCameraOverlay} pointerEvents="none">
              <View style={styles.cameraBadge}>
                <Camera size={16} color="#fff" />
                <Text style={styles.cameraBadgeText}>Change cover</Text>
              </View>
            </View>
          )}
          <SafeAreaView edges={['top']} style={styles.coverSafeArea}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={12}
              testID="business-profile-back"
            >
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            {isOwner ? (
              isEditing ? (
                <TouchableOpacity
                  style={styles.editHeaderBtn}
                  onPress={handleCancelEdit}
                  hitSlop={12}
                  testID="business-profile-cancel-edit"
                >
                  <X size={16} color="#fff" />
                  <Text style={styles.editHeaderBtnText}>Cancel</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.editHeaderBtn}
                  onPress={handleStartEdit}
                  hitSlop={12}
                  testID="business-profile-edit"
                >
                  <Pencil size={16} color="#fff" />
                  <Text style={styles.editHeaderBtnText}>Edit</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                style={styles.heartBtn}
                hitSlop={12}
                onPress={handleToggleFavorite}
                onLongPress={() => setFavTooltipVisible(true)}
                disabled={isSaving}
                accessibilityLabel="Bookmark this business"
                accessibilityHint="Save this business to your bookmarks"
                testID="business-profile-fav"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Heart
                      size={20}
                      color={isSaved ? '#E24B4A' : '#888780'}
                      fill={isSaved ? '#E24B4A' : 'transparent'}
                    />
                  </Animated.View>
                )}
              </TouchableOpacity>
            )}
            {favTooltipVisible && !isOwner && (
              <View style={styles.favTooltip} pointerEvents="none">
                <Text style={styles.favTooltipText}>Bookmark this business</Text>
              </View>
            )}
          </SafeAreaView>
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: business.logo + (business.updatedAt ? `?t=${business.updatedAt}` : '') }} style={styles.logo} contentFit="cover" />
            {isEditing && (
              <View style={styles.logoCameraOverlay} pointerEvents="none">
                <Camera size={18} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            {isEditing ? (
              <>
                <PaperTextInput
                  mode="outlined"
                  label="Business name"
                  value={draft.name}
                  onChangeText={(t) => updateDraft('name', t)}
                  outlineColor={fieldErrors.name ? '#E24B4A' : '#E8F5EE'}
                  activeOutlineColor={fieldErrors.name ? '#E24B4A' : ACCENT}
                  style={styles.inlineInput}
                  dense
                  testID="edit-input-name"
                />
                {!!fieldErrors.name && <Text style={styles.inlineError}>{fieldErrors.name}</Text>}
                <TouchableOpacity
                  style={[styles.editCategorySelector, !!fieldErrors.category && styles.editCategorySelectorError]}
                  onPress={() => setCategoryDropdownOpen(v => !v)}
                  activeOpacity={0.7}
                  testID="edit-input-category"
                >
                  <Text style={[styles.editCategorySelectorText, !draftCategoryId && styles.editCategoryPlaceholder]}>
                    {categories.find(c => c.id === draftCategoryId)?.name ?? 'Select a category'}
                  </Text>
                  <ChevronRight size={14} color="#888" style={{ transform: [{ rotate: categoryDropdownOpen ? '90deg' : '0deg' }] }} />
                </TouchableOpacity>
                {!!fieldErrors.category && <Text style={styles.inlineError}>{fieldErrors.category}</Text>}
                {categoryDropdownOpen && (
                  <View style={styles.editCategoryList}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 180 }}>
                      {categories.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.editCategoryItem, draftCategoryId === cat.id && styles.editCategoryItemSelected]}
                          onPress={() => {
                            setDraftCategoryId(cat.id);
                            setCategoryDropdownOpen(false);
                            setFieldErrors(prev => ({ ...prev, category: '' }));
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.editCategoryItemText, draftCategoryId === cat.id && styles.editCategoryItemTextSelected]}>
                            {cat.name}
                          </Text>
                          {draftCategoryId === cat.id && <Check size={14} color={ACCENT} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.businessName} testID="business-profile-name">
                  {business.name}
                </Text>
                <View style={styles.categoryBadge}>
                  <Tag size={11} color={ACCENT} />
                  <Text style={styles.categoryText}>{business.category}</Text>
                </View>
              </>
            )}
            <View style={styles.headerRatingRow}>
              <StarRatingDisplay
                averageRating={rating.averageRating}
                ratingCount={rating.ratingCount}
                size="medium"
                showCount={true}
              />
            </View>
            {isSubscribed ? (
              <TouchableOpacity
                onPress={handleOpenRatingSheet}
                hitSlop={8}
                style={styles.rateBusinessBtn}
                testID="rate-business-btn"
              >
                <StarIcon
                  size={14}
                  color={rating.hasRated ? '#F59E0B' : ACCENT}
                  fill={rating.hasRated ? '#F59E0B' : 'transparent'}
                />
                <Text
                  style={[
                    styles.rateBusinessText,
                    rating.hasRated && styles.rateBusinessTextRated,
                  ]}
                >
                  {rating.hasRated
                    ? `You rated ${rating.userRating} stars — Edit`
                    : 'Rate this business'}
                </Text>
              </TouchableOpacity>
            ) : null}
            {isEditing ? (
              <PaperTextInput
                mode="outlined"
                label="About / description"
                value={draft.description}
                onChangeText={(t) => updateDraft('description', t)}
                outlineColor="#E8F5EE"
                activeOutlineColor={ACCENT}
                style={[styles.inlineInput, { marginTop: 8, minHeight: 80 }]}
                multiline
                testID="edit-input-description"
              />
            ) : (
              <Text style={styles.description}>{business.description}</Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Users size={16} color={ACCENT} />
            <Text style={styles.statValue}>{formatNumber(business.subscriberCount)}</Text>
            <Text style={styles.statLabel}>Subscribers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Tag size={16} color={ACCENT} />
            <Text style={styles.statValue}>{business.activeOfferCount}</Text>
            <Text style={styles.statLabel}>Active Offers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Gift size={16} color={ACCENT} />
            <Text style={styles.statValue}>{business.welcomePoints}</Text>
            <Text style={styles.statLabel}>Welcome Pts</Text>
          </View>
        </View>

        {!isOwner && (
        <View style={styles.subscribeBtnWrap}>
          {!isSubscribed ? (
            <TouchableOpacity
              style={styles.subscribeBtn}
              activeOpacity={0.8}
              onPress={handleSubscribe}
              disabled={isToggling}
              testID="subscribe-btn"
            >
              {isToggling
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.subscribeText}>Subscribe</Text>}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.subscribeBtn, styles.subscribedBtn]}
                activeOpacity={1}
                disabled={isToggling}
                testID="subscribed-btn"
              >
                {isToggling
                  ? <ActivityIndicator size="small" color={ACCENT} />
                  : <Text style={styles.subscribedText}>Subscribed ✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUnsubscribe}
                disabled={isToggling}
                style={styles.unsubscribeLink}
                testID="unsubscribe-link"
              >
                <Text style={styles.unsubscribeLinkText}>Unsubscribe</Text>
              </TouchableOpacity>
            </>
          )}
          {isSubscribed && (
            <TouchableOpacity
              style={styles.messageBtn}
              activeOpacity={0.8}
              onPress={() => {
                console.log('[BusinessProfile] Message business', id);
                router.push({
                  pathname: '/chat-detail/[id]',
                  params: {
                    id: id ?? business.id,
                    businessName: business.name,
                    businessInitials: business.name.slice(0, 2).toUpperCase(),
                    businessColor: ACCENT,
                  },
                } as never);
              }}
              testID="message-business-btn"
            >
              <MessageSquare size={16} color={ACCENT} />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
        )}

        {isSubscribed && (
          <ReferralCard
            businessName={business.name}
            onShowSnack={(msg) => { setSnackMsg(msg); setSnackVisible(true); }}
            onOpenReferrals={() => router.push('/my-referrals' as never)}
          />
        )}

        <View style={styles.tabBarWrap}>
          <View style={styles.tabBar}>
            {visibleTabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.key, index)}
                activeOpacity={0.7}
                testID={`tab-${tab.key}`}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.key && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
            <Animated.View
              style={[
                styles.tabUnderline,
                {
                  width: tabWidth - 24,
                  transform: [{ translateX: Animated.add(tabUnderlineX, 12) }],
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'offers' && <OffersTab offers={businessOffers} isLoading={offersLoading} savedOffers={savedOffers} onSave={handleSaveOffer} onShare={handleShareOffer} onOpen={handleOpenOffer} filter={offerFilter} onFilterChange={setOfferFilter} isOwner={isOwner} onRequestToggle={handleRequestToggle} />}
          {activeTab === 'events' && (
            <EventsTab
              businessId={id ?? ''}
              isOwner={isOwner}
              onShowSnack={(msg) => { setSnackMsg(msg); setSnackVisible(true); }}
            />
          )}
          {activeTab === 'posts' && (
            <PostsTab
              business={business}
              isOwner={isOwner}
              onShowSnack={(msg) => { setSnackMsg(msg); setSnackVisible(true); }}
            />
          )}
          {activeTab === 'about' && (
            <AboutTab
              business={business}
              isEditing={isEditing}
              draft={draft}
              updateDraft={updateDraft}
              draftHours={draftHours}
              updateDraftHour={updateDraftHour}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
            />
          )}
          {activeTab === 'members' && isOwner && (
            <MembersTab
              businessId={id ?? ''}
              onShowSnack={(msg) => { setSnackMsg(msg); setSnackVisible(true); }}
            />
          )}
        </View>

        <RatingsReviewsSection
          averageRating={rating.averageRating}
          ratingCount={rating.ratingCount}
          breakdown={rating.breakdown}
          reviews={rating.reviews}
          isSubscribed={isSubscribed}
          isOwner={isOwner}
          hasRated={rating.hasRated}
          userRating={rating.userRating}
          onRatePress={handleOpenRatingSheet}
        />

        <View style={styles.rewardTierSection}>
          <View style={styles.rewardTierHeader}>
            <Gift size={16} color={ACCENT} />
            <Text style={styles.rewardTierTitle}>Reward Tiers</Text>
          </View>
          <View style={styles.tierTrack}>
            <View style={styles.tierLine} />
            {rewardLoading ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (rewardData?.tiers ?? []).length === 0 ? (
              <Text style={styles.tierPoints}>No tiers configured yet</Text>
            ) : (
              (rewardData?.tiers ?? []).map((tier) => (
                <View key={tier.id} style={styles.tierNode}>
                  <View style={[styles.tierCircle, { backgroundColor: tier.color ?? '#9CA3AF' }]}>
                    {tier.icon ? (
                      <Text style={styles.tierEmoji}>{tier.icon}</Text>
                    ) : (
                      <Text style={styles.tierEmoji}>{tier.name.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierPoints}>
                    {tier.min_points === 0 ? 'Start' : `${formatNumber(tier.min_points)} pts`}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {(() => {
          const cfg = rewardData?.config;
          const rows = [
            { key: 'welcome',  label: 'Welcome Points',  value: cfg?.welcome_bonus_points  ?? 0, color: '#F59E0B', bg: '#FEF3C7', Icon: Gift },
            { key: 'referral', label: 'Referral Points', value: cfg?.referral_bonus_points ?? 0, color: '#00B246', bg: '#E8F5EE', Icon: Users },
            { key: 'share',    label: 'Sharing Points',  value: cfg?.share_points          ?? 0, color: '#3B82F6', bg: '#DBEAFE', Icon: Share2 },
          ];
          return (
            <View style={styles.earnCard} testID="ways-to-earn-card">
              <View style={styles.earnHeader}>
                <View style={styles.earnHeaderIcon}>
                  <Zap size={14} color="#F59E0B" fill="#F59E0B" />
                </View>
                <Text style={styles.earnHeaderTitle}>Ways to Earn</Text>
              </View>
              {rewardLoading ? (
                <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 12 }} />
              ) : !cfg ? (
                <Text style={styles.earnNotOffered}>No earning rules configured yet</Text>
              ) : (
                rows.map((row, idx) => {
                  const offered = row.value > 0;
                  const RowIcon = row.Icon;
                  return (
                    <View key={row.key}>
                      <View style={styles.earnRow}>
                        <View style={[styles.earnRowIcon, { backgroundColor: row.bg }]}>
                          <RowIcon size={18} color={row.color} />
                        </View>
                        <Text style={styles.earnRowLabel}>{row.label}</Text>
                        {offered ? (
                          <View style={[styles.earnChip, { backgroundColor: row.bg }]}>
                            <Text style={[styles.earnChipText, { color: row.color }]}>+{row.value} pts</Text>
                          </View>
                        ) : (
                          <Text style={styles.earnNotOffered}>Not offered</Text>
                        )}
                      </View>
                      {idx < rows.length - 1 && <View style={styles.earnDivider} />}
                    </View>
                  );
                })
              )}
            </View>
          );
        })()}

        {(rewardData?.rewards ?? []).length > 0 && (
          <View style={styles.catalogCard} testID="rewards-catalog-card">
            <View style={styles.earnHeader}>
              <View style={[styles.earnHeaderIcon, { backgroundColor: '#FEF3C7' }]}>
                <Gift size={14} color="#F59E0B" />
              </View>
              <Text style={styles.earnHeaderTitle}>Rewards You Can Unlock</Text>
            </View>
            {(rewardData?.rewards ?? []).map((item, idx, arr) => (
              <View key={item.id}>
                <View style={styles.catalogRow}>
                  <View style={styles.catalogIcon}>
                    <Trophy size={18} color="#F59E0B" fill="#FCD34D" />
                  </View>
                  <View style={styles.catalogContent}>
                    <Text style={styles.catalogName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.catalogDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.catalogPill}>
                    <Text style={styles.catalogPillText}>{item.points_required} pts</Text>
                  </View>
                </View>
                {idx < arr.length - 1 && <View style={styles.earnDivider} />}
              </View>
            ))}
          </View>
        )}

        {isOwner && (
          <View style={styles.inviteCustomersWrap}>
            <TouchableOpacity
              style={styles.inviteCustomersBtn}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/invite-customers',
                  params: { businessId: id ?? business.id, businessName: business.name },
                } as never)
              }
              testID="invite-customers-entry"
            >
              <View style={styles.inviteCustomersIcon}>
                <UserPlus size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteCustomersTitle}>Invite Customers</Text>
                <Text style={styles.inviteCustomersSubtitle}>
                  Grow your subscribers via SMS, Email or CSV
                </Text>
              </View>
              <ChevronRight size={18} color={ACCENT} />
            </TouchableOpacity>
          </View>
        )}

        {isOwner && (
          <View style={styles.qrSection}>
            <View style={styles.qrSectionHeader}>
              <View style={styles.qrSectionTitleRow}>
                <View style={styles.qrSectionIconWrap}>
                  <QrCode size={16} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qrSectionTitle}>My QR Code</Text>
                  <Text style={styles.qrSectionSubtitle}>
                    Customers scan to subscribe instantly
                  </Text>
                </View>
              </View>
            </View>
            <BusinessQRCard
              businessId={id ?? business.id}
              businessName={business.name}
              businessLogo={business.logo}
              category={business.category}
              qrSize={200}
              onExpand={() => router.push({ pathname: '/business-qr/[id]', params: { id: id ?? business.id } } as never)}
              onShare={async () => {
                try {
                  const url = `https://touchpoint.app/b/${encodeURIComponent(id ?? business.id)}`;
                  await Share.share({
                    message: `Subscribe to ${business.name} on TouchPoint and start earning rewards: ${url}`,
                    url: Platform.OS === 'ios' ? url : undefined,
                  });
                } catch (e) {
                  console.log('[BusinessProfile] QR share error', e);
                }
              }}
              testID="owner-qr-card"
            />
          </View>
        )}

        <View style={isEditing ? styles.bottomSpacerEditing : styles.bottomSpacer} />
      </ScrollView>
      {isEditing && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editFooterWrap}
          pointerEvents="box-none"
        >
          {!!saveError && (
            <View style={styles.saveErrorBanner}>
              <Text style={styles.saveErrorText}>{saveError}</Text>
            </View>
          )}
          <SafeAreaView edges={['bottom']} style={styles.editFooter}>
            <PaperButton
              mode="outlined"
              onPress={handleCancelEdit}
              style={styles.editFooterCancel}
              textColor={ACCENT}
              disabled={saving}
              testID="edit-cancel-btn"
            >
              Cancel
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={handleSaveEdit}
              style={styles.editFooterSave}
              buttonColor={ACCENT}
              disabled={saving || Object.keys(fieldErrors).some(k => !!fieldErrors[k])}
              loading={saving}
              testID="edit-save-btn"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </PaperButton>
          </SafeAreaView>
        </KeyboardAvoidingView>
      )}
      {showSubscribeBanner && !isSubscribed && (
        <Animated.View
          style={[
            styles.subscribeBannerWrap,
            { transform: [{ translateY: subscribeBannerSlide }] },
          ]}
          pointerEvents="box-none"
        >
          <SafeAreaView edges={['top']} style={styles.subscribeBannerSafe}>
            <View style={styles.subscribeBanner} testID="qr-subscribe-banner">
              <View style={styles.subscribeBannerLeft}>
                <View style={styles.subscribeBannerIcon}>
                  <Sparkles size={14} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subscribeBannerTitle} numberOfLines={1}>
                    Subscribe to {business.name}
                  </Text>
                  <Text style={styles.subscribeBannerSub} numberOfLines={1}>
                    Earn {business.welcomePoints} welcome points
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.subscribeBannerBtn}
                onPress={handleSubscribe}
                activeOpacity={0.85}
                testID="qr-subscribe-banner-btn"
              >
                <Text style={styles.subscribeBannerBtnText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
      <Portal>
        <Dialog
          visible={confirmDialog.visible}
          onDismiss={() => setConfirmDialog({ visible: false, offerId: null })}
        >
          <Dialog.Title>Disable this offer?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#1A5C35', lineHeight: 19 }}>
              This offer will no longer be visible to your subscribers. You can re-enable it at any time.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton
              onPress={() => setConfirmDialog({ visible: false, offerId: null })}
              textColor="#888780"
            >
              Cancel
            </PaperButton>
            <PaperButton
              onPress={() => {
                if (confirmDialog.offerId) toggleOfferDisable(confirmDialog.offerId, 'active');
                setConfirmDialog({ visible: false, offerId: null });
              }}
              textColor="#E24B4A"
            >
              Disable
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <RatingBottomSheet
        visible={ratingSheetVisible}
        onDismiss={() => setRatingSheetVisible(false)}
        businessName={business.name}
        businessId={id ?? business.id}
        existingRating={rating.userRating}
        existingReview={rating.userReview}
        onSubmit={handleSubmitRating}
        onDelete={handleDeleteRating}
        submitting={rating.submitting}
        isSubscriber={isSubscribed}
      />
      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2500}
        style={{ backgroundColor: '#1A5C35', marginBottom: 80 }}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

function OffersTab({
  offers,
  isLoading,
  savedOffers,
  onSave,
  onShare,
  onOpen,
  filter,
  onFilterChange,
  isOwner,
  onRequestToggle,
}: {
  offers: Offer[];
  isLoading: boolean;
  savedOffers: Record<string, boolean>;
  onSave: (id: string) => void;
  onShare: (offer: Offer) => void;
  onOpen: (offer: Offer) => void;
  filter: OfferFilter;
  onFilterChange: (f: OfferFilter) => void;
  isOwner: boolean;
  onRequestToggle: (offerId: string) => void;
}) {
  const [commentOpenFor, setCommentOpenFor] = useState<string | null>(null);
  const counts = useMemo(() => ({
    all: offers.length,
    active: offers.filter((o) => o.effective_status === 'active').length,
    expired: offers.filter((o) => o.effective_status === 'expired').length,
    disabled: offers.filter((o) => o.effective_status === 'disabled').length,
  }), [offers]);

  const filteredOffers = useMemo(
    () => (filter === 'all' ? offers : offers.filter((o) => o.effective_status === filter)),
    [offers, filter],
  );

  const emptyCopy: Record<OfferFilter, { title: string; subtitle: string }> = {
    active: { title: 'No active offers right now', subtitle: 'Check back soon for new deals' },
    expired: { title: 'No expired offers', subtitle: '' },
    disabled: { title: 'No disabled offers', subtitle: '' },
    all: { title: 'No offers yet', subtitle: '' },
  };

  return (
    <View>
      {isOwner && (
        <View style={styles.ownerBanner}>
          <Pencil size={14} color="#854F0B" />
          <Text style={styles.ownerBannerText}>
            Owner view — you can enable or disable offers below
          </Text>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {OFFER_FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.8}
              onPress={() => onFilterChange(f.key)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: f.color, borderColor: f.color }
                  : { backgroundColor: 'transparent', borderColor: f.color },
              ]}
              testID={`offer-filter-${f.key}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? '#fff' : f.color, fontWeight: active ? '700' : '600' },
                ]}
              >
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
      ) : filteredOffers.length === 0 ? (
        <View style={styles.offersEmpty}>
          <Text style={styles.offersEmptyTitle}>{emptyCopy[filter].title}</Text>
          {emptyCopy[filter].subtitle ? (
            <Text style={styles.offersEmptySubtitle}>{emptyCopy[filter].subtitle}</Text>
          ) : null}
        </View>
      ) : (
        filteredOffers.map((offer) => {
          const dimmed = offer.effective_status === 'expired' || offer.effective_status === 'disabled';
          const statusStyle = OFFER_STATUS_STYLES[offer.effective_status];
          return (
            <TouchableOpacity
              key={offer.id}
              style={[styles.offerCard, dimmed && styles.offerCardDimmed]}
              activeOpacity={0.85}
              onPress={() => onOpen(offer)}
              testID={`offer-${offer.id}`}
            >
              <View style={styles.offerCardTop}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{formatDiscount(offer)}</Text>
                </View>
                <View style={styles.offerTopRight}>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.fg }]}>
                      ● {statusStyle.label}
                    </Text>
                  </View>
                  <View style={styles.offerActions}>
                    <TouchableOpacity
                      onPress={() => onShare(offer)}
                      hitSlop={8}
                      style={styles.offerActionBtn}
                    >
                      <Share2 size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onSave(offer.id)}
                      hitSlop={8}
                      style={styles.offerActionBtn}
                    >
                      <Bookmark
                        size={16}
                        color={savedOffers[offer.id] ? ACCENT : '#6B7280'}
                        fill={savedOffers[offer.id] ? ACCENT : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text
                style={[styles.offerTitle, dimmed && styles.offerTitleDimmed]}
                testID={`offer-title-${offer.id}`}
              >
                {offer.title}
              </Text>
              <Text style={styles.offerDesc}>{offer.description}</Text>
              <View style={styles.offerFooter}>
                <Calendar size={12} color="#9CA3AF" />
                <Text style={styles.offerValidity}>Valid until {offer.expires_at ? formatDate(offer.expires_at) : '—'}</Text>
                <View style={styles.offerFooterSpacer} />
                <TouchableOpacity
                  onPress={() => onOpen(offer)}
                  hitSlop={8}
                  testID={`offer-view-details-${offer.id}`}
                >
                  <Text style={styles.offerViewDetails}>View details →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.likeRow}>
                <LikeButton
                  contentType="offer"
                  contentId={offer.id}
                  initialLikeCount={offer.like_count ?? 0}
                  initialHasLiked={offer.liked_by_me ?? false}
                  isOwner={isOwner}
                />
                <TouchableOpacity style={styles.postLikeBtn} onPress={() => setCommentOpenFor(offer.id)} hitSlop={8}>
                  <MessageCircle size={18} color="#6B7280" />
                  <Text style={styles.postLikeCount}>{offer.comment_count ?? 0}</Text>
                </TouchableOpacity>
                <CommentSheet
                  visible={commentOpenFor === offer.id}
                  contentType="offer"
                  contentId={offer.id}
                  initialCommentCount={offer.comment_count ?? 0}
                  onClose={() => setCommentOpenFor(null)}
                />
              </View>
              {isOwner && (
                <View style={styles.ownerActionRow}>
                  <View style={styles.ownerActionLeft}>
                    {offer.effective_status === 'active' && (
                      <TouchableOpacity
                        onPress={() => onRequestToggle(offer.id)}
                        style={styles.ownerActionBtn}
                        hitSlop={8}
                        testID={`offer-disable-${offer.id}`}
                      >
                        <PauseCircle size={14} color="#E24B4A" />
                        <Text style={styles.ownerActionDisableText}>Disable</Text>
                      </TouchableOpacity>
                    )}
                    {offer.effective_status === 'disabled' && (
                      <TouchableOpacity
                        onPress={() => onRequestToggle(offer.id)}
                        style={styles.ownerActionBtn}
                        hitSlop={8}
                        testID={`offer-enable-${offer.id}`}
                      >
                        <PlayCircle size={14} color="#0F6E56" />
                        <Text style={styles.ownerActionEnableText}>Enable</Text>
                      </TouchableOpacity>
                    )}
                    {offer.effective_status === 'expired' && (
                      <Text style={styles.ownerActionExpiredText}>
                        Expired — cannot re-enable
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={offer.effective_status === 'active'}
                    disabled={offer.effective_status === 'expired'}
                    onValueChange={() => onRequestToggle(offer.id)}
                    color={ACCENT}
                    testID={`offer-switch-${offer.id}`}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const OFFER_STATUS_STYLES: Record<OfferStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: '#E1F5EE', fg: '#0F6E56', label: 'Active' },
  expired: { bg: '#F1EFE8', fg: '#5F5E5A', label: 'Expired' },
  disabled: { bg: '#FCEBEB', fg: '#A32D2D', label: 'Disabled' },
};

function EventsTab({ businessId, isOwner, onShowSnack }: { businessId: string; isOwner: boolean; onShowSnack: (msg: string) => void }) {
  const router = useRouter();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [commentOpenFor, setCommentOpenFor] = useState<string | null>(null);
  const { events, isLoading, toggleStatus } = useBusinessEvents(businessId, filter);
  const [eventConfirmDialog, setEventConfirmDialog] = useState<{ visible: boolean; eventId: string | null }>({ visible: false, eventId: null });

  const handleRequestToggleEvent = useCallback((eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    if (ev.effective_status === 'past') return;
    if (ev.effective_status === 'upcoming') {
      setEventConfirmDialog({ visible: true, eventId });
    } else {
      toggleStatus(eventId).then(() => {
        const e = events.find((x) => x.id === eventId);
        if (e) onShowSnack(`"${e.title}" restored successfully`);
      });
    }
  }, [events, toggleStatus, onShowSnack]);

  const counts = useMemo(() => ({
    all: events.length,
    upcoming: events.filter((e) => e.effective_status === 'upcoming').length,
    past: events.filter((e) => e.effective_status === 'past').length,
    cancelled: events.filter((e) => e.effective_status === 'cancelled').length,
  }), [events]);

  const emptyCopy: Record<EventFilter, string> = {
    upcoming: 'No upcoming events right now',
    past: 'No past events',
    cancelled: 'No cancelled events',
    all: 'No events yet',
  };

  const openEvent = useCallback(
    (eventId: string) => {
      console.log('[BusinessProfile] Open event:', eventId);
      router.push({ pathname: '/view-event', params: { eventId, businessId } } as never);
    },
    [router, businessId],
  );
  return (
    <View>
      {isOwner && (
        <View style={styles.ownerBanner}>
          <Pencil size={14} color="#854F0B" />
          <Text style={styles.ownerBannerText}>
            Owner view — you can cancel upcoming events below
          </Text>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {EVENT_FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.8}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: f.color, borderColor: f.color }
                  : { backgroundColor: 'transparent', borderColor: f.color },
              ]}
              testID={`event-filter-${f.key}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? '#fff' : f.color, fontWeight: active ? '700' : '600' },
                ]}
              >
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
      ) : events.length === 0 ? (
        <View style={styles.offersEmpty}>
          <Text style={styles.offersEmptyTitle}>{emptyCopy[filter]}</Text>
        </View>
      ) : (
        events.map((event) => {
          const dimmed = event.effective_status === 'past' || event.effective_status === 'cancelled';
          const statusStyle = EVENT_STATUS_STYLES[event.effective_status];
          return (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventCard, dimmed && styles.offerCardDimmed]}
              activeOpacity={0.85}
              onPress={() => openEvent(event.id)}
              testID={`event-${event.id}`}
            >
              <View style={styles.eventDateBlock}>
                <Text style={styles.eventDateMonth}>{getMonth(event.starts_at)}</Text>
                <Text style={styles.eventDateDay}>{getDay(event.starts_at)}</Text>
              </View>
              <View style={styles.eventInfo}>
                <View style={styles.eventTitleRow}>
                  <Text style={[styles.eventTitle, dimmed && styles.offerTitleDimmed, { flex: 1 }]} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, marginLeft: 8 }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.fg }]}>
                      ● {statusStyle.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventMeta}>
                  <Clock size={11} color="#9CA3AF" />
                  <Text style={styles.eventMetaText}>{formatTime(event.starts_at)}</Text>
                </View>
                <View style={styles.eventMeta}>
                  <MapPin size={11} color="#9CA3AF" />
                  <Text style={styles.eventMetaText}>{event.location ?? '—'}</Text>
                </View>
                <Text style={styles.eventDesc} numberOfLines={2}>{event.description ?? ''}</Text>
                <Text
                  style={styles.eventViewDetails}
                  onPress={() => openEvent(event.id)}
                  testID={`event-view-details-${event.id}`}
                >
                  View details →
                </Text>
                <View style={styles.likeRow}>
                  <LikeButton
                    contentType="event"
                    contentId={event.id}
                    initialLikeCount={event.like_count ?? 0}
                    initialHasLiked={event.liked_by_me ?? false}
                    isOwner={isOwner}
                  />
                  <TouchableOpacity style={styles.postLikeBtn} onPress={() => setCommentOpenFor(event.id)} hitSlop={8}>
                    <MessageCircle size={18} color="#6B7280" />
                    <Text style={styles.postLikeCount}>{event.comment_count ?? 0}</Text>
                  </TouchableOpacity>
                  <CommentSheet
                    visible={commentOpenFor === event.id}
                    contentType="event"
                    contentId={event.id}
                    initialCommentCount={event.comment_count ?? 0}
                    onClose={() => setCommentOpenFor(null)}
                  />
                </View>
                {isOwner && (
                  <View style={styles.ownerActionRow}>
                    <View style={styles.ownerActionLeft}>
                      {event.effective_status === 'upcoming' && (
                        <TouchableOpacity
                          onPress={() => handleRequestToggleEvent(event.id)}
                          style={styles.ownerActionBtn}
                          hitSlop={8}
                          testID={`event-cancel-${event.id}`}
                        >
                          <XCircle size={14} color="#E24B4A" />
                          <Text style={styles.ownerActionDisableText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                      {event.effective_status === 'cancelled' && (
                        <TouchableOpacity
                          onPress={() => handleRequestToggleEvent(event.id)}
                          style={styles.ownerActionBtn}
                          hitSlop={8}
                          testID={`event-restore-${event.id}`}
                        >
                          <RefreshCw size={14} color="#0F6E56" />
                          <Text style={styles.ownerActionEnableText}>Restore</Text>
                        </TouchableOpacity>
                      )}
                      {event.effective_status === 'past' && (
                        <Text style={styles.ownerActionExpiredText}>
                          Event has passed
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={event.effective_status === 'upcoming'}
                      disabled={event.effective_status === 'past'}
                      onValueChange={() => handleRequestToggleEvent(event.id)}
                      color={ACCENT}
                      testID={`event-switch-${event.id}`}
                    />
                  </View>
                )}
              </View>
              <ChevronRight size={16} color="#D1D5DB" />
            </TouchableOpacity>
          );
        })
      )}
      <Portal>
        <Dialog
          visible={eventConfirmDialog.visible}
          onDismiss={() => setEventConfirmDialog({ visible: false, eventId: null })}
        >
          <Dialog.Title>Cancel this event?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#1A5C35', lineHeight: 19 }}>
              Your subscribers will be notified that this event has been cancelled. You can restore it at any time.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton
              onPress={() => setEventConfirmDialog({ visible: false, eventId: null })}
              textColor="#888780"
            >
              Keep Event
            </PaperButton>
            <PaperButton
              onPress={() => {
                if (eventConfirmDialog.eventId) {
                  const ev = events.find((e) => e.id === eventConfirmDialog.eventId);
                  toggleStatus(eventConfirmDialog.eventId).then(() => {
                    if (ev) onShowSnack(`"${ev.title}" cancelled successfully`);
                  });
                }
                setEventConfirmDialog({ visible: false, eventId: null });
              }}
              textColor="#E24B4A"
            >
              Cancel Event
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const POST_FILTERS: { key: PostFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#1A5C35' },
  { key: 'active', label: 'Active', color: '#0F6E56' },
  { key: 'disabled', label: 'Disabled', color: '#E24B4A' },
];

function PostsTab({
  business,
  isOwner,
  onShowSnack,
}: {
  business: BusinessProfileData;
  isOwner: boolean;
  onShowSnack: (msg: string) => void;
}) {
  const router = useRouter();
  const [postFilter, setPostFilter] = useState<PostFilter>('all');
  const { posts, isLoading, toggleDisable: togglePostDisable, deletePost: apiDeletePost } =
    useBusinessPosts(business.id, postFilter);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [commentOpenFor, setCommentOpenFor] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ visible: boolean; postId: string | null }>({ visible: false, postId: null });
  const [postDisableConfirm, setPostDisableConfirm] = useState<{ visible: boolean; postId: string | null; currentIsActive: boolean }>({ visible: false, postId: null, currentIsActive: true });

  const openCreate = useCallback(() => {
    setMenuOpenFor(null);
    router.push('/new-post' as never);
  }, [router]);

  const openPost = useCallback(
    (postId: string) => {
      router.push({ pathname: '/view-post', params: { postId, businessId: business.id } } as never);
    },
    [router, business.id],
  );

  const openEdit = useCallback((post: { id: string }) => {
    setMenuOpenFor(null);
    router.push(`/edit-post/${post.id}` as never);
  }, [router]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm.postId) return;
    const id = deleteConfirm.postId;
    setDeleteConfirm({ visible: false, postId: null });
    await apiDeletePost(id);
    onShowSnack('Post deleted');
  }, [deleteConfirm.postId, onShowSnack, apiDeletePost]);

  return (
    <View>
      {isOwner && (
        <View style={styles.ownerBanner}>
          <Pencil size={14} color="#854F0B" />
          <Text style={styles.ownerBannerText}>
            Owner view — share updates, announcements, and moments with your subscribers
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {POST_FILTERS.map((f) => {
          const active = postFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.8}
              onPress={() => setPostFilter(f.key)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: f.color, borderColor: f.color }
                  : { backgroundColor: 'transparent', borderColor: f.color },
              ]}
              testID={`post-filter-${f.key}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? '#fff' : f.color, fontWeight: active ? '700' : '600' },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isOwner && (
        <TouchableOpacity
          style={styles.newPostBtn}
          onPress={openCreate}
          activeOpacity={0.85}
          testID="new-post-btn"
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.newPostBtnText}>New Post</Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
      ) : posts.length === 0 ? (
        <View style={styles.offersEmpty}>
          <Text style={styles.offersEmptyTitle}>No posts yet</Text>
          {isOwner ? (
            <Text style={styles.offersEmptySubtitle}>Tap "New Post" to share your first update</Text>
          ) : null}
        </View>
      ) : (
        posts.map((post) => {
          const dimmed = !post.is_active;
          return (
            <View key={post.id} style={[styles.postCard, dimmed && styles.offerCardDimmed]} testID={`post-${post.id}`}>
              <View style={styles.postHeaderRow}>
                <View style={styles.postHeaderLeft}>
                  <Image source={{ uri: business.logo }} style={styles.postAvatar} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postBusinessName} numberOfLines={1}>{business.name}</Text>
                    <Text style={styles.postTimestamp}>{relativeDate(post.created_at)}</Text>
                  </View>
                </View>
                {isOwner && (
                  <View>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => setMenuOpenFor((cur) => (cur === post.id ? null : post.id))}
                      style={styles.postMenuBtn}
                      testID={`post-menu-${post.id}`}
                    >
                      <MoreVertical size={18} color="#6B7280" />
                    </TouchableOpacity>
                    {menuOpenFor === post.id && (
                      <View style={styles.postMenu}>
                        <TouchableOpacity
                          style={styles.postMenuItem}
                          onPress={() => openEdit(post)}
                          testID={`post-edit-${post.id}`}
                        >
                          <Pencil size={14} color="#1F2937" />
                          <Text style={styles.postMenuItemText}>Edit</Text>
                        </TouchableOpacity>
                        <View style={styles.postMenuDivider} />
                        <TouchableOpacity
                          style={styles.postMenuItem}
                          onPress={() => {
                            setMenuOpenFor(null);
                            setDeleteConfirm({ visible: true, postId: post.id });
                          }}
                          testID={`post-delete-${post.id}`}
                        >
                          <Trash2 size={14} color="#E24B4A" />
                          <Text style={[styles.postMenuItemText, { color: '#E24B4A' }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={() => openPost(post.id)} activeOpacity={0.8} testID={`post-open-${post.id}`}>
                <Text style={styles.postText}>{post.content}</Text>

                {post.image_url ? (
                  <Image
                    source={{ uri: post.image_url }}
                    style={styles.postImage}
                    contentFit="cover"
                  />
                ) : null}
              </TouchableOpacity>

              <Text
                style={styles.eventViewDetails}
                onPress={() => openPost(post.id)}
                testID={`post-view-details-${post.id}`}
              >
                View details →
              </Text>

              <View style={styles.postFooter}>
                <LikeButton
                  contentType="post"
                  contentId={post.id}
                  initialLikeCount={post.like_count ?? 0}
                  initialHasLiked={post.liked_by_me ?? false}
                  isOwner={isOwner}
                />
                <TouchableOpacity style={styles.postLikeBtn} onPress={() => setCommentOpenFor(post.id)} hitSlop={8}>
                  <MessageCircle size={18} color="#6B7280" />
                  <Text style={styles.postLikeCount}>{post.comment_count ?? 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.postLikeBtn} onPress={() => onShowSnack('Link copied to clipboard')} hitSlop={8}>
                  <Share2 size={18} color="#6B7280" />
                  <Text style={styles.postLikeCount}>Share</Text>
                </TouchableOpacity>
                <CommentSheet
                  visible={commentOpenFor === post.id}
                  contentType="post"
                  contentId={post.id}
                  initialCommentCount={post.comment_count ?? 0}
                  onClose={() => setCommentOpenFor(null)}
                />
              </View>

              {isOwner && (
                <View style={styles.ownerActionRow}>
                  <View style={styles.ownerActionLeft}>
                    {post.is_active ? (
                      <TouchableOpacity
                        onPress={() => setPostDisableConfirm({ visible: true, postId: post.id, currentIsActive: true })}
                        style={styles.ownerActionBtn}
                        hitSlop={8}
                        testID={`post-disable-${post.id}`}
                      >
                        <PauseCircle size={14} color="#E24B4A" />
                        <Text style={styles.ownerActionDisableText}>Disable</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => togglePostDisable(post.id, false)}
                        style={styles.ownerActionBtn}
                        hitSlop={8}
                        testID={`post-enable-${post.id}`}
                      >
                        <PlayCircle size={14} color="#0F6E56" />
                        <Text style={styles.ownerActionEnableText}>Enable</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Switch
                    value={post.is_active}
                    onValueChange={() => {
                      if (post.is_active) {
                        setPostDisableConfirm({ visible: true, postId: post.id, currentIsActive: true });
                      } else {
                        togglePostDisable(post.id, false);
                      }
                    }}
                    color={ACCENT}
                    testID={`post-switch-${post.id}`}
                  />
                </View>
              )}
            </View>
          );
        })
      )}

      <Portal>
        <Dialog
          visible={postDisableConfirm.visible}
          onDismiss={() => setPostDisableConfirm({ visible: false, postId: null, currentIsActive: true })}
        >
          <Dialog.Title>Disable this post?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#1A5C35', lineHeight: 19 }}>
              This post will no longer be visible to your subscribers. You can re-enable it at any time.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton
              onPress={() => setPostDisableConfirm({ visible: false, postId: null, currentIsActive: true })}
              textColor="#888780"
            >
              Cancel
            </PaperButton>
            <PaperButton
              onPress={() => {
                if (postDisableConfirm.postId) togglePostDisable(postDisableConfirm.postId, true);
                setPostDisableConfirm({ visible: false, postId: null, currentIsActive: true });
              }}
              textColor="#E24B4A"
            >
              Disable
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={deleteConfirm.visible}
          onDismiss={() => setDeleteConfirm({ visible: false, postId: null })}
        >
          <Dialog.Title>Delete this post?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#1A5C35', lineHeight: 19 }}>
              This post will be removed permanently. This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton
              onPress={() => setDeleteConfirm({ visible: false, postId: null })}
              textColor="#888780"
            >
              Cancel
            </PaperButton>
            <PaperButton onPress={handleConfirmDelete} textColor="#E24B4A">
              Delete
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </View>
  );
}


function AboutTab({
  business,
  isEditing,
  draft,
  updateDraft,
  draftHours,
  updateDraftHour,
  fieldErrors,
  setFieldErrors,
}: {
  business: BusinessProfileData;
  isEditing: boolean;
  draft: BusinessProfileData;
  updateDraft: <K extends keyof BusinessProfileData>(key: K, value: BusinessProfileData[K]) => void;
  draftHours: BusinessHour[];
  updateDraftHour: (index: number, changes: Partial<BusinessHour>) => void;
  fieldErrors: Record<string, string>;
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  if (isEditing) {
    return (
      <View>
        <View style={styles.editSectionCard}>
          <Text style={styles.editSectionTitle}>About</Text>
          <PaperTextInput
            mode="outlined"
            label="Description (optional)"
            value={draft.description}
            onChangeText={(t) => {
              updateDraft('description', t);
              if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: '' }));
            }}
            outlineColor={fieldErrors.description ? '#E24B4A' : '#E8F5EE'}
            activeOutlineColor={fieldErrors.description ? '#E24B4A' : ACCENT}
            style={styles.editInput}
            multiline
            numberOfLines={3}
            maxLength={520}
            testID="edit-about-description"
          />
          <Text style={styles.editCharCount}>{draft.description?.length ?? 0}/500</Text>
          {!!fieldErrors.description && <Text style={styles.inlineError}>{fieldErrors.description}</Text>}
        </View>

        <View style={styles.editSectionCard}>
          <Text style={styles.editSectionTitle}>Contact details</Text>
          <PaperTextInput
            mode="outlined"
            label="Phone"
            value={draft.phone}
            onChangeText={(t) => {
              updateDraft('phone', t);
              if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
            }}
            outlineColor={fieldErrors.phone ? '#E24B4A' : '#E8F5EE'}
            activeOutlineColor={fieldErrors.phone ? '#E24B4A' : ACCENT}
            style={styles.editInput}
            keyboardType="phone-pad"
            left={<PaperTextInput.Icon icon="phone" />}
            testID="edit-phone"
          />
          {!!fieldErrors.phone && <Text style={styles.inlineError}>{fieldErrors.phone}</Text>}
          <PaperTextInput
            mode="outlined"
            label="Email"
            value={draft.email}
            onChangeText={(t) => updateDraft('email', t)}
            outlineColor="#E8F5EE"
            activeOutlineColor={ACCENT}
            style={styles.editInput}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<PaperTextInput.Icon icon="email" />}
            testID="edit-email"
          />
          <PaperTextInput
            mode="outlined"
            label="Website"
            value={draft.website}
            onChangeText={(t) => updateDraft('website', t)}
            outlineColor="#E8F5EE"
            activeOutlineColor={ACCENT}
            style={styles.editInput}
            autoCapitalize="none"
            left={<PaperTextInput.Icon icon="web" />}
            testID="edit-website"
          />
        </View>

        <View style={styles.editSectionCard}>
          <Text style={styles.editSectionTitle}>Address</Text>
          <PaperTextInput
            mode="outlined"
            label="Address"
            value={draft.address}
            onChangeText={(t) => {
              updateDraft('address', t);
              if (fieldErrors.address) setFieldErrors(prev => ({ ...prev, address: '' }));
            }}
            outlineColor={fieldErrors.address ? '#E24B4A' : '#E8F5EE'}
            activeOutlineColor={fieldErrors.address ? '#E24B4A' : ACCENT}
            style={styles.editInput}
            multiline
            left={<PaperTextInput.Icon icon="map-marker" />}
            testID="edit-address"
          />
          {!!fieldErrors.address && <Text style={styles.inlineError}>{fieldErrors.address}</Text>}
        </View>

        <View style={styles.editSectionCard}>
          <Text style={styles.editSectionTitle}>Opening hours</Text>
          {draftHours.map((h, index) => (
            <View key={h.day_of_week}>
              <View style={styles.editHoursRow}>
                <Text style={styles.editHoursDay}>{DAYS_LABELS[h.day_of_week]}</Text>
                <RNSwitch
                  value={!h.is_closed}
                  onValueChange={(v) => {
                    updateDraftHour(index, { is_closed: !v });
                    if (fieldErrors[`hours_${h.day_of_week}`])
                      setFieldErrors(prev => ({ ...prev, [`hours_${h.day_of_week}`]: '' }));
                  }}
                  trackColor={{ false: '#D6D3E0', true: ACCENT }}
                  thumbColor={Platform.OS === 'android' ? (!h.is_closed ? '#fff' : '#f4f3f4') : undefined}
                  ios_backgroundColor="#D6D3E0"
                />
                {!h.is_closed ? (
                  <View style={styles.editHoursTimeRow}>
                    <TextInput
                      style={[styles.editHoursTimeInput, !!fieldErrors[`hours_${h.day_of_week}`] && styles.editHoursTimeInputError]}
                      value={h.open_time ?? ''}
                      onChangeText={(v) => {
                        updateDraftHour(index, { open_time: v });
                        if (fieldErrors[`hours_${h.day_of_week}`])
                          setFieldErrors(prev => ({ ...prev, [`hours_${h.day_of_week}`]: '' }));
                      }}
                      placeholder="09:00"
                      placeholderTextColor="#A0A0A0"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Text style={styles.editHoursTimeSep}>–</Text>
                    <TextInput
                      style={[styles.editHoursTimeInput, !!fieldErrors[`hours_${h.day_of_week}`] && styles.editHoursTimeInputError]}
                      value={h.close_time ?? ''}
                      onChangeText={(v) => {
                        updateDraftHour(index, { close_time: v });
                        if (fieldErrors[`hours_${h.day_of_week}`])
                          setFieldErrors(prev => ({ ...prev, [`hours_${h.day_of_week}`]: '' }));
                      }}
                      placeholder="18:00"
                      placeholderTextColor="#A0A0A0"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                ) : (
                  <Text style={styles.editHoursClosed}>Closed</Text>
                )}
              </View>
              {!!fieldErrors[`hours_${h.day_of_week}`] && (
                <Text style={[styles.inlineError, { marginLeft: 46, marginTop: -4, marginBottom: 4 }]}>
                  {fieldErrors[`hours_${h.day_of_week}`]}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.aboutDescription}>{business.description}</Text>

      <View style={styles.aboutRow}>
        <View style={[styles.aboutIcon, { backgroundColor: '#E8F5EE' }]}>
          <Clock size={16} color={ACCENT} />
        </View>
        <View style={styles.aboutRowContent}>
          <Text style={styles.aboutLabel}>Hours</Text>
          <Text style={styles.aboutValue}>{business.hours}</Text>
        </View>
      </View>

      <View style={styles.aboutRow}>
        <View style={[styles.aboutIcon, { backgroundColor: '#FEF3C7' }]}>
          <MapPin size={16} color="#D97706" />
        </View>
        <View style={styles.aboutRowContent}>
          <Text style={styles.aboutLabel}>Address</Text>
          <Text style={styles.aboutValue}>{business.address}</Text>
        </View>
      </View>

      <View style={styles.aboutRow}>
        <View style={[styles.aboutIcon, { backgroundColor: '#DCFCE7' }]}>
          <Phone size={16} color="#16A34A" />
        </View>
        <View style={styles.aboutRowContent}>
          <Text style={styles.aboutLabel}>Phone</Text>
          <Text style={styles.aboutValue}>{business.phone}</Text>
        </View>
      </View>

      <View style={styles.aboutRow}>
        <View style={[styles.aboutIcon, { backgroundColor: '#DBEAFE' }]}>
          <Mail size={16} color="#2563EB" />
        </View>
        <View style={styles.aboutRowContent}>
          <Text style={styles.aboutLabel}>Email</Text>
          <Text style={styles.aboutValue}>{business.email}</Text>
        </View>
      </View>

      <View style={styles.aboutRow}>
        <View style={[styles.aboutIcon, { backgroundColor: '#E8F5EE' }]}>
          <Globe size={16} color={ACCENT} />
        </View>
        <View style={styles.aboutRowContent}>
          <Text style={styles.aboutLabel}>Website</Text>
          <Text style={styles.aboutValue}>{business.website}</Text>
        </View>
      </View>
    </View>
  );
}

function ReferralCard({
  businessName,
  onShowSnack,
  onOpenReferrals,
}: {
  businessName: string;
  onShowSnack: (msg: string) => void;
  onOpenReferrals: () => void;
}) {
  const referralCode = 'SAM-X7K2';
  const referralLink = `https://touchpoint.app/join-biz?ref=${referralCode}&biz=biz-001`;
  const shareMessage = `Hey! I shop at ${businessName} and I think you'll love it! Use my code ${referralCode} to join on TouchPoint and we BOTH earn 75 reward points after your first purchase! ${referralLink}`;

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onShowSnack('Referral link copied!');
    } catch (e) {
      console.log('[ReferralCard] Copy error:', e);
    }
  }, [referralLink, onShowSnack]);

  const handleWhatsApp = useCallback(async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch (e) {
      console.log('[ReferralCard] WhatsApp share error:', e);
    }
  }, [shareMessage]);

  const handleMoreOptions = useCallback(async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch (e) {
      console.log('[ReferralCard] Share error:', e);
    }
  }, [shareMessage]);

  return (
    <View style={styles.referralCard} testID="referral-card">
      <View style={styles.referralTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.referralTitle}>Refer friends here</Text>
          <Text style={styles.referralSubtitle}>
            You both earn 75 pts after their first purchase
          </Text>
        </View>
        <View style={styles.referralPointsBadge}>
          <Text style={styles.referralPointsBadgeText}>+75 pts each</Text>
        </View>
      </View>

      <View style={styles.referralLinkWrap}>
        <Text style={styles.referralLinkLabel}>Your referral link</Text>
        <View style={styles.referralLinkRow}>
          <Text style={styles.referralLinkText} numberOfLines={1}>
            {referralCode} · {businessName}
          </Text>
          <TouchableOpacity
            onPress={handleCopy}
            hitSlop={10}
            testID="referral-copy-btn"
          >
            <Copy size={18} color="#1A5C35" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.referralButtonsRow}>
        <TouchableOpacity
          style={styles.referralInviteBtn}
          activeOpacity={0.8}
          onPress={handleWhatsApp}
          testID="referral-whatsapp-btn"
        >
          <Text style={styles.referralInviteBtnText}>Invite via WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.referralInviteBtn}
          activeOpacity={0.8}
          onPress={handleMoreOptions}
          testID="referral-more-btn"
        >
          <Text style={styles.referralInviteBtnText}>More options</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.referralDivider} />

      <View style={styles.referralStatsRow}>
        <View style={styles.referralStatItem}>
          <Text style={[styles.referralStatValue, { color: '#1A5C35' }]}>2 referred</Text>
          <Text style={styles.referralStatLabel}>Friends</Text>
        </View>
        <View style={styles.referralStatItem}>
          <Text style={[styles.referralStatValue, { color: '#0F6E56' }]}>1 completed</Text>
          <Text style={styles.referralStatLabel}>Purchases</Text>
        </View>
        <View style={styles.referralStatItem}>
          <Text style={[styles.referralStatValue, { color: '#854F0B' }]}>75 earned</Text>
          <Text style={styles.referralStatLabel}>Points</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onOpenReferrals}
        hitSlop={8}
        testID="referral-see-list-btn"
        style={styles.referralSeeListWrap}
      >
        <Text style={styles.referralSeeListText}>See my referral list →</Text>
      </TouchableOpacity>
    </View>
  );
}

function RatingsReviewsSection({
  averageRating,
  ratingCount,
  breakdown,
  reviews,
  isSubscribed = false,
  isOwner = false,
  hasRated = false,
  userRating = null,
  onRatePress,
}: {
  averageRating: number;
  ratingCount: number;
  breakdown: Record<number, number>;
  reviews: ReviewItem[];
  isSubscribed?: boolean;
  isOwner?: boolean;
  hasRated?: boolean;
  userRating?: number | null;
  onRatePress?: () => void;
}) {
  const textReviews = useMemo(
    () => reviews.filter((r) => r.reviewText && r.reviewText.trim().length > 0).slice(0, 5),
    [reviews],
  );
  const max = useMemo(() => {
    const values = [1, 2, 3, 4, 5].map((s) => breakdown[s] ?? 0);
    return Math.max(1, ...values);
  }, [breakdown]);

  const canRate = isSubscribed && !isOwner;

  return (
    <View style={styles.ratingsSection} testID="ratings-reviews-section">
      <View style={styles.ratingsHeaderRow}>
        <Text style={styles.ratingsTitle}>Ratings & Reviews</Text>
        {ratingCount > 0 ? (
          <Text style={styles.ratingsCount}>({ratingCount.toLocaleString()})</Text>
        ) : null}
      </View>

      {canRate && (
        <TouchableOpacity
          style={styles.rateCtaBtn}
          onPress={onRatePress}
          activeOpacity={0.8}
          testID="rate-cta-btn"
        >
          <StarIcon size={16} color={hasRated ? '#F59E0B' : '#fff'} fill={hasRated ? '#F59E0B' : 'transparent'} />
          <Text style={styles.rateCtaText}>
            {hasRated ? `You rated ${userRating} stars — Edit` : 'Rate this business'}
          </Text>
        </TouchableOpacity>
      )}

      {ratingCount === 0 ? (
        <Text style={styles.reviewsEmpty}>
          {canRate ? 'No ratings yet — be the first!' : 'No ratings yet'}
        </Text>
      ) : (
        <>
          <View style={styles.ratingsSummaryRow}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.ratingsAvgBig}>{averageRating.toFixed(1)}</Text>
              <StarRatingDisplay
                averageRating={averageRating}
                ratingCount={ratingCount}
                size="small"
                showCount={false}
              />
              <Text style={styles.ratingsAvgLabel}>
                {ratingCount.toLocaleString()} {ratingCount === 1 ? 'rating' : 'ratings'}
              </Text>
            </View>
            <View style={styles.breakdownWrap}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = breakdown[star] ?? 0;
                const pct = (count / max) * 100;
                return (
                  <View key={star} style={styles.breakdownRow}>
                    <Text style={styles.breakdownStar}>{star} ★</Text>
                    <View style={styles.breakdownBar}>
                      <View style={[styles.breakdownFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {textReviews.length === 0 ? (
            <Text style={styles.reviewsEmpty}>No written reviews yet.</Text>
          ) : (
            textReviews.map((r) => <ReviewRow key={r.id} review={r} />)
          )}
        </>
      )}
    </View>
  );
}

function ReviewRow({ review }: { review: ReviewItem }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const initials = review.authorName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const color = useMemo(() => avatarColor(review.authorName), [review.authorName]);
  const longEnough = review.reviewText.length > 160;

  return (
    <View style={styles.reviewItem}>
      <View style={[styles.reviewAvatar, { backgroundColor: color }]}>
        <Text style={styles.reviewAvatarText}>{initials}</Text>
      </View>
      <View style={styles.reviewBody}>
        <View style={styles.reviewAuthorRow}>
          <Text style={styles.reviewAuthor}>{review.authorName}</Text>
          <Text style={styles.reviewDate}>{relativeDate(review.updatedAt)}</Text>
        </View>
        <View style={styles.reviewStarsRow}>
          <StarRatingDisplay
            averageRating={review.rating}
            ratingCount={1}
            size="small"
            showCount={false}
          />
        </View>
        <Text
          style={styles.reviewText}
          numberOfLines={expanded ? undefined : 3}
        >
          {review.reviewText}
        </Text>
        {longEnough ? (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={6}>
            <Text style={styles.reviewReadMore}>{expanded ? 'Show less' : 'Read more'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function avatarColor(name: string): string {
  const palette = ['#00B246', '#0984E3', '#00B894', '#E17055', '#D63031', '#F59E0B', '#10B981'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}

function formatDiscount(offer: Offer): string {
  if (offer.discount_type === 'percent' && offer.discount_value) return `${offer.discount_value}% off`;
  if (offer.discount_type === 'flat' && offer.discount_value) return `$${offer.discount_value} off`;
  if (offer.discount_type === 'bogo') return 'Buy 1 Get 1';
  if (offer.discount_type === 'freebie') return 'Free item';
  return 'Special deal';
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function relativeDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toString();
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getMonth(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  } catch {
    return '';
  }
}

function getDay(dateStr: string): string {
  try {
    return new Date(dateStr).getDate().toString();
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F5FA',
  },
  qrSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  inviteCustomersWrap: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  inviteCustomersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: ACCENT_LIGHT,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#1A5C35',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inviteCustomersIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCustomersTitle: {
    color: '#1A5C35',
    fontWeight: '700' as const,
    fontSize: 14,
  },
  inviteCustomersSubtitle: {
    color: '#5F5E5A',
    fontSize: 12,
    marginTop: 2,
  },
  qrSectionHeader: {
    marginBottom: 12,
  },
  qrSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qrSectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE7DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSectionTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#1A1D2E',
    letterSpacing: -0.2,
  },
  qrSectionSubtitle: {
    fontSize: 12,
    color: '#5C5F72',
    marginTop: 1,
  },
  subscribeBannerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  subscribeBannerSafe: {
    backgroundColor: 'transparent',
  },
  subscribeBanner: {
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#00B246',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#00B246',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  subscribeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  subscribeBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBannerTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: -0.1,
  },
  subscribeBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  subscribeBannerBtn: {
    backgroundColor: '#FF7043',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  subscribeBannerBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  referralCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    backgroundColor: '#E8F5EE',
    padding: 14,
  },
  referralTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  referralTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1A5C35',
  },
  referralSubtitle: {
    fontSize: 11,
    color: '#1A5C35',
    marginTop: 2,
  },
  referralPointsBadge: {
    backgroundColor: '#1A5C35',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  referralPointsBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  referralLinkWrap: {
    marginTop: 10,
  },
  referralLinkLabel: {
    fontSize: 10,
    color: '#1A5C35',
  },
  referralLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  referralLinkText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#1A5C35',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  referralButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  referralInviteBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralInviteBtnText: {
    color: '#1A5C35',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  referralDivider: {
    height: 0.5,
    backgroundColor: '#E8F5EE',
    marginVertical: 12,
  },
  referralStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  referralStatItem: {
    flex: 1,
  },
  referralStatValue: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  referralStatLabel: {
    fontSize: 10,
    color: '#1A5C35',
    marginTop: 2,
  },
  referralSeeListWrap: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  referralSeeListText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#1A5C35',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverWrap: {
    height: COVER_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  coverSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favTooltip: {
    position: 'absolute',
    top: 56,
    right: 12,
    backgroundColor: 'rgba(20,20,30,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 50,
  },
  favTooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  profileHeader: {
    marginTop: -(LOGO_SIZE / 2),
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
    paddingBottom: 4,
  },
  businessName: {
    fontSize: 21,
    fontWeight: '800' as const,
    color: '#1F2937',
    letterSpacing: -0.4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 5,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: ACCENT,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginTop: 8,
  },
  headerRatingRow: {
    marginTop: 8,
  },
  rateBusinessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  rateBusinessText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: ACCENT,
  },
  rateBusinessTextRated: {
    color: '#B45309',
  },
  rateCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  rateCtaText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  ratingsSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
  },
  ratingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ratingsTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#1A5C35',
  },
  ratingsCount: {
    fontSize: 12,
    color: '#1A5C35',
    fontWeight: '600' as const,
  },
  ratingsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  ratingsAvgBig: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: '#1A5C35',
    lineHeight: 38,
  },
  ratingsAvgLabel: {
    fontSize: 11,
    color: '#1A5C35',
    marginTop: 2,
  },
  breakdownWrap: {
    flex: 1,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownStar: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#1A5C35',
    width: 26,
  },
  breakdownBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1EEF9',
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  breakdownCount: {
    fontSize: 11,
    color: '#1A5C35',
    width: 32,
    textAlign: 'right',
  },
  reviewsEmpty: {
    fontSize: 13,
    color: '#1A5C35',
    textAlign: 'center',
    paddingVertical: 24,
  },
  reviewItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#EEEBF6',
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800' as const,
  },
  reviewBody: {
    flex: 1,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1A5C35',
  },
  reviewDate: {
    fontSize: 11,
    color: '#E8F5EE',
  },
  reviewStarsRow: {
    marginTop: 4,
  },
  reviewText: {
    fontSize: 13,
    color: '#1A5C35',
    marginTop: 6,
    lineHeight: 19,
  },
  reviewReadMore: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: ACCENT,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  subscribeBtnWrap: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 20,
  },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: SCREEN_WIDTH - 40,
    elevation: 3,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  subscribedBtn: {
    backgroundColor: '#E8F5E9',
    shadowOpacity: 0,
    elevation: 0,
  },
  unsubscribeLink: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  unsubscribeLinkText: {
    fontSize: 12,
    color: '#888780',
    textDecorationLine: 'underline',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: SCREEN_WIDTH - 40,
    marginTop: 10,
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: ACCENT,
  },
  subscribeText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  subscribedText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  pointsPopup: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    backgroundColor: '#FBBF24',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsPopupText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#78350F',
  },
  tabBarWrap: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingTop: 4,
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: ACCENT,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  tabContent: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  offerCardDimmed: {
    opacity: 0.72,
  },
  offerTitleDimmed: {
    color: '#888780',
  },
  offerTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
  },
  offersEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  offersEmptyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  offersEmptySubtitle: {
    fontSize: 13,
    color: '#1A5C35',
    marginTop: 6,
    textAlign: 'center' as const,
  },
  offerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  discountBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  offerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  offerDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginTop: 4,
  },
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  offerValidity: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  offerFooterSpacer: {
    flex: 1,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  offerViewDetails: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '700' as const,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  eventDateBlock: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDateMonth: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: ACCENT,
    letterSpacing: 0.5,
  },
  eventDateDay: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: ACCENT,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400' as const,
  },
  eventDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginTop: 4,
  },
  eventViewDetails: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
    marginTop: 6,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  aboutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutRowContent: {
    flex: 1,
  },
  aboutLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1F2937',
    marginTop: 2,
  },
  rewardTierSection: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  rewardTierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  rewardTierTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  tierTrack: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 10,
  },
  tierLine: {
    position: 'absolute',
    top: 24,
    left: 40,
    right: 40,
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  tierNode: {
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  tierCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  tierEmoji: {
    fontSize: 20,
  },
  tierName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#374151',
  },
  tierPoints: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#9CA3AF',
  },
  earnCard: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  catalogCard: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  earnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  earnHeaderIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnHeaderTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1F2937',
    letterSpacing: -0.1,
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  earnRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  earnChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  earnChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.1,
  },
  earnNotOffered: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
  },
  earnDivider: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  catalogIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogContent: {
    flex: 1,
  },
  catalogName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  catalogDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#9CA3AF',
    marginTop: 2,
  },
  catalogPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1A5C35',
  },
  catalogPillText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.1,
  },
  bottomSpacer: {
    height: 40,
  },
  bottomSpacerEditing: {
    height: 140,
  },
  coverCameraOverlay: {
    position: 'absolute' as const,
    bottom: 12,
    right: 12,
  },
  cameraBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cameraBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  logoCameraOverlay: {
    position: 'absolute' as const,
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#fff',
  },
  editHeaderBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
  },
  editHeaderBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  inlineInput: {
    backgroundColor: '#fff',
    fontSize: 14,
  },
  editSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  editSectionTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#1A5C35',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  editInput: {
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 14,
  },
  editFooterWrap: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
  },
  editFooter: {
    flexDirection: 'row' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#E8F5EE',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  editFooterCancel: {
    flex: 1,
    borderRadius: 12,
    borderColor: ACCENT,
  },
  editFooterSave: {
    flex: 1.4,
    borderRadius: 12,
  },
  saveErrorBanner: {
    backgroundColor: '#FCEBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E24B4A',
  },
  saveErrorText: {
    color: '#A32D2D',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  inlineError: {
    fontSize: 12,
    color: '#E24B4A',
    marginTop: 3,
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  editCharCount: {
    fontSize: 11,
    color: '#A0A0A0',
    textAlign: 'right' as const,
    marginTop: 2,
    marginBottom: 4,
  },
  editCategorySelector: {
    borderWidth: 1.5,
    borderColor: '#E8F5EE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: '#fff',
    marginTop: 6,
  },
  editCategorySelectorError: {
    borderColor: '#E24B4A',
  },
  editCategorySelectorText: {
    fontSize: 14,
    color: '#1C1B1F',
    fontWeight: '400' as const,
    flex: 1,
  },
  editCategoryPlaceholder: {
    color: '#A0A0A0',
  },
  editCategoryList: {
    borderWidth: 1,
    borderColor: '#E8F5EE',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#fff',
    overflow: 'hidden' as const,
  },
  editCategoryItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  editCategoryItemSelected: {
    backgroundColor: '#E8F5EE',
  },
  editCategoryItemText: {
    fontSize: 14,
    color: '#1C1B1F',
  },
  editCategoryItemTextSelected: {
    fontWeight: '600' as const,
    color: ACCENT,
  },
  editHoursRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  editHoursDay: {
    width: 34,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1B1F',
  },
  editHoursTimeRow: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  editHoursTimeInput: {
    flex: 1,
    backgroundColor: '#F6F5FA',
    borderWidth: 1,
    borderColor: '#E8F5EE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#1C1B1F',
    textAlign: 'center' as const,
  },
  editHoursTimeInputError: {
    borderColor: '#E24B4A',
  },
  editHoursTimeSep: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  editHoursClosed: {
    flex: 1,
    fontSize: 13,
    color: '#A0A0A0',
    fontStyle: 'italic' as const,
  },
  ownerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAEEDA',
    borderWidth: 0.5,
    borderColor: '#EF9F27',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  ownerBannerText: {
    fontSize: 11,
    color: '#854F0B',
    flex: 1,
    fontWeight: '600' as const,
  },
  ownerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E8F5EE',
  },
  ownerActionLeft: {
    flex: 1,
  },
  ownerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerActionDisableText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#E24B4A',
  },
  ownerActionEnableText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#0F6E56',
  },
  ownerActionExpiredText: {
    fontSize: 11,
    color: '#888780',
    fontStyle: 'italic' as const,
  },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
    elevation: 2,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  newPostBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  postBusinessName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1F2937',
    letterSpacing: -0.1,
  },
  postTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  postMenuBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postMenu: {
    position: 'absolute' as const,
    top: 32,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 140,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    zIndex: 20,
  },
  postMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postMenuItemText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  postMenuDivider: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  postText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginTop: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#F3F4F6',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  postLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  postLikeCount: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#6B7280',
  },
  composerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end' as const,
  },
  composerBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  composerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  composerHandle: {
    alignSelf: 'center' as const,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  composerTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  composerCancel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600' as const,
  },
  composerPostBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  composerPostBtnDisabled: {
    opacity: 0.5,
  },
  composerPostBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  composerBusinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  composerInput: {
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
    textAlignVertical: 'top' as const,
    paddingVertical: 8,
    lineHeight: 22,
  },
  composerAddPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed' as const,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  composerAddPhotoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAddPhotoTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1F2937',
  },
  composerAddPhotoSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  composerImageWrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  composerImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  composerImageRemove: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  composerCharCount: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600' as const,
  },
});
