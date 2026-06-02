import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import type { BusinessInvitation } from '@/types';

const BUSINESS_INVITATIONS_KEY = 'business_invitations';
const BUSINESS_INVITE_COUNTER_KEY = 'business_invite_counter';

function generateInviteLinkCode(counter: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TP-BIZ-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += `-${String(counter).padStart(3, '0')}`;
  return code;
}

export const [BusinessInvitationProvider, useBusinessInvitations] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [invitations, setInvitations] = useState<BusinessInvitation[]>([]);
  const [counter, setCounter] = useState<number>(1);

  const storedInvitations = useQuery({
    queryKey: ['businessInvitations'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BUSINESS_INVITATIONS_KEY);
      if (stored) return JSON.parse(stored) as BusinessInvitation[];
      return [] as BusinessInvitation[];
    },
  });

  const storedCounter = useQuery({
    queryKey: ['businessInviteCounter'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BUSINESS_INVITE_COUNTER_KEY);
      if (stored) return parseInt(stored, 10);
      return 1;
    },
  });

  useEffect(() => {
    if (storedInvitations.data) setInvitations(storedInvitations.data);
  }, [storedInvitations.data]);

  useEffect(() => {
    if (storedCounter.data !== undefined) setCounter(storedCounter.data);
  }, [storedCounter.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: BusinessInvitation[]) => {
      await AsyncStorage.setItem(BUSINESS_INVITATIONS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['businessInvitations'] });
    },
  });

  const counterMutation = useMutation({
    mutationFn: async (newCounter: number) => {
      await AsyncStorage.setItem(BUSINESS_INVITE_COUNTER_KEY, String(newCounter));
      return newCounter;
    },
  });

  const createBusinessInvitation = useCallback((params: {
    inviterId: string;
    inviterName: string;
    inviterAvatar: string;
    businessName: string;
    businessEmail: string;
    businessPhone: string;
    contactName: string;
    method: BusinessInvitation['method'];
    message: string;
  }): BusinessInvitation => {
    const linkCode = generateInviteLinkCode(counter);
    const invitation: BusinessInvitation = {
      id: `binv_${Date.now()}`,
      inviteLinkCode: linkCode,
      inviterId: params.inviterId,
      inviterName: params.inviterName,
      inviterAvatar: params.inviterAvatar,
      businessName: params.businessName,
      businessEmail: params.businessEmail,
      businessPhone: params.businessPhone,
      contactName: params.contactName,
      method: params.method,
      message: params.message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = [invitation, ...invitations];
    setInvitations(updated);
    const nextCounter = counter + 1;
    setCounter(nextCounter);
    saveMutation.mutate(updated);
    counterMutation.mutate(nextCounter);

    console.log('[BusinessInvitation] Created invitation:', linkCode, 'for business:', params.businessName, 'via:', params.method);
    return invitation;
  }, [invitations, counter, saveMutation, counterMutation]);

  const simulateBusinessJoin = useMutation({
    mutationFn: async (invitationId: string) => {
      const updated = invitations.map(inv => {
        if (inv.id === invitationId) {
          return {
            ...inv,
            status: 'linked' as const,
            linkedBusinessId: `biz_${Date.now()}`,
            linkedBusinessName: inv.businessName,
            linkedAt: new Date().toISOString(),
            pointsAwarded: 100,
          };
        }
        return inv;
      });
      setInvitations(updated);
      await AsyncStorage.setItem(BUSINESS_INVITATIONS_KEY, JSON.stringify(updated));
      console.log('[BusinessInvitation] Simulated business join for invitation:', invitationId);
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['businessInvitations'] });
    },
  });

  const getInvitationByCode = useCallback((code: string): BusinessInvitation | undefined => {
    return invitations.find(inv => inv.inviteLinkCode === code);
  }, [invitations]);

  const getInvitationsByInviter = useCallback((inviterId: string): BusinessInvitation[] => {
    return invitations.filter(inv => inv.inviterId === inviterId);
  }, [invitations]);

  const stats = useMemo(() => ({
    total: invitations.length,
    pending: invitations.filter(inv => inv.status === 'pending').length,
    clicked: invitations.filter(inv => inv.status === 'clicked').length,
    registered: invitations.filter(inv => inv.status === 'registered').length,
    linked: invitations.filter(inv => inv.status === 'linked').length,
    totalPointsAwarded: invitations.reduce((sum, inv) => sum + (inv.pointsAwarded ?? 0), 0),
  }), [invitations]);

  return useMemo(() => ({
    invitations,
    stats,
    isLoading: storedInvitations.isLoading,
    createBusinessInvitation,
    getInvitationByCode,
    getInvitationsByInviter,
    simulateBusinessJoin: simulateBusinessJoin.mutate,
    isSimulating: simulateBusinessJoin.isPending,
  }), [invitations, stats, storedInvitations.isLoading, createBusinessInvitation, getInvitationByCode, getInvitationsByInviter, simulateBusinessJoin.mutate, simulateBusinessJoin.isPending]);
});
