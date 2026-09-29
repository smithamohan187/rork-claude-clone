import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  fetchMyBusiness,
  updateMyBusiness,
  completeOnboarding,
  type BusinessFullData,
} from '@/api/services/businessService';

// Powers the dashboard checklist's "Complete Profile" step: one consolidated form for everything
// the minimal business signup deferred (business type, description, contact/location details).
// Deliberately does not re-collect business name/category (already set at signup) or touch
// hours/logo/cover photo — those remain editable from the existing business-profile edit flow;
// this screen's job is just to get onboarding_complete flipped with the essentials filled in.
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

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
      } catch (err) {
        if (__DEV__) console.error('[useCompleteBusinessProfile] load error:', err);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => { cancelled = true; };
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

    loadingInitial, saving, error, saved,
    handleSave,
  };
}
