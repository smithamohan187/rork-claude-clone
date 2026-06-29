import { apiClient, getAccessToken, API_BASE_URL } from '../client';
import { Platform } from 'react-native';

async function buildFormData(fieldName: string, uri: string): Promise<FormData> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    // Browser — fetch the URI as a blob and append as a real File
    const response = await fetch(uri);
    const blob = await response.blob();
    const file = new File([blob], `${fieldName}.jpg`, { type: 'image/jpeg' });
    form.append(fieldName, file);
  } else {
    // iOS / Android — native FormData handles the object shape
    form.append(fieldName, {
      uri,
      name: `${fieldName}.jpg`,
      type: 'image/jpeg',
    } as any);
  }

  return form;
}

export interface BusinessHour {
  day_of_week: number
  open_time?: string
  close_time?: string
  is_closed: boolean
}

export interface RegisterBusinessPayload {
  business_name: string
  category_id: string
  business_type: 'goodwill' | 'incentivised'
  description?: string
  phone?: string
  website?: string
  address?: string
  city?: string
  state?: string
  country?: string
  inhouse_referral: boolean
  inhouse_referral_url?: string
  hours?: BusinessHour[]
}

export interface BusinessData {
  id: string
  name: string
  slug: string
  business_type: 'goodwill' | 'incentivised'
  logo_url?: string | null
  cover_url?: string | null
  onboarding_complete: boolean
}

export interface BusinessFullData {
  id: string
  name: string
  slug: string
  business_type: 'goodwill' | 'incentivised'
  category_id: string
  description?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  inhouse_referral: boolean
  inhouse_referral_url?: string | null
  logo_url?: string | null
  cover_url?: string | null
  onboarding_complete: boolean
  hours?: BusinessHour[]
}

export async function fetchMyBusiness(): Promise<BusinessFullData | null> {
  if (__DEV__) console.log('[fetch] Fetching my business');
  const result = await apiClient.get<BusinessFullData | null>('/businesses/me');
  if (!result.success) throw new Error(result.error ?? 'Failed to fetch business');
  return result.data ?? null;
}

export async function registerBusiness(payload: RegisterBusinessPayload): Promise<BusinessData> {
  const result = await apiClient.post<BusinessData>('/businesses/register', payload);
  if (!result.success || !result.data) throw new Error(result.error ?? 'Failed to register business');
  return result.data;
}

export async function uploadBusinessLogo(id: string, uri: string): Promise<string> {
  if (__DEV__) console.log('[upload] logoUri:', uri);
  const token = getAccessToken();
  const form = await buildFormData('logo', uri);
  const response = await fetch(`${API_BASE_URL}businesses/${id}/logo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Logo upload failed');
  return data.data?.logo_url ?? '';
}

export async function uploadBusinessCoverPhoto(id: string, uri: string): Promise<string> {
  const token = getAccessToken();
  const form = await buildFormData('photo', uri);
  if (__DEV__) console.log('[upload] coverUri:', uri);
  const response = await fetch(`${API_BASE_URL}businesses/${id}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Cover photo upload failed');
  return data.data?.cover_url ?? '';
}

export async function completeOnboarding(id: string): Promise<void> {
  const result = await apiClient.patch(`/businesses/${id}/onboarding-complete`);
  if (!result.success) throw new Error(result.error ?? 'Failed to complete onboarding');
}
