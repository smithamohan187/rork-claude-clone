import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Country, State, City } from 'country-state-city';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMyProfile,
  updateMyProfile,
  uploadAvatar,
  fetchInterestCategories,
  type InterestCategory,
} from '@/api/services/profileService';

export function useEditProfile() {
 
  const { isAuthenticated, authLoading, authUser, updateAuthUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
     // router.replace('/sign-in');
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  const [fullName, setFullName]       = useState('');
  const [phone, setPhone]             = useState('');
  const [bio, setBio]                 = useState('');
  const [country, setCountry]         = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [state, setState]             = useState('');
  const [stateCode, setStateCode]     = useState('');
  const [city, setCity]               = useState('');

  const [interests, setInterests]                   = useState<InterestCategory[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);

  const [countrySuggestions, setCountrySuggestions] = useState<ReturnType<typeof Country.getAllCountries>>([]);
  const [stateSuggestions, setStateSuggestions]     = useState<ReturnType<typeof State.getAllStates>>([]);
  const [citySuggestions, setCitySuggestions]       = useState<ReturnType<typeof City.getAllCities>>([]);

  const [avatarUri, setAvatarUri]           = useState<string | null>(authUser?.avatar ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setError('Please log in to edit your profile');
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [profile, cats] = await Promise.all([
          fetchMyProfile(),
          fetchInterestCategories(),
        ]);
        setFullName(profile.display_name ?? '');
        setPhone(profile.phone ?? '');
        setBio(profile.bio ?? '');
        setAvatarUri(profile.avatar_url ?? authUser?.avatar ?? null);
        setCountry(profile.country ?? '');
        setState(profile.state ?? '');
        setCity(profile.city ?? '');
        setSelectedInterestIds(profile.interests.map((i) => i.id));
        setInterests(cats);
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, isAuthenticated]);

  const onCountryChange = useCallback((text: string) => {
    setCountry(text);
    setCountryCode('');
    if (text.length < 2) { setCountrySuggestions([]); return; }
    const all = Country.getAllCountries();
    setCountrySuggestions(
      all.filter((c) => c.name.toLowerCase().startsWith(text.toLowerCase())).slice(0, 6)
    );
  }, []);

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
      all.filter((s) => s.name.toLowerCase().startsWith(text.toLowerCase())).slice(0, 6)
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
      all.filter((c) => c.name.toLowerCase().startsWith(text.toLowerCase())).slice(0, 6)
    );
  }, [countryCode, stateCode]);

  const onCitySelect = useCallback((c: ReturnType<typeof City.getAllCities>[number]) => {
    setCity(c.name);
    setCitySuggestions([]);
  }, []);

  const toggleInterest = useCallback((id: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const pickAndUploadAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera roll permission is required to change your avatar.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.5,
      base64: true,
    });
    if (picked.canceled || !picked.assets?.[0]?.base64) return;
    const dataUri = `data:image/jpeg;base64,${picked.assets[0].base64}`;
    setUploadingAvatar(true);
    try {
      const newUrl = await uploadAvatar(dataUri);
      setAvatarUri(newUrl);
      updateAuthUser({ avatar: newUrl });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(msg);
    } finally {
      setUploadingAvatar(false);
    }
  }, [updateAuthUser]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({
        display_name:  fullName.trim() || undefined,
        phone:         phone.trim() || undefined,
        bio:           bio.trim() || undefined,
        city:          city.trim() || undefined,
        state:         state.trim() || undefined,
        country:       country.trim() || undefined,
        interest_ids:  selectedInterestIds,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fullName, phone, bio, city, state, country, selectedInterestIds]);

  return {
    fullName,   setFullName,
    phone,      setPhone,
    bio,        setBio,
    country,    state,  city,
    onCountryChange,  onCountrySelect,  countrySuggestions,
    onStateChange,    onStateSelect,    stateSuggestions,
    onCityChange,     onCitySelect,     citySuggestions,
    interests,
    selectedInterestIds,
    toggleInterest,
    avatarUri,
    uploadingAvatar,
    pickAndUploadAvatar,
    loading,
    saving,
    error,
    success,
    setSuccess,
    handleSave,
  };
}
