import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { invitationReferralCodes } from '@/mocks/data';
import type { InvitationReferralCode, NewMemberOnboarding, OnboardingEvent, BizComAutoInvite } from '@/types';
import { bizComs } from '@/mocks/data';

const REFERRAL_CODES_KEY = 'invitation_referral_codes';
const CODE_COUNTER_KEY = 'referral_code_counter';
const BIZCOM_AUTO_INVITES_KEY = 'bizcom_auto_invites';

function generateReferralCode(counter: number): string {
  const year = new Date().getFullYear();
  const padded = String(counter).padStart(3, '0');
  return `TP-ARV-${year}-${padded}`;
}

export const [InvitationProvider, useInvitations] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [codes, setCodes] = useState<InvitationReferralCode[]>(invitationReferralCodes);
  const [counter, setCounter] = useState<number>(invitationReferralCodes.length + 1);
  const [onboardings, setOnboardings] = useState<NewMemberOnboarding[]>([]);
  const [bizComAutoInvites, setBizComAutoInvites] = useState<BizComAutoInvite[]>([]);

  const storedAutoInvites = useQuery({
    queryKey: ['bizComAutoInvites'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BIZCOM_AUTO_INVITES_KEY);
      if (stored) return JSON.parse(stored) as BizComAutoInvite[];
      return [] as BizComAutoInvite[];
    },
  });

  useEffect(() => {
    if (storedAutoInvites.data) setBizComAutoInvites(storedAutoInvites.data);
  }, [storedAutoInvites.data]);

  const storedCodes = useQuery({
    queryKey: ['referralCodes'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(REFERRAL_CODES_KEY);
      if (stored) {
        return JSON.parse(stored) as InvitationReferralCode[];
      }
      await AsyncStorage.setItem(REFERRAL_CODES_KEY, JSON.stringify(invitationReferralCodes));
      return invitationReferralCodes;
    },
  });

  const storedCounter = useQuery({
    queryKey: ['referralCounter'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CODE_COUNTER_KEY);
      if (stored) return parseInt(stored, 10);
      const initial = invitationReferralCodes.length + 1;
      await AsyncStorage.setItem(CODE_COUNTER_KEY, String(initial));
      return initial;
    },
  });

  useEffect(() => {
    if (storedCodes.data) setCodes(storedCodes.data);
  }, [storedCodes.data]);

  useEffect(() => {
    if (storedCounter.data !== undefined) setCounter(storedCounter.data);
  }, [storedCounter.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: InvitationReferralCode[]) => {
      await AsyncStorage.setItem(REFERRAL_CODES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralCodes'] });
    },
  });

  const counterMutation = useMutation({
    mutationFn: async (newCounter: number) => {
      await AsyncStorage.setItem(CODE_COUNTER_KEY, String(newCounter));
      return newCounter;
    },
  });

  const autoInviteMutation = useMutation({
    mutationFn: async (updated: BizComAutoInvite[]) => {
      await AsyncStorage.setItem(BIZCOM_AUTO_INVITES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bizComAutoInvites'] });
    },
  });

  const createBizComAutoInvite = useCallback((params: {
    referralCodeId: string;
    referralCode: string;
    bizComId: string;
    bizComName: string;
    bizComAvatar: string;
    inviterId: string;
    inviterName: string;
    inviterAvatar: string;
    contactId: string;
    contactName: string;
    contactPhone: string;
    contactAvatar: string;
    message: string;
  }): BizComAutoInvite => {
    const autoInvite: BizComAutoInvite = {
      id: `bai_${Date.now()}_${params.contactId}`,
      referralCodeId: params.referralCodeId,
      referralCode: params.referralCode,
      bizComId: params.bizComId,
      bizComName: params.bizComName,
      bizComAvatar: params.bizComAvatar,
      inviterId: params.inviterId,
      inviterName: params.inviterName,
      inviterAvatar: params.inviterAvatar,
      contactId: params.contactId,
      contactName: params.contactName,
      contactPhone: params.contactPhone,
      contactAvatar: params.contactAvatar,
      message: params.message,
      status: 'sent',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
    };

    const updated = [autoInvite, ...bizComAutoInvites];
    setBizComAutoInvites(updated);
    autoInviteMutation.mutate(updated);

    console.log('[InvitationContext] Auto BizCom invite created:', autoInvite.id, 'from BizCom:', params.bizComName, 'to:', params.contactName);
    return autoInvite;
  }, [bizComAutoInvites, autoInviteMutation]);

  const createInvitationCode = useCallback((params: {
    inviterId: string;
    inviterName: string;
    inviterAvatar: string;
    contactId: string;
    contactName: string;
    contactPhone: string;
    contactAvatar: string;
    bizComId: string;
    bizComName: string;
    message: string;
  }): InvitationReferralCode => {
    const code = generateReferralCode(counter);
    const newCode: InvitationReferralCode = {
      id: `irc${Date.now()}`,
      code,
      ...params,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const updated = [newCode, ...codes];
    setCodes(updated);
    const nextCounter = counter + 1;
    setCounter(nextCounter);
    saveMutation.mutate(updated);
    counterMutation.mutate(nextCounter);

    if (params.bizComId && params.bizComName) {
      const matchedBizCom = bizComs.find(bc => bc.id === params.bizComId);
      createBizComAutoInvite({
        referralCodeId: newCode.id,
        referralCode: code,
        bizComId: params.bizComId,
        bizComName: params.bizComName,
        bizComAvatar: matchedBizCom?.avatar ?? '',
        inviterId: params.inviterId,
        inviterName: params.inviterName,
        inviterAvatar: params.inviterAvatar,
        contactId: params.contactId,
        contactName: params.contactName,
        contactPhone: params.contactPhone,
        contactAvatar: params.contactAvatar,
        message: `You've been invited by ${params.inviterName} to join "${params.bizComName}" on TouchPoint. This invitation was automatically created when your SMS invite was sent.`,
      });
    }

    console.log('[InvitationContext] Created referral code:', code, 'for contact:', params.contactName);
    return newCode;
  }, [codes, counter, saveMutation, counterMutation, createBizComAutoInvite]);

  const createBulkInvitationCodes = useCallback((params: {
    inviterId: string;
    inviterName: string;
    inviterAvatar: string;
    contacts: Array<{
      contactId: string;
      contactName: string;
      contactPhone: string;
      contactAvatar: string;
    }>;
    bizComId: string;
    bizComName: string;
    message: string;
  }): InvitationReferralCode[] => {
    let currentCounter = counter;
    const newCodes: InvitationReferralCode[] = params.contacts.map((contact) => {
      const code = generateReferralCode(currentCounter);
      currentCounter++;
      return {
        id: `irc${Date.now()}_${contact.contactId}`,
        code,
        inviterId: params.inviterId,
        inviterName: params.inviterName,
        inviterAvatar: params.inviterAvatar,
        ...contact,
        bizComId: params.bizComId,
        bizComName: params.bizComName,
        message: params.message,
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
      };
    });

    const updated = [...newCodes, ...codes];
    setCodes(updated);
    setCounter(currentCounter);
    saveMutation.mutate(updated);
    counterMutation.mutate(currentCounter);

    newCodes.forEach(nc => {
      const matchedBizCom = bizComs.find(bc => bc.id === nc.bizComId);
      createBizComAutoInvite({
        referralCodeId: nc.id,
        referralCode: nc.code,
        bizComId: params.bizComId,
        bizComName: params.bizComName,
        bizComAvatar: matchedBizCom?.avatar ?? '',
        inviterId: params.inviterId,
        inviterName: params.inviterName,
        inviterAvatar: params.inviterAvatar,
        contactId: nc.contactId,
        contactName: nc.contactName,
        contactPhone: nc.contactPhone,
        contactAvatar: nc.contactAvatar,
        message: `You've been invited by ${params.inviterName} to join "${params.bizComName}" on TouchPoint. This invitation was automatically created when your SMS invite was sent.`,
      });
    });

    console.log('[InvitationContext] Created', newCodes.length, 'bulk referral codes with auto BizCom invites');
    return newCodes;
  }, [codes, counter, saveMutation, counterMutation, createBizComAutoInvite]);

  const getCodeByContact = useCallback((contactId: string): InvitationReferralCode | undefined => {
    return codes.find(c => c.contactId === contactId);
  }, [codes]);

  const getCodesByBizCom = useCallback((bizComId: string): InvitationReferralCode[] => {
    return codes.filter(c => c.bizComId === bizComId);
  }, [codes]);

  const getJoinedCodes = useCallback((): InvitationReferralCode[] => {
    return codes.filter(c => c.status === 'joined');
  }, [codes]);

  const simulateJoin = useMutation({
    mutationFn: async (codeId: string) => {
      const updated = codes.map(c => {
        if (c.id === codeId) {
          return {
            ...c,
            status: 'joined' as const,
            joinedUserId: `u_sim_${Date.now()}`,
            joinedUserName: c.contactName,
            joinedUserAvatar: c.contactAvatar,
            joinedAt: new Date().toISOString(),
            pointsAwarded: 50,
          };
        }
        return c;
      });
      setCodes(updated);
      await AsyncStorage.setItem(REFERRAL_CODES_KEY, JSON.stringify(updated));
      console.log('[InvitationContext] Simulated join for code:', codeId);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralCodes'] });
    },
  });

  const simulateFullOnboarding = useCallback((codeId: string): NewMemberOnboarding | null => {
    const referralCode = codes.find(c => c.id === codeId);
    if (!referralCode) {
      console.log('[InvitationContext] Referral code not found:', codeId);
      return null;
    }

    const bizCom = bizComs.find(bc => bc.id === referralCode.bizComId);
    const now = new Date();
    const newMemberId = `u_new_${Date.now()}`;

    const events: OnboardingEvent[] = [
      {
        id: `evt_${Date.now()}_1`,
        type: 'download',
        title: 'App Downloaded',
        description: `${referralCode.contactName} downloaded TouchPoint from the app store`,
        timestamp: new Date(now.getTime()).toISOString(),
        completed: true,
      },
      {
        id: `evt_${Date.now()}_2`,
        type: 'signup',
        title: 'Account Created',
        description: `${referralCode.contactName} created their TouchPoint account`,
        timestamp: new Date(now.getTime() + 60000).toISOString(),
        completed: true,
      },
      {
        id: `evt_${Date.now()}_3`,
        type: 'code_verified',
        title: 'Referral Code Verified',
        description: `Code ${referralCode.code} validated successfully`,
        timestamp: new Date(now.getTime() + 120000).toISOString(),
        completed: true,
      },
      {
        id: `evt_${Date.now()}_4`,
        type: 'referral_mapped',
        title: 'Referral Mapped',
        description: `${referralCode.contactName} linked to inviter ${referralCode.inviterName} via code ${referralCode.code}`,
        timestamp: new Date(now.getTime() + 180000).toISOString(),
        completed: true,
      },
      {
        id: `evt_${Date.now()}_5a`,
        type: 'bizcom_auto_invite_created',
        title: 'BizCom Auto-Invite Created',
        description: `Automatic invitation message created from "${bizCom?.name ?? referralCode.bizComName}" BizCom at SMS send time — queued for delivery upon app download`,
        timestamp: new Date(now.getTime() + 210000).toISOString(),
        completed: true,
      },
      {
        id: `evt_${Date.now()}_5`,
        type: 'bizcom_invite_sent',
        title: 'BizCom Invitation Delivered',
        description: `Auto-invitation from "${bizCom?.name ?? referralCode.bizComName}" delivered to ${referralCode.contactName} inside the app`,
        timestamp: new Date(now.getTime() + 270000).toISOString(),
        completed: true,
      },
      {
        id: `evt_${Date.now()}_6`,
        type: 'bizcom_joined',
        title: 'Joined BizCom',
        description: `${referralCode.contactName} accepted and joined "${bizCom?.name ?? referralCode.bizComName}"`,
        timestamp: new Date(now.getTime() + 330000).toISOString(),
        completed: true,
      },
      {
        id: `evt_${Date.now()}_7`,
        type: 'welcome_points',
        title: 'Welcome Points Awarded',
        description: `25 welcome points awarded to ${referralCode.contactName} · 50 referral points awarded to ${referralCode.inviterName}`,
        timestamp: new Date(now.getTime() + 390000).toISOString(),
        completed: true,
      },
    ];

    const updatedCodes = codes.map(c => {
      if (c.id === codeId) {
        return {
          ...c,
          status: 'joined' as const,
          joinedUserId: newMemberId,
          joinedUserName: c.contactName,
          joinedUserAvatar: c.contactAvatar,
          joinedAt: now.toISOString(),
          pointsAwarded: 50,
        };
      }
      return c;
    });
    setCodes(updatedCodes);
    saveMutation.mutate(updatedCodes);

    const autoInvite: BizComAutoInvite = {
      id: `bai_sim_${Date.now()}`,
      referralCodeId: referralCode.id,
      referralCode: referralCode.code,
      bizComId: referralCode.bizComId,
      bizComName: bizCom?.name ?? referralCode.bizComName,
      bizComAvatar: bizCom?.avatar ?? '',
      inviterId: referralCode.inviterId,
      inviterName: referralCode.inviterName,
      inviterAvatar: referralCode.inviterAvatar,
      contactId: referralCode.contactId,
      contactName: referralCode.contactName,
      contactPhone: referralCode.contactPhone,
      contactAvatar: referralCode.contactAvatar,
      message: `You've been invited by ${referralCode.inviterName} to join "${bizCom?.name ?? referralCode.bizComName}" on TouchPoint. This invitation was automatically created when your SMS invite was sent.`,
      status: 'accepted',
      createdAt: referralCode.createdAt,
      sentAt: new Date(now.getTime() + 270000).toISOString(),
      acceptedAt: new Date(now.getTime() + 330000).toISOString(),
    };

    const updatedAutoInvites = [autoInvite, ...bizComAutoInvites];
    setBizComAutoInvites(updatedAutoInvites);
    autoInviteMutation.mutate(updatedAutoInvites);

    const onboarding: NewMemberOnboarding = {
      id: `onb_${Date.now()}`,
      referralCode: { ...referralCode, status: 'joined', joinedUserId: newMemberId, joinedUserName: referralCode.contactName, joinedUserAvatar: referralCode.contactAvatar, joinedAt: now.toISOString(), pointsAwarded: 50 },
      newMemberId,
      newMemberName: referralCode.contactName,
      newMemberAvatar: referralCode.contactAvatar,
      newMemberPhone: referralCode.contactPhone,
      bizComId: referralCode.bizComId,
      bizComName: bizCom?.name ?? referralCode.bizComName,
      bizComAvatar: bizCom?.avatar ?? '',
      inviterName: referralCode.inviterName,
      inviterAvatar: referralCode.inviterAvatar,
      autoInviteMessage: `Welcome to TouchPoint, ${referralCode.contactName}! You've been invited by ${referralCode.inviterName} to join "${bizCom?.name ?? referralCode.bizComName}". Tap below to join and start exploring!`,
      bizComAutoInvite: autoInvite,
      events,
      status: 'completed',
      startedAt: now.toISOString(),
      completedAt: new Date(now.getTime() + 390000).toISOString(),
    };

    setOnboardings(prev => [onboarding, ...prev]);
    console.log('[InvitationContext] Full onboarding completed for:', referralCode.contactName, 'mapped via code:', referralCode.code, 'auto-invited to BizCom:', bizCom?.name, 'with auto BizCom invite:', autoInvite.id);
    return onboarding;
  }, [codes, saveMutation, bizComAutoInvites, autoInviteMutation]);

  const getPendingOnboardingCodes = useCallback((): InvitationReferralCode[] => {
    return codes.filter(c => c.status !== 'joined');
  }, [codes]);

  const stats = {
    total: codes.length,
    pending: codes.filter(c => c.status === 'pending').length,
    clicked: codes.filter(c => c.status === 'clicked').length,
    registered: codes.filter(c => c.status === 'registered').length,
    joined: codes.filter(c => c.status === 'joined').length,
    totalPointsAwarded: codes.reduce((sum, c) => sum + (c.pointsAwarded ?? 0), 0),
  };

  const getAutoInvitesByContact = useCallback((contactId: string): BizComAutoInvite[] => {
    return bizComAutoInvites.filter(ai => ai.contactId === contactId);
  }, [bizComAutoInvites]);

  const getAutoInvitesByBizCom = useCallback((bizComId: string): BizComAutoInvite[] => {
    return bizComAutoInvites.filter(ai => ai.bizComId === bizComId);
  }, [bizComAutoInvites]);

  return {
    codes,
    stats,
    onboardings,
    bizComAutoInvites,
    isLoading: storedCodes.isLoading,
    createInvitationCode,
    createBulkInvitationCodes,
    createBizComAutoInvite,
    getCodeByContact,
    getCodesByBizCom,
    getJoinedCodes,
    getPendingOnboardingCodes,
    getAutoInvitesByContact,
    getAutoInvitesByBizCom,
    simulateJoin: simulateJoin.mutate,
    isSimulating: simulateJoin.isPending,
    simulateFullOnboarding,
  };
});
