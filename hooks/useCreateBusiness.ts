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

export function useCreateBusiness() {
  const router = useRouter();
  const { updateAuthUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [businessCategories, setBusinessCategories] = useState<Category[]>([]);

  // Existing business id — set on mount if user already has one
  const [businessId, setBusinessId] = useState<string | null>(null);

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

  // Prefill from existing business on mount
  useEffect(() => {
    fetchMyBusiness()
      .then((biz) => {
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
        if (biz.hours && biz.hours.length > 0) setHours(biz.hours);
      })
      .catch(() => {});
  }, []);

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

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [businessName, businessType, categoryId, phone, website, inhouseReferral, inhouseReferralUrl]);

  const goNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
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
      setLogoUri(result.assets[0].uri);
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
      setCoverUri(result.assets[0].uri);
    }
  }, []);

  const submit = useCallback(async () => {
    if (!validateStep(5)) return;
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
      };

      // registerBusiness is always called — backend does upsert if business already exists
      const business = await registerBusiness(payload);
      const id = business.id;
      setBusinessId(id);

      if (__DEV__) console.log('[upload] logoUri:', logoUri);
      if (logoUri) await uploadBusinessLogo(id, logoUri);
      if (__DEV__) console.log('[upload] coverUri:', coverUri);
      if (coverUri) await uploadBusinessCoverPhoto(id, coverUri);

      await completeOnboarding(id);

      updateAuthUser({ role: 'business' });
      router.replace('/(tabs)/feed' as never);
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
    validateStep, updateAuthUser, router,
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
    // Categories
    businessCategories,
    // Navigation
    goNext, goBack, submit,
  };
}
