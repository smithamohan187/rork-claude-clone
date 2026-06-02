/**
 * In-memory registry of per-business referral-program opt-in settings.
 *
 * - Default: every business opts IN to the TouchPoint referral program.
 * - The business setup screen writes to this registry when the owner flips the toggle.
 * - Feed share buttons read from this registry (synchronously, on tap) to decide
 *   whether to open the TouchPoint share sheet or redirect to the business's website.
 *
 * No persistence — settings live for the session. This pairs with the existing
 * mock-data approach used elsewhere in the app.
 */

export interface BusinessReferralSettings {
  optIn: boolean;
  website?: string;
}

const registry = new Map<string, BusinessReferralSettings>();

/** Seed a couple of demo businesses as opted-out so the website-redirect flow can be tried. */
registry.set('b2', { optIn: false, website: 'https://www.fitzoneperformance.com' });

export function getBusinessReferralSettings(businessId: string): BusinessReferralSettings {
  return registry.get(businessId) ?? { optIn: true };
}

export function setBusinessReferralSettings(
  businessId: string,
  settings: BusinessReferralSettings,
): void {
  registry.set(businessId, settings);
  console.log('[BusinessReferralRegistry] updated', businessId, settings);
}

/** Normalise a possibly-bare website string into a tappable URL. */
export function normaliseWebsiteUrl(url: string | undefined | null): string | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}
