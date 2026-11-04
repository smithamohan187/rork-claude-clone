/**
 * Normalise a possibly-bare website string into a tappable URL.
 *
 * Used by the feed cards' Share button when a business has opted in to its own
 * in-house referral program (`businesses.inhouse_referral` / `inhouse_referral_url`,
 * set from the business "Complete Profile" / create / edit screens) — Share then
 * opens this URL instead of the in-app share sheet.
 */
export function normaliseWebsiteUrl(url: string | undefined | null): string | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}
