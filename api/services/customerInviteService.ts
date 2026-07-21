// Service layer — wraps apiClient calls for the customer-invites endpoints.
// Screens never call apiClient directly; they go through hooks, which call these functions.
import { apiClient } from '@/api/client';

export type CustomerInviteChannel = 'contact' | 'email' | 'manual' | 'csv';
export type CustomerInviteStatus = 'sent' | 'registered' | 'subscribed';

export interface CustomerInvite {
  id: string;
  inviter_profile_id: string;
  business_id: string;
  channel: CustomerInviteChannel;
  invitee_identifier: string;
  invitee_email: string | null;
  invitee_name: string | null;
  referral_code: string;
  status: CustomerInviteStatus;
  created_at: string;
  registered_at: string | null;
  subscribed_at: string | null;
}

export interface CreateInvitePayload {
  business_id: string;
  channel: CustomerInviteChannel;
  name?: string;
  email?: string;
  phone?: string;
}

export interface CreateInviteResult {
  invite: (CustomerInvite & { url: string }) | null;
  duplicate?: boolean;
}

export interface BulkInviteRow {
  name?: string;
  email?: string;
  phone?: string;
}

export type BulkInviteRowStatus = 'inserted' | 'skipped-duplicate' | 'already-invited' | 'invalid';

export interface BulkInviteResultRow extends BulkInviteRow {
  status: BulkInviteRowStatus;
  reason?: string;
  referral_code?: string;
  url?: string;
}

export interface BulkCreateInviteResult {
  results: BulkInviteResultRow[];
  inserted: number;
}

export const createCustomerInvite = async (payload: CreateInvitePayload): Promise<CreateInviteResult> => {
  const result = await apiClient.post<CreateInviteResult>('/invites/customer', payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to send invite');
  return result.data!;
};

export const bulkCreateCustomerInvites = async (payload: {
  business_id: string;
  rows: BulkInviteRow[];
}): Promise<BulkCreateInviteResult> => {
  const result = await apiClient.post<BulkCreateInviteResult>('/invites/customer/bulk', payload);
  if (!result.success) throw new Error(result.error ?? 'Failed to send bulk invites');
  return result.data!;
};

export const getMyCustomerInvites = async (): Promise<CustomerInvite[]> => {
  const result = await apiClient.get<{ invites: CustomerInvite[] }>('/invites/customer/mine');
  if (!result.success) throw new Error(result.error ?? 'Failed to load invites');
  return result.data!.invites;
};

export const getBusinessCustomerInvites = async (businessId: string): Promise<CustomerInvite[]> => {
  const result = await apiClient.get<{ invites: CustomerInvite[] }>(`/invites/customer/business/${businessId}`);
  if (!result.success) throw new Error(result.error ?? 'Failed to load invites');
  return result.data!.invites;
};
