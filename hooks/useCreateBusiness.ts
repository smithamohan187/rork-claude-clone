import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Country, State, City } from 'country-state-city';
import { useAuth } from '@/contexts/AuthContext';
import {
  registerBusiness,
  fetchMyBusiness,
  uploadBusinessLogo,
  uploadBusinessCoverPhoto,
  completeOnboarding,
  type BusinessHour,
  type RegisterBusinessPayload,
} from '@/api/services/businessService';
import { fetchBusinessCategories, type Category } from '@/api/services/categoriesService';
import { getPendingShareReferral, clearPendingShareReferral } from '@/utils/shareReferral';
import { fetchPlans, selectFreePlan, fetchMySubscription, type SubscriptionPlan, type BusinessSubscription } from '@/api/services/billingService';
import { useSubscriptionCheckout } from './useSubscriptionCheckout';

export type { BusinessHour };

export type BusinessType = 'goodwill' | 'incentivised' | '';

const DEFAULT_HOURS: BusinessHour[] = [0, 1, 2, 3, 4, 5, 6].map(day_of_week => ({
  day_of_week,
  open_time: '09:00',
  close_time: '18:00',
  is_closed: false,
}));

function isValidPhone(val: string): boolean {
  return /^\+?[\d\s\-()+]{7,20}$/.test(val);
}

function isValidUrl(val: string): boolean {
  return val.startsWith('http://') || val.startsWith('https://');
}

/**
 * Converts a local image URI to a stable display URI immediately after picking.
 * On Expo web, ImagePicker returns a blob: URL that gets revoked between renders,
 * causing the preview image to disappear. We convert to base64 via FileReader right
 * away so the URI remains valid for both display and upload.
 * On native (iOS/Android), file:// URIs are stable — returned unchanged.
 */
async function toDisplayUri(uri: string): Promise<string> {
  // Native file:// URIs are always stable — no conversion needed
  if (!uri.startsWith('blob:') && !uri.startsWith('http')) return uri;

  // Web: fetch the blob and encode it as a base64 data URI
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.open('GET', uri);
    xhr.responseType = 'blob';
    xhr.send();
  });
}

