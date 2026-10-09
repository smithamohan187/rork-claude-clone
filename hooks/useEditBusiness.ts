import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  fetchMyBusiness,
  updateMyBusiness,
  completeOnboarding,
  uploadBusinessLogo,
  uploadBusinessCoverPhoto,
  type BusinessFullData,
  type BusinessHour,
} from '@/api/services/businessService';
import { fetchBusinessCategories, type Category } from '@/api/services/categoriesService';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_HOURS: BusinessHour[] = [0, 1, 2, 3, 4, 5, 6].map(day_of_week => ({
  day_of_week,
  open_time: '09:00',
  close_time: '18:00',
  is_closed: false,
}));

// Converts a local image URI to a stable display URI immediately after picking.
// On Expo web, ImagePicker returns a blob: URL that gets revoked between renders,
// causing the preview image to disappear. Converting to base64 right away keeps it
// valid for both display and upload. Native file:// URIs are already stable.
async function toDisplayUri(uri: string): Promise<string> {
  if (!uri.startsWith('blob:') && !uri.startsWith('http')) return uri;
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

export type FieldErrors = Record<string, string>;

// Single-page "Edit Business" form reachable from Settings — consolidates every field a
// business owner entered earlier (name, category, type, description, contact, location,
// hours, photo) into one save, reusing the same upsert endpoint the onboarding wizard uses.
export function useEditBusiness() {
  const router = useRouter();
  const { refreshProfiles } = useAuth();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [businessType, setBusinessType] = useState<'goodwill' | 'incentivised'>('goodwill');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [hours, setHours] = useState<BusinessHour[]>(DEFAULT_HOURS);

  // Round-tripped unchanged — not exposed as fields in this form, but required by the
  // backend schema; omitting inhouse_referral would reset it to false via a Joi default.
  const [inhouseReferral, setInhouseReferral] = useState(false);
  const [inhouseReferralUrl, setInhouseReferralUrl] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [initialPhotoUri, setInitialPhotoUri] = useState<string | null>(null);

  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const updateHour = useCallback((index: number, patch: Partial<BusinessHour>) => {
    setHours(prev => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
    const day = hours[index]?.day_of_week;
    if (day !== undefined) clearFieldError(`hours_${day}`);
  }, [hours, clearFieldError]);

  const detectLocation = useCallback(async () => {
    setDetectError(null);
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDetectError('Location permission denied — please enter your address manually');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (!place) {
        setDetectError('Could not determine your location — please enter it manually');
        return;
      }
      const detectedCity = place.city || place.subregion || '';
      const detectedState = place.region || '';
      const detectedCountry = place.country || '';
      if (!detectedCity && !detectedState && !detectedCountry) {
        setDetectError('Could not determine your location — please enter it manually');
        return;
      }
      if (detectedCity) setCity(detectedCity);
      if (detectedState) setState(detectedState);
      if (detectedCountry) setCountry(detectedCountry);
    } catch {
      setDetectError('Location detection is unavailable — please enter it manually');
    } finally {
      setDetecting(false);
    }
  }, []);

  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(await toDisplayUri(result.assets[0].uri));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [business, cats]: [BusinessFullData | null, Category[]] = await Promise.all([
          fetchMyBusiness(),
          fetchBusinessCategories(),
        ]);
        if (cancelled) return;
        setCategories(cats);
        if (!business) return;
        setBusinessId(business.id);
        setBusinessName(business.name);
        setCategoryId(business.category_id);
        setBusinessType(business.business_type);
        setDescription(business.description ?? '');
        setPhone(business.phone ?? '');
        setWebsite(business.website ?? '');
        setAddress(business.address ?? '');
        setCity(business.city ?? '');
        setState(business.state ?? '');
        setCountry(business.country ?? '');
        setHours(business.hours && business.hours.length > 0 ? business.hours : DEFAULT_HOURS);
        setInhouseReferral(business.inhouse_referral ?? false);
        setInhouseReferralUrl(business.inhouse_referral_url ?? null);
        const existingPhoto = business.logo_url ?? business.cover_url ?? null;
        setPhotoUri(existingPhoto);
        setInitialPhotoUri(existingPhoto);
      } catch (err) {
        if (__DEV__) console.error('[useEditBusiness] load error:', err);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const validate = useCallback((): boolean => {
    const errs: FieldErrors = {};
    if (!businessName.trim()) errs.businessName = 'Business name is required';
    if (!categoryId) errs.categoryId = 'Category is required';
    hours.forEach((h) => {
      if (!h.is_closed) {
        if (!h.open_time) errs[`hours_${h.day_of_week}`] = 'Open time required';
        else if (!h.close_time) errs[`hours_${h.day_of_week}`] = 'Close time required';
        else if (h.close_time <= h.open_time) errs[`hours_${h.day_of_week}`] = 'Close time must be after open time';
      }
    });
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [businessName, categoryId, hours]);

  const handleSave = useCallback(async () => {
    if (saving || !businessId) return;
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      await updateMyBusiness({
        business_name: businessName.trim(),
        category_id: categoryId,
        business_type: businessType,
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        inhouse_referral: inhouseReferral,
        inhouse_referral_url: inhouseReferral ? (inhouseReferralUrl ?? undefined) : undefined,
        hours,
      });
      if (photoUri && photoUri !== initialPhotoUri) {
        await uploadBusinessLogo(businessId, photoUri);
        await uploadBusinessCoverPhoto(businessId, photoUri);
      }
      await completeOnboarding(businessId);
      try { await refreshProfiles(); } catch { /* non-fatal */ }
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save your business. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [
    saving, businessId, validate, businessName, categoryId, businessType,
    description, phone, website, address, city, state, country,
    inhouseReferral, inhouseReferralUrl, hours, photoUri, initialPhotoUri,
    refreshProfiles, router,
  ]);

  return {
    businessName, setBusinessName: (v: string) => { setBusinessName(v); clearFieldError('businessName'); },
    categoryId, setCategoryId: (v: string) => { setCategoryId(v); clearFieldError('categoryId'); },
    categories,
    businessType, setBusinessType,
    description, setDescription,
    phone, setPhone,
    website, setWebsite,
    address, setAddress,
    city, setCity,
    state, setState,
    country, setCountry,
    detecting, detectError, detectLocation,

    hours, updateHour,

    photoUri, pickPhoto,

    loadingInitial, saving, error, fieldErrors,
    handleSave,
  };
}
