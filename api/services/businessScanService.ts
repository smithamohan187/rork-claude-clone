import { apiClient } from '@/api/client';

export interface BusinessScanCode {
  businessId: string;
  url: string;
}

/**
 * Owner-only: fetch the QR deep-link URL for a business.
 * Backend enforces ownership and returns 403 for non-owners.
 */
export async function fetchBusinessScanCode(businessId: string): Promise<BusinessScanCode> {
  const result = await apiClient.get<BusinessScanCode>(`/businesses/${businessId}/scan-code`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load scan code');
  return result.data!;
}
