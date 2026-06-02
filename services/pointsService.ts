import apiClient, { ApiResult } from './apiClient';

export type UserPointsRow = { total_points: number | null };

export async function getUserPoints(
  profileId: string,
  businessId: string,
): Promise<ApiResult<UserPointsRow>> {
  return apiClient.get<UserPointsRow>(
    'user_points',
    { profile_id: profileId, business_id: businessId },
    { columns: 'total_points', maybeSingle: true },
  );
}

export async function updateUserPoints(
  profileId: string,
  businessId: string,
  body: { total_points: number; last_activity_at: string },
): Promise<ApiResult<null>> {
  return apiClient.put(
    'user_points',
    { profile_id: profileId, business_id: businessId },
    body,
  );
}

export async function addPointsTransaction(body: {
  profile_id: string;
  business_id: string;
  transaction_type: string;
  points: number;
  balance_after: number;
  reference_id: string;
  reference_type: string;
  note: string;
}): Promise<ApiResult<null>> {
  return apiClient.post('points_transactions', body);
}
