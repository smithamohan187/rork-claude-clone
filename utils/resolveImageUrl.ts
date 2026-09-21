const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Resolves a stored image path to a URL the app can load.
 * The backend returns either a legacy relative path (`/uploads/...`, pre-GCS-migration)
 * or a full absolute GCS URL (`https://storage.googleapis.com/...`, current format) —
 * this must handle both. Never strip the `startsWith('http')` guard: without it, a GCS
 * URL becomes malformed (`${BASE_URL}https://storage.googleapis.com/...`).
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}
