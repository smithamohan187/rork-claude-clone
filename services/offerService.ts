import apiClient, { ApiResult } from './apiClient';

export type OfferRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  offer_type: string | null;
  discount_percent: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  view_count: number | null;
  terms_conditions?: string | null;
};

export type BusinessRow = {
  id: string;
  business_name: string;
  logo_url: string | null;
  category: string | null;
  city: string | null;
};

export type RewardConfigRow = { sharing_points: number | null };

export async function getOfferById(id: string): Promise<ApiResult<OfferRow>> {
  return apiClient.get<OfferRow>('offers', { id }, { maybeSingle: true });
}

export async function getBusinessById(
  id: string,
): Promise<ApiResult<BusinessRow>> {
  return apiClient.get<BusinessRow>(
    'businesses',
    { id },
    {
      columns: 'id, business_name, logo_url, category, city',
      maybeSingle: true,
    },
  );
}

export async function getRewardConfig(
  businessId: string,
): Promise<ApiResult<RewardConfigRow>> {
  return apiClient.get<RewardConfigRow>(
    'reward_config',
    { business_id: businessId },
    { columns: 'sharing_points', maybeSingle: true },
  );
}

export async function incrementOfferView(
  offerId: string,
): Promise<ApiResult<null>> {
  return apiClient.rpc<null>('increment_offer_view', { offer_id: offerId });
}

export async function incrementOfferShare(
  offerId: string,
): Promise<ApiResult<null>> {
  return apiClient.rpc<null>('increment_offer_share', { offer_id: offerId });
}
