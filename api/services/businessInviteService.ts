import { apiClient } from '@/api/client';

export type InviteContactMethod = 'sms' | 'email' | 'whatsapp' | 'link';
export type InviteStatus = 'pending' | 'sent' | 'converted' | 'expired';

export interface BusinessInvite {
  id: string;
  inviter_profile_id: string;
  business_name: string;
  contact_name: string | null;
  contact_method: InviteContactMethod;
  contact_value: string | null;
  status: InviteStatus;
  is_lead: boolean;
  invite_code: string;
  created_at: string;
  converted_at: string | null;
  converted_business_id: string | null;
}

export interface CreateInvitePayload {
  business_name: string;
  contact_name?: string;
  contact_method: InviteContactMethod;
  contact_value?: string;
}

export async function createBusinessInvite(payload: CreateInvitePayload): Promise<BusinessInvite | null> {
  const res = await apiClient.post('/marketplace/invite-business', payload);
  return res.data.data?.invite ?? null;
}

export async function getBusinessInvites(): Promise<BusinessInvite[]> {
  const res = await apiClient.get('/marketplace/invite-business');
  return res.data.data?.invites ?? [];
}
