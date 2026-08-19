import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Country, State, City } from 'country-state-city';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMyProfile,
  updateMyProfile,
  uploadAvatarFile,
  saveAvatarUrl,
  resolveAvatarUrl,
  fetchInterestCategories,
  type InterestCategory,
} from '@/api/services/profileService';

export function useEditProfile() {

  const { isAuthenticated, authLoading, authUser, updateAuthUser, accessToken } = useAuth();
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

  const [avatarUri, setAvatarUri]                   = useState<string | null>(authUser?.avatar ?? null);
  const [pendingAvatarBase64, setPendingAvatarBase64] = useState<string | null>(null);
  const [pendingAvatarFileUri, setPendingAvatarFileUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar]         = useState(false);

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
        setAvatarUri(resolveAvatarUrl(profile.avatar_url) ?? authUser?.avatar ?? null);
        setCountry(profile.country ?? '');
        setState(profile.state ?? '');
        setCity(profile.city ?? '');
        setSelectedInterestIds(profile.interests.map((i) => i.id));
        setInterests(cats);

        // Re-derive countryCode/stateCode from the saved names so the State/City
        // autocomplete lookups (which need ISO codes, not names) work again after
        // a reload — the profile row only stores names, never the codes.
        if (profile.country) {
          const countryMatch = Country.getAllCountries().find((c) => c.name === profile.country);
          if (countryMatch) {
            setCountryCode(countryMatch.isoCode);
            if (profile.state) {
              const stateMatch = State.getStatesOfCountry(countryMatch.isoCode)
                .find((s) => s.name === profile.state);
              if (stateMatch) setStateCode(stateMatch.isoCode);
            }
          }
        }
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

  // Pick image and store locally for display — upload is deferred to handleSave
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
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    const dataUri = `data:image/jpeg;base64,${asset.base64}`;
    setPendingAvatarBase64(dataUri);
    setPendingAvatarFileUri(asset.uri);
    setAvatarUri(dataUri); // show immediately for local feedback
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      let resolvedAvatarUrl: string | undefined;

      if (pendingAvatarBase64 && accessToken) {
        setUploadingAvatar(true);
        try {
          const relativeUrl = await uploadAvatarFile({
            fileUri: pendingAvatarFileUri ?? '',
            base64DataUri: pendingAvatarBase64,
            token: accessToken,
          });
          await saveAvatarUrl(relativeUrl);
          resolvedAvatarUrl = resolveAvatarUrl(relativeUrl) ?? undefined;
          setAvatarUri(resolvedAvatarUrl ?? null);
          setPendingAvatarBase64(null);
          setPendingAvatarFileUri(null);
        } finally {
          setUploadingAvatar(false);
        }
      }

      await updateMyProfile({
        display_name:  fullName.trim() || undefined,
        phone:         phone.trim() || undefined,
        bio:           bio.trim() || undefined,
        city:          city.trim() || undefined,
        state:         state.trim() || undefined,
        country:       country.trim() || undefined,
        interest_ids:  selectedInterestIds,
      });

      // Sync AuthContext so drawer and other consumers reflect changes immediately
      updateAuthUser({
        name:   fullName.trim() || undefined,
        avatar: resolvedAvatarUrl ?? avatarUri ?? undefined,
      });

      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [fullName, phone, bio, city, state, country, selectedInterestIds,
      pendingAvatarBase64, pendingAvatarFileUri, accessToken, avatarUri, updateAuthUser]);

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
