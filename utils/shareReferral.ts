import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

// A deferred content-share referral captured from a deep link before the user is registered.
// Persisted so that after registration we can (a) submit the code and (b) land the user on the
// originally shared detail screen instead of the default post-signup landing.
export interface PendingShareReferral {
  referral_code: string;
  route: string;        // resolved detail route, e.g. '/view-post'
  id_param: string;     // param name the route expects, e.g. 'postId'
  content_id: string;
  business_id: string;
}

const PENDING_KEY = 'pending_share_referral';

// Extracts a referral_code from an inbound deep link. Handles both the web share form
// (https://<domain>/s/<CODE>) and the custom scheme with a query param (?referral_code=CODE).
export function parseReferralFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { queryParams, path } = Linking.parse(url);
    const fromQuery = queryParams?.referral_code;
    if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
    // Path form: .../s/<CODE>
    const match = (path ?? '').match(/(?:^|\/)s\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Malformed URL — ignore, no referral.
  }
  return null;
}

export async function setPendingShareReferral(pending: PendingShareReferral): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch (e) {
    if (__DEV__) console.log('[shareReferral] setPending failed', e);
  }
}

export async function getPendingShareReferral(): Promise<PendingShareReferral | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingShareReferral) : null;
  } catch {
    return null;
  }
}

export async function clearPendingShareReferral(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}
