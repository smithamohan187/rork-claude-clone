import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveBusiness,
  unsaveBusiness,
  getSavedStatus,
} from '@/api/services/savedBusinessService';

export function useSavedBusiness(businessId: string) {
  const { authUser } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!businessId || !authUser) return;
    let cancelled = false;
    getSavedStatus(businessId)
      .then((data) => { if (!cancelled) setIsSaved(data.isSaved); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [businessId, authUser?.id]));

  const save = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setIsSaved(true);
    try {
      await saveBusiness(businessId);
    } catch {
      setIsSaved(false);
      Alert.alert('Error', 'Could not save business. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [businessId, isSaving]);

  const unsave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setIsSaved(false);
    try {
      await unsaveBusiness(businessId);
    } catch {
      setIsSaved(true);
      Alert.alert('Error', 'Could not unsave business. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [businessId, isSaving]);

  return { isSaved, isSaving, save, unsave };
}
