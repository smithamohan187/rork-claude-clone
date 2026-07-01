import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Share2,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Button,
  Chip,
  Snackbar,
  Surface,
} from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOfferById, type Offer as ServiceOffer } from '@/api/services/offersService';
import { fetchBusinessProfile } from '@/api/services/businessProfileService';

const PURPLE = '#1A5C35';
const LIGHT_PURPLE = '#E8F5EE';
const LIGHT_TEAL = '#E1F5EE';
const TEAL = '#14B8A6';
const RED = '#DC2626';
const AMBER = '#F59E0B';

type Offer = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: string | null;
  discount_value: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  terms_conditions?: string | null;
};

type Business = {
  id: string;
  business_name: string;
  logo_url: string | null;
  category: string | null;
  city: string | null;
};

const OFFER_TYPE_COLORS: Record<string, string> = {
  promotion: PURPLE,
  discount: TEAL,
  'flash sale': RED,
  bundle: AMBER,
};

function getTypeColor(type: string | null | undefined): string {
  if (!type) return PURPLE;
  return OFFER_TYPE_COLORS[type.toLowerCase()] ?? PURPLE;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getCountdown(expiresAt: string | null): {
  label: string;
  expired: boolean;
  soon: boolean;
} {
  if (!expiresAt) return { label: 'No expiry', expired: false, soon: false };
  const now = Date.now();
  const end = new Date(expiresAt).getTime();
  const diff = end - now;
  if (diff <= 0) return { label: 'Expired', expired: true, soon: false };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const soon = diff <= 24 * 60 * 60 * 1000;
  if (days > 0) return { label: `Expires in ${days}d ${hrs}h`, expired: false, soon };
  if (hrs > 0) return { label: `Expires in ${hrs}h ${mins}m`, expired: false, soon };
  return { label: `Expires in ${mins}m`, expired: false, soon };
}

export default function ViewOfferScreen() {
  const params = useLocalSearchParams<{
    offerId?: string;
    businessId?: string;
    sharedByName?: string;
    sharedByInitials?: string;
    sharedByColor?: string;
  }>();
  const offerId = typeof params.offerId === 'string' ? params.offerId : '';
  const businessId = typeof params.businessId === 'string' ? params.businessId : '';
  const sharedByName = typeof params.sharedByName === 'string' ? params.sharedByName : '';
  const sharedByInitials = typeof params.sharedByInitials === 'string' ? params.sharedByInitials : '';
  const sharedByColor = typeof params.sharedByColor === 'string' && params.sharedByColor ? params.sharedByColor : '#1A5C35';
  const router = useRouter();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [sharingPoints, setSharingPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [showTerms, setShowTerms] = useState<boolean>(false);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarText, setSnackbarText] = useState<string>('');
  const [sharing, setSharing] = useState<boolean>(false);
  const subscribing = false;

  const fetchData = useCallback(async () => {
    if (!offerId) {
      setError(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [offerData, bizData] = await Promise.all([
        fetchOfferById(offerId),
        businessId ? fetchBusinessProfile(businessId) : Promise.resolve(null),
      ]);

      setOffer({
        id:               offerData.id,
        title:            offerData.title,
        description:      offerData.description,
        image_url:        offerData.image_url,
        discount_type:    offerData.discount_type,
        discount_value:   offerData.discount_value,
        starts_at:        offerData.starts_at,
        expires_at:       offerData.expires_at,
        is_active:        offerData.effective_status === 'active',
        terms_conditions: offerData.terms,
      });

      if (bizData) {
        setBusiness({
          id:            bizData.id,
          business_name: bizData.name,
          logo_url:      bizData.logo_url,
          category:      bizData.category_name,
          city:          bizData.city,
        });
      }

      // Subscriptions and points modules not yet built
      setIsSubscribed(false);
      setSharingPoints(0);
    } catch (e) {
      if (__DEV__) console.log('[ViewOffer] fetch error', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [offerId, businessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const countdown = useMemo(() => getCountdown(offer?.expires_at ?? null), [offer?.expires_at]);
  const offerEnded = !offer?.is_active || countdown.expired;

  const handleShare = useCallback(async () => {
    if (sharing || !offer || !business) return;
    setSharing(true);
    try {
      const message = `Check out this offer from ${business.business_name}: ${offer.title}`;
      await Share.share({ message });
      setSnackbarText('Offer shared');
      setSnackbarVisible(true);
    } catch (e) {
      if (__DEV__) console.log('[ViewOffer] share error', e);
    } finally {
      setSharing(false);
    }
  }, [sharing, offer, business]);

  const handleSubscribe = useCallback(async () => {
    // Subscriptions module not yet built
    setSnackbarText('Subscription feature coming soon');
    setSnackbarVisible(true);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonBlock} />
        <View style={[styles.skeletonBlock, { width: '60%' }]} />
        <View style={[styles.skeletonBlock, { width: '90%' }]} />
        <View style={[styles.skeletonBlock, { width: '80%' }]} />
        <View style={styles.skeletonCenter}>
          <ActivityIndicator color={PURPLE} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !offer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Offer not available</Text>
        <Text style={styles.errorSub}>This offer may have been removed or is no longer accessible.</Text>
        <Button mode="contained" buttonColor={PURPLE} onPress={() => router.back()} style={styles.goBackBtn}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  const typeColor = getTypeColor(offer.discount_type);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="view-offer-scroll"
      >
        {sharedByName ? (
          <View style={styles.sharedByBanner} testID="shared-by-banner">
            <Text style={styles.sharedByLabel}>Shared with you by</Text>
            <View style={[styles.sharedByAvatar, { backgroundColor: sharedByColor }]}>
              <Text style={styles.sharedByAvatarText}>
                {sharedByInitials || sharedByName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.sharedByName} numberOfLines={1}>
              {sharedByName}
            </Text>
          </View>
        ) : null}
        <View style={styles.heroWrap}>
          <Image
            source={{
              uri:
                offer.image_url ||
                'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.heroGradient}
          />

          <SafeAreaView edges={['top']} style={styles.heroOverlay} pointerEvents="box-none">
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                testID="view-offer-back"
              >
                <ArrowLeft size={22} color="#fff" />
              </TouchableOpacity>

              {offer.discount_type === 'percent' && offer.discount_value ? (
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>{offer.discount_value}% OFF</Text>
                </View>
              ) : (
                <View />
              )}
            </View>

            {offer.discount_type ? (
              <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                <Text style={styles.typeBadgeText}>{offer.discount_type}</Text>
              </View>
            ) : null}
          </SafeAreaView>
        </View>

        {business ? (
          <Surface style={styles.bizStrip} elevation={1}>
            <View style={styles.bizLogoWrap}>
              {business.logo_url ? (
                <Image source={{ uri: business.logo_url }} style={styles.bizLogo} />
              ) : (
                <View style={[styles.bizLogo, styles.bizLogoFallback]}>
                  <Text style={styles.bizLogoLetter}>
                    {business.business_name?.charAt(0)?.toUpperCase() ?? 'B'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.bizInfo}>
              <Text style={styles.bizName} numberOfLines={1}>
                {business.business_name}
              </Text>
              <View style={styles.bizMetaRow}>
                {business.category ? (
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{business.category}</Text>
                  </View>
                ) : null}
                {business.city ? (
                  <View style={styles.cityRow}>
                    <MapPin size={12} color="#6B7280" />
                    <Text style={styles.cityText}>{business.city}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/business-profile/${business.id}` as never)}
              testID="view-business-link"
            >
              <Text style={styles.viewBiz}>View Business</Text>
            </TouchableOpacity>
          </Surface>
        ) : null}

        <View style={styles.contentWrap}>
          <Text style={styles.title}>{offer.title}</Text>

          <View style={styles.validityRow}>
            <Calendar size={16} color={PURPLE} />
            <Text style={styles.validityText}>
              Valid: {formatDate(offer.starts_at)} – {formatDate(offer.expires_at)}
            </Text>
          </View>

          {!offerEnded ? (
            <View style={styles.countdownRow}>
              <Clock size={14} color={countdown.soon ? RED : '#6B7280'} />
              <Text
                style={[
                  styles.countdownText,
                  { color: countdown.soon ? RED : '#6B7280' },
                ]}
              >
                {countdown.label}
              </Text>
            </View>
          ) : null}

          {!offerEnded && countdown.soon ? (
            <View style={styles.expiringStrip}>
              <Text style={styles.expiringText}>Expiring soon!</Text>
            </View>
          ) : null}

          {offerEnded ? (
            <View style={styles.endedBanner}>
              <Text style={styles.endedText}>This offer has ended</Text>
            </View>
          ) : null}

          {offer.description ? (
            <Text style={styles.description}>{offer.description}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.termsToggle}
            onPress={() => setShowTerms((v) => !v)}
            testID="terms-toggle"
          >
            <Text style={styles.termsLabel}>Terms & Conditions</Text>
            {showTerms ? (
              <ChevronUp size={18} color="#374151" />
            ) : (
              <ChevronDown size={18} color="#374151" />
            )}
          </TouchableOpacity>
          {showTerms ? (
            <Text style={styles.termsBody}>
              {offer.terms_conditions?.trim() ||
                'Standard terms apply. Offer cannot be combined with other promotions. Subject to availability and change without notice.'}
            </Text>
          ) : null}

          {!isSubscribed ? (
            <View style={styles.subBanner}>
              <Text style={styles.subBannerText}>
                Subscribe to {business?.business_name ?? 'this business'} to earn rewards on this offer
              </Text>
              <Button
                mode="contained"
                buttonColor={PURPLE}
                onPress={handleSubscribe}
                loading={subscribing}
                disabled={subscribing || offerEnded}
                style={styles.subBtn}
                contentStyle={styles.subBtnContent}
                labelStyle={styles.subBtnLabel}
              >
                Subscribe Now
              </Button>
            </View>
          ) : (
            <View style={styles.pointsBanner}>
              <Chip
                style={styles.subscribedChip}
                textStyle={styles.subscribedChipText}
                compact
              >
                You are subscribed
              </Chip>
              <Text style={styles.pointsText}>
                You earn {sharingPoints} pts for sharing this
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBarWrap}>
        <View style={styles.bottomBar}>
          <Button
            mode="outlined"
            textColor={PURPLE}
            onPress={handleShare}
            loading={sharing}
            disabled={sharing || offerEnded}
            style={[styles.shareBtn, !isSubscribed && { flex: 1 }, isSubscribed && { flex: 1 }]}
            contentStyle={styles.btnContent}
            icon={() => <Share2 size={18} color={PURPLE} />}
            testID="share-offer-btn"
          >
            Share Offer
          </Button>
          {!isSubscribed ? (
            <Button
              mode="contained"
              buttonColor={PURPLE}
              onPress={handleSubscribe}
              loading={subscribing}
              disabled={subscribing || offerEnded}
              style={[styles.subscribeBottomBtn, { flex: 1.2 }]}
              contentStyle={styles.btnContent}
              labelStyle={styles.subscribeBottomLabel}
              testID="subscribe-earn-btn"
            >
              Subscribe & Earn Rewards
            </Button>
          ) : null}
        </View>
      </SafeAreaView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        style={styles.snackbar}
      >
        {snackbarText}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 140 },
  heroWrap: { width: '100%', height: 240, backgroundColor: '#E5E7EB' },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountPill: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  discountText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  bizStrip: {
    marginHorizontal: 16,
    marginTop: -24,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bizLogoWrap: {},
  bizLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6' },
  bizLogoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: LIGHT_PURPLE },
  bizLogoLetter: { color: PURPLE, fontWeight: '800', fontSize: 16 },
  bizInfo: { flex: 1 },
  bizName: { fontWeight: '700', fontSize: 15, color: '#111827' },
  bizMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  categoryChip: {
    backgroundColor: LIGHT_PURPLE,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryChipText: { color: PURPLE, fontSize: 11, fontWeight: '600' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cityText: { color: '#6B7280', fontSize: 12 },
  viewBiz: { color: PURPLE, fontWeight: '600', fontSize: 13 },
  contentWrap: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 28 },
  validityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  validityText: { color: '#374151', fontSize: 13, fontWeight: '500' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  countdownText: { fontSize: 13, fontWeight: '600' },
  expiringStrip: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  expiringText: { color: RED, fontWeight: '700', fontSize: 13 },
  endedBanner: {
    backgroundColor: RED,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  endedText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  description: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16,
  },
  termsToggle: {
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  termsLabel: { fontWeight: '600', color: '#111827', fontSize: 14 },
  termsBody: { marginTop: 10, color: '#6B7280', fontSize: 13, lineHeight: 19 },
  subBanner: {
    backgroundColor: LIGHT_PURPLE,
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  subBannerText: { color: '#1F2937', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  subBtn: { marginTop: 12, borderRadius: 10 },
  subBtnContent: { height: 42 },
  subBtnLabel: { fontWeight: '700' },
  pointsBanner: {
    backgroundColor: LIGHT_TEAL,
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
    gap: 8,
  },
  subscribedChip: { backgroundColor: TEAL, alignSelf: 'flex-start' },
  subscribedChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  pointsText: { color: '#064E3B', fontSize: 14, fontWeight: '600' },
  bottomBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shareBtn: { borderColor: PURPLE, borderRadius: 10, borderWidth: 1.5 },
  subscribeBottomBtn: { borderRadius: 10 },
  subscribeBottomLabel: { fontWeight: '700', fontSize: 13 },
  btnContent: { height: 46 },
  snackbar: { marginBottom: 100 },
  skeletonHero: { width: '100%', height: 240, backgroundColor: '#EEF2F7' },
  skeletonBlock: {
    height: 16,
    backgroundColor: '#EEF2F7',
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
    width: '80%',
  },
  skeletonCenter: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  errorSub: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  goBackBtn: { borderRadius: 10 },
  sharedByBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: LIGHT_PURPLE,
  },
  sharedByLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A5C35',
  },
  sharedByAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedByAvatarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  sharedByName: {
    fontSize: 13,
    fontWeight: '700',
    color: PURPLE,
    flex: 1,
  },
});
