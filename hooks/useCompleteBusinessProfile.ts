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
} from '@/api/services/businessService';

// Converts a local image URI to a stable display URI immediately after picking.
// On Expo web, ImagePicker returns a blob: URL that gets revoked between renders,
// causing the preview image to disappear. Converting to base64 right away keeps it
// valid for both display and upload. Native file:// URIs are already stable.
// (Duplicated from hooks/useCreateBusiness.ts — not currently exported from there.)
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

// Powers the dashboard checklist's "Complete Profile" step: one consolidated form for everything
// the minimal business signup deferred (business type, description, contact/location details,
// logo/cover photo). Deliberately does not re-collect business name/category (already set at
// signup) or hours — those remain editable from the existing business-profile edit flow.
export function useCompleteBusinessProfile() {
  const router = useRouter();

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

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [initialLogoUri, setInitialLogoUri] = useState<string | null>(null);
  const [initialCoverUri, setInitialCoverUri] = useState<string | null>(null);

  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  const pickLogo = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(await toDisplayUri(result.assets[0].uri));
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
      setCoverUri(await toDisplayUri(result.assets[0].uri));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const business: BusinessFullData | null = await fetchMyBusiness();
        if (cancelled || !business) return;
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
        setLogoUri(business.logo_url ?? null);
        setCoverUri(business.cover_url ?? null);
        setInitialLogoUri(business.logo_url ?? null);
        setInitialCoverUri(business.cover_url ?? null);

        // Only fill in via GPS if the owner hasn't already saved a location — never clobber it.
        if (!business.city && !business.state && !business.country) {
          detectLocation();
        }
      } catch (err) {
        if (__DEV__) console.error('[useCompleteBusinessProfile] load error:', err);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    if (saving || !businessId) return;
    setSaving(true);
    setError(null);
    try {
      await updateMyBusiness({
        business_name: businessName,
        category_id: categoryId,
        business_type: businessType,
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        inhouse_referral: false,
      });
      if (logoUri && logoUri !== initialLogoUri) {
        await uploadBusinessLogo(businessId, logoUri);
      }
      if (coverUri && coverUri !== initialCoverUri) {
        await uploadBusinessCoverPhoto(businessId, coverUri);
      }
      await completeOnboarding(businessId);
      setSaved(true);
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save your profile. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [
    saving, businessId, businessName, categoryId, businessType,
    description, phone, website, address, city, state, country, router,
    logoUri, coverUri, initialLogoUri, initialCoverUri,
  ]);

  return {
    businessType, setBusinessType,
    description, setDescription,
    phone, setPhone,
    website, setWebsite,
    address, setAddress,
    city, setCity,
    state, setState,
    country, setCountry,
    detecting, detectError, detectLocation,

    logoUri, coverUri, pickLogo, pickCover,

    loadingInitial, saving, error, saved,
    handleSave,
  };
}
