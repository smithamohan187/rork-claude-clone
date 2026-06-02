/**
 * In-memory registry of per-business "business type" plus referral opt-out settings.
 *
 * - business_type: 'goodwill' | 'points_based' — controls whether the business
 *   has a points/rewards program. Goodwill businesses skip points/tiers/catalog.
 * - referral_opted_out: boolean — when true, the business opts OUT of the
 *   TouchPoint referral program and uses their own in-house URL instead.
 * - inhouse_referral_url: string — required when referral_opted_out is true.
 *
 * No persistence — settings live for the session, matching the existing
 * mock-data approach used elsewhere in the app.
 */

export type BusinessType = 'goodwill' | 'points_based';

export interface BusinessTypeSettings {
  businessType: BusinessType;
  referralOptedOut: boolean;
  inhouseReferralUrl?: string;
}

const registry = new Map<string, BusinessTypeSettings>();

/** Seed: default the active business as Goodwill so the switch flow is demoable. */
registry.set('self', {
  businessType: 'goodwill',
  referralOptedOut: false,
});

export function getBusinessTypeSettings(businessId: string): BusinessTypeSettings {
  return registry.get(businessId) ?? {
    businessType: 'points_based',
    referralOptedOut: false,
  };
}

export function setBusinessTypeSettings(
  businessId: string,
  settings: BusinessTypeSettings,
): void {
  registry.set(businessId, settings);
  console.log('[BusinessTypeRegistry] updated', businessId, settings);
}

export function isValidInhouseReferralUrl(raw: string | undefined | null): boolean {
  const v = (raw ?? '').trim();
  if (!v) return false;
  return /^https?:\/\/\S+\.\S+/i.test(v);
}