export function useCreateBusiness() {
  const router = useRouter();
  const { updateAuthUser, refreshProfiles, authLoading, isAuthenticated } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [businessCategories, setBusinessCategories] = useState<Category[]>([]);

  // Step 6 — Choose a Plan
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [existingSubscription, setExistingSubscription] = useState<BusinessSubscription | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { checkout } = useSubscriptionCheckout();

  // A resolved subscription (active/trial) means this is a normal revisit/edit — the plan is
  // managed from app/billing-settings.tsx, not re-selectable here. Unresolved (cancelled/expired/
  // missing) is the "resume interrupted Stripe Checkout" case, which still needs a selection.
  const isPlanLocked = !!existingSubscription &&
    (existingSubscription.status === 'active' || existingSubscription.status === 'trial');

  // Existing business id — set on mount if user already has one
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Auto-carried from a business-invite deep link (see useShareDeepLink/useSignUp) — read on mount,
  // submitted with registration, cleared only once registration actually succeeds.
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

  // Step 1 — Business Basics
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 — Contact & Location
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [state, setState] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [city, setCity] = useState('');

  const [countrySuggestions, setCountrySuggestions] = useState<ReturnType<typeof Country.getAllCountries>>([]);
  const [stateSuggestions, setStateSuggestions] = useState<ReturnType<typeof State.getAllStates>>([]);
  const [citySuggestions, setCitySuggestions] = useState<ReturnType<typeof City.getAllCities>>([]);

  // Step 3 — Business Hours
  const [hours, setHours] = useState<BusinessHour[]>(DEFAULT_HOURS);

  // Step 4 — Referral Settings
  const [inhouseReferral, setInhouseReferral] = useState(false);
  const [inhouseReferralUrl, setInhouseReferralUrl] = useState('');

  // Step 5 — Media
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessCategories()
      .then(setBusinessCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPlansLoading(true);
    fetchPlans()
      .then(setPlans)
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    getPendingShareReferral()
      .then((pending) => {
        if (pending?.content_type === 'business_invite') {
          setPendingInviteCode(pending.referral_code);
        }
      })
      .catch(() => {});
  }, []);

  // Prefill from existing business on mount — waits for session restore to finish so this
  // doesn't fire on a cold page load before the access token is back in memory (would 401
  // and silently leave the form blank instead of showing the existing business).
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchMyBusiness()
      .then(async (biz) => {
        if (!biz) return;
        setBusinessId(biz.id);
        setBusinessName(biz.name ?? '');
        setBusinessType((biz.business_type ?? '') as BusinessType);
        setCategoryId(biz.category_id ?? '');
        setDescription(biz.description ?? '');
        setPhone(biz.phone ?? '');
        setWebsite(biz.website ?? '');
        setAddress(biz.address ?? '');
        setCountry(biz.country ?? '');
        setState(biz.state ?? '');
        setCity(biz.city ?? '');
        setInhouseReferral(biz.inhouse_referral ?? false);
        setInhouseReferralUrl(biz.inhouse_referral_url ?? '');
        setLogoUri(biz.logo_url ?? null);
        setCoverUri(biz.cover_url ?? null);
        if (biz.hours && biz.hours.length > 0) setHours(biz.hours);

        // onboarding_complete flips true the moment step 1-5 submission succeeds and stays
        // true forever after — it does NOT mean billing is still unresolved (a returning user
        // who already has an active plan would have onboarding_complete=true too). Only jump
        // straight to Plan when billing is genuinely unresolved: no subscription row at all, or
        // one that's cancelled/expired (e.g. the user cancelled Stripe Checkout on web, which
        // fully remounts this screen) — active/trial means it's a normal revisit/edit and should
        // start at Step 1 like before.
        if (biz.onboarding_complete) {
          const subscription = await fetchMySubscription().catch(() => null);
          setExistingSubscription(subscription);
          const unresolved = !subscription || subscription.status === 'cancelled' || subscription.status === 'expired';
          if (unresolved) setCurrentStep(6);
        }

        // Re-derive countryCode/stateCode from the saved names so the State/City
        // autocomplete lookups (which need ISO codes, not names) work again after
        // a reload — the business row only stores names, never the codes.
        if (biz.country) {
          const countryMatch = Country.getAllCountries().find((c) => c.name === biz.country);
          if (countryMatch) {
            setCountryCode(countryMatch.isoCode);
            if (biz.state) {
              const stateMatch = State.getStatesOfCountry(countryMatch.isoCode)
                .find((s) => s.name === biz.state);
              if (stateMatch) setStateCode(stateMatch.isoCode);
            }
          }
        }
      })
      .catch(() => {});
  }, [authLoading, isAuthenticated]);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const updateHour = useCallback((index: number, patch: Partial<BusinessHour>) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, ...patch } : h));
  }, []);

  // Country-state-city handlers
  const onCountryChange = useCallback((text: string) => {
    setCountry(text);
    setCountryCode('');
    clearFieldError('country');
    if (text.length < 2) { setCountrySuggestions([]); return; }
    const all = Country.getAllCountries();
    setCountrySuggestions(
      all.filter(c => c.name.toLowerCase().startsWith(text.toLowerCase())).slice(0, 6)
    );
  }, [clearFieldError]);

  const onCountrySelect = useCallback((c: ReturnType<typeof Country.getAllCountries>[number]) => {
    setCountry(c.name);
    setCountryCode(c.isoCode);
    setCountrySuggestions([]);
    setState('');
    setStateCode('');
    setCity('');
  }, []);

  const onStateChange = useCallback((text: string) => {
    setState(text);
    setStateCode('');
    if (!countryCode || text.length < 1) { setStateSuggestions([]); return; }
    const all = State.getStatesOfCountry(countryCode);
    setStateSuggestions(
      all.filter(s => s.name.toLowerCase().startsWith(text.toLowerCase())).slice(0, 6)
    );
  }, [countryCode]);

  const onStateSelect = useCallback((s: ReturnType<typeof State.getAllStates>[number]) => {
    setState(s.name);
    setStateCode(s.isoCode);
    setStateSuggestions([]);
    setCity('');
  }, []);

  const onCityChange = useCallback((text: string) => {
    setCity(text);
    if (!countryCode || !stateCode || text.length < 1) { setCitySuggestions([]); return; }
    const all = City.getCitiesOfState(countryCode, stateCode);
    setCitySuggestions(
      all.filter(c => c.name.toLowerCase().startsWith(text.toLowerCase())).slice(0, 6)
    );
  }, [countryCode, stateCode]);

  const onCitySelect = useCallback((c: ReturnType<typeof City.getAllCities>[number]) => {
    setCity(c.name);
    setCitySuggestions([]);
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!businessName.trim()) errs.businessName = 'Business name is required';
      if (!businessType) errs.businessType = 'Business type is required';
      if (!categoryId) errs.categoryId = 'Category is required';
    }

    if (step === 2) {
      if (phone.trim() && !isValidPhone(phone.trim())) {
        errs.phone = 'Enter a valid phone number';
      }
      if (website.trim() && !isValidUrl(website.trim())) {
        errs.website = 'Website must start with http:// or https://';
      }
    }

    if (step === 4) {
      if (inhouseReferral && !isValidUrl(inhouseReferralUrl.trim())) {
        errs.inhouseReferralUrl = 'Referral URL must start with http:// or https://';
      }
    }

    if (step === 6 && !isPlanLocked) {
      if (!selectedPlanId) errs.selectedPlanId = 'Please select a plan';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [businessName, businessType, categoryId, phone, website, inhouseReferral, inhouseReferralUrl, selectedPlanId, isPlanLocked]);

  const goNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  }, [currentStep, validateStep]);

  const goBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  }, []);

  const pickLogo = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      // Convert to stable display URI immediately — blob URLs get revoked on web
      const displayUri = await toDisplayUri(result.assets[0].uri);
      console.log('[pickLogo] displayUri:', displayUri);
      setLogoUri(displayUri);
    }
  }, []);

  const pickCover = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      // Convert to stable display URI immediately — blob URLs get revoked on web
      const displayUri = await toDisplayUri(result.assets[0].uri);
      setCoverUri(displayUri);
    }
  }, []);

  const finishAndNavigate = useCallback(async () => {
    updateAuthUser({ role: 'business' });
    // Refresh profiles so the business pill appears in ProfileSwitcherPill
    try { await refreshProfiles(); } catch { /* non-fatal */ }
    router.replace('/(tabs)/feed' as never);
  }, [updateAuthUser, refreshProfiles, router]);

  const submit = useCallback(async () => {
    if (!validateStep(6)) return;
    setLoading(true);
    setApiError(null);

    try {
      const payload: RegisterBusinessPayload = {
        business_name: businessName.trim(),
        category_id: categoryId,
        business_type: businessType as 'goodwill' | 'incentivised',
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        inhouse_referral: inhouseReferral,
        inhouse_referral_url: inhouseReferral ? inhouseReferralUrl.trim() : undefined,
        hours,
        invite_code: pendingInviteCode ?? undefined,
      };

      // registerBusiness is always called — backend does upsert if business already exists
      const business = await registerBusiness(payload);
      const id = business.id;
      setBusinessId(id);

      if (pendingInviteCode) {
        await clearPendingShareReferral();
        setPendingInviteCode(null);
      }

      if (__DEV__) console.log('[upload] logoUri:', logoUri);
      if (logoUri) await uploadBusinessLogo(id, logoUri);
      if (__DEV__) console.log('[upload] coverUri:', coverUri);
      if (coverUri) await uploadBusinessCoverPhoto(id, coverUri);

      await completeOnboarding(id);

      if (isPlanLocked) {
        // Plan is already resolved and managed from billing-settings — this submit is just a
        // profile-info edit, no plan action.
        await finishAndNavigate();
      } else {
        const selectedPlan = plans.find(p => p.id === selectedPlanId);

        if (!selectedPlan || selectedPlan.price_monthly === 0) {
          await selectFreePlan();
          setSuccessMessage('Business created successfully!');
        } else {
          const { outcome } = await checkout(selectedPlan.id);
          if (outcome === 'success') {
            setSuccessMessage('Payment completed and business created successfully!');
          } else if (outcome !== 'redirected') {
            // 'redirected' (web) means the page is navigating away to Stripe — not a failure.
            // The checkout-success/checkout-cancel screens take over from here.
            setApiError('Checkout was not completed. Select a plan and try again.');
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    businessName, businessType, categoryId, description,
    phone, website, address, city, state, country,
    inhouseReferral, inhouseReferralUrl, hours, logoUri, coverUri,
    validateStep, plans, selectedPlanId, checkout, finishAndNavigate, isPlanLocked,
  ]);

  return {
    currentStep,
    errors,
    loading,
    apiError,
    setApiError,
    businessId,
    // Step 1
    businessName, setBusinessName: (v: string) => { setBusinessName(v); clearFieldError('businessName'); },
    businessType, setBusinessType: (v: BusinessType) => { setBusinessType(v); clearFieldError('businessType'); },
    categoryId, setCategoryId: (v: string) => { setCategoryId(v); clearFieldError('categoryId'); },
    description, setDescription,
    // Step 2
    phone, setPhone: (v: string) => { setPhone(v); clearFieldError('phone'); },
    website, setWebsite: (v: string) => { setWebsite(v); clearFieldError('website'); },
    address, setAddress,
    country, onCountryChange, onCountrySelect, countrySuggestions,
    state,   onStateChange,   onStateSelect,   stateSuggestions,
    city,    onCityChange,    onCitySelect,    citySuggestions,
    // Step 3
    hours, updateHour,
    // Step 4
    inhouseReferral, setInhouseReferral,
    inhouseReferralUrl, setInhouseReferralUrl: (v: string) => { setInhouseReferralUrl(v); clearFieldError('inhouseReferralUrl'); },
    // Step 5
    logoUri, coverUri,
    pickLogo, pickCover,
    // Step 6
    plans, plansLoading, selectedPlanId, existingSubscription, isPlanLocked,
    setSelectedPlanId: (v: string) => { setSelectedPlanId(v); clearFieldError('selectedPlanId'); },
    // Categories
    businessCategories,
    // Success message (business creation complete — free plan or paid checkout)
    successMessage,
    // Navigation
    goNext, goBack, submit, finishAndNavigate,
  };
}
