import { useState, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import type { ReferralRequest, ReferralRequestType, ReferralStatus, ReferredParty, BizComFollower } from '@/types';
import { testUsers, currentBusinessUser, personalUsers, rewardRules } from '@/mocks/data';

function generateUniqueId(): string {
  return 'REF-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export interface BusinessJoinRequest {
  id: string;
  referralRequestId: string;
  parentReferralId: string;
  referredPartyId: string;
  referredPartyName: string;
  referredPartyAvatar: string;
  referrerId: string;
  referrerName: string;
  referrerAvatar: string;
  businessId: string;
  businessName: string;
  businessAvatar: string;
  referrerPoints: number;
  referredPoints: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

const referralPoints = rewardRules.find(r => r.action === 'Refer a friend')?.points ?? 50;
const welcomePoints = rewardRules.find(r => r.action === 'Welcome')?.points ?? 25;

const SEED_REFERRAL_REQUESTS: ReferralRequest[] = [
  {
    id: 'seed-generic-maya',
    uniqueId: 'REF-SEED-GENERIC-MAYA',
    type: 'generic',
    businessId: currentBusinessUser.id,
    businessName: currentBusinessUser.name,
    businessAvatar: currentBusinessUser.avatar,
    referrerId: personalUsers[0].id,
    referrerName: personalUsers[0].name,
    referrerAvatar: personalUsers[0].avatar,
    referrerPhone: '',
    referredParties: [],
    personalMessage: 'Hi Maya! We\'d love your help spreading the word about Rivera Coffee Co. Share with your friends and earn rewards!',
    referrerPoints: referralPoints,
    referredPoints: welcomePoints,
    status: 'sent',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'seed-goodwill-maya',
    uniqueId: 'REF-SEED-GOODWILL-MAYA',
    type: 'goodwill',
    businessId: currentBusinessUser.id,
    businessName: currentBusinessUser.name,
    businessAvatar: currentBusinessUser.avatar,
    referrerId: personalUsers[0].id,
    referrerName: personalUsers[0].name,
    referrerAvatar: personalUsers[0].avatar,
    referrerPhone: '',
    referredParties: [],
    personalMessage: 'Hi Maya! We\'d love your help spreading some goodwill for Rivera Coffee Co. Share with your friends!',
    referrerPoints: 0,
    referredPoints: 0,
    status: 'sent',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

export const [ReferralProvider, useReferrals] = createContextHook(() => {
  const [referralRequests, setReferralRequests] = useState<ReferralRequest[]>(SEED_REFERRAL_REQUESTS);
  const [businessJoinRequests, setBusinessJoinRequests] = useState<BusinessJoinRequest[]>([]);
  const [bizComNewMembers, setBizComNewMembers] = useState<BizComFollower[]>([]);

  const referralRequestsRef = useRef<ReferralRequest[]>(referralRequests);
  referralRequestsRef.current = referralRequests;
  const [referralNotifications, setReferralNotifications] = useState<{
    id: string;
    targetUserId: string;
    type: 'referral_accepted' | 'referral_declined' | 'business_confirmed' | 'business_declined';
    title: string;
    message: string;
    businessName: string;
    businessAvatar: string;
    referrerName?: string;
    referredPartyName?: string;
    points?: number;
    createdAt: string;
    read: boolean;
  }[]>([]);

  const createReferralRequest = useCallback((
    type: ReferralRequestType,
    businessId: string,
    businessName: string,
    businessAvatar: string,
    referrerIds: { id: string; name: string; avatar: string; phone: string }[],
    personalMessage: string,
    referrerPoints: number,
    referredPoints: number,
    customReferralImage?: string,
    customNewMemberImage?: string,
  ): ReferralRequest[] => {
    const newRequests: ReferralRequest[] = referrerIds.map(referrer => {
      const req: ReferralRequest = {
        id: `rr-${Date.now()}-${referrer.id}`,
        uniqueId: generateUniqueId(),
        type,
        businessId,
        businessName,
        businessAvatar,
        referrerId: referrer.id,
        referrerName: referrer.name,
        referrerAvatar: referrer.avatar,
        referrerPhone: referrer.phone,
        referredParties: [],
        personalMessage,
        referrerPoints: type === 'goodwill' ? 0 : referrerPoints,
        referredPoints: type === 'goodwill' ? 0 : referredPoints,
        customReferralImage: type === 'custom' ? customReferralImage : undefined,
        customNewMemberImage: type === 'custom' ? customNewMemberImage : undefined,
        status: 'sent',
        createdAt: new Date().toISOString(),
      };
      return req;
    });

    setReferralRequests(prev => [...prev, ...newRequests]);
    console.log(`[REFERRAL] Created ${newRequests.length} ${type} referral requests for business ${businessName}`);
    return newRequests;
  }, []);

  const updateReferralStatus = useCallback((requestId: string, status: ReferralStatus) => {
    setReferralRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status } : r
    ));
    console.log(`[REFERRAL] Updated request ${requestId} to status: ${status}`);
  }, []);

  const addReferredParties = useCallback((requestId: string, parties: ReferredParty[]) => {
    setReferralRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, referredParties: parties, status: 'forwarded' as ReferralStatus } : r
    ));
    console.log(`[REFERRAL] Added ${parties.length} referred parties to request ${requestId}`);
  }, []);

  const createForwardedReferrals = useCallback((
    originalRequest: ReferralRequest,
    forwardedByName: string,
    forwardedByAvatar: string,
    appContacts: { id: string; name: string; avatar: string; phone?: string }[],
  ): ReferralRequest[] => {
    const forwarderId = originalRequest.referrerId;
    const newRequests: ReferralRequest[] = appContacts.map(contact => {
      const req: ReferralRequest = {
        id: `rr-fwd-${Date.now()}-${contact.id}`,
        uniqueId: generateUniqueId(),
        type: originalRequest.type,
        businessId: originalRequest.businessId,
        businessName: originalRequest.businessName,
        businessAvatar: originalRequest.businessAvatar,
        referrerId: contact.id,
        referrerName: contact.name,
        referrerAvatar: contact.avatar,
        referrerPhone: contact.phone ?? '',
        referredParties: [],
        personalMessage: `${forwardedByName} has forwarded a referral request from ${originalRequest.businessName} to you! ${originalRequest.personalMessage}`,
        referrerPoints: originalRequest.referredPoints,
        referredPoints: originalRequest.referredPoints,
        customReferralImage: originalRequest.customReferralImage,
        customNewMemberImage: originalRequest.customNewMemberImage,
        status: 'sent',
        createdAt: new Date().toISOString(),
        forwardedById: forwarderId,
        forwardedByName: forwardedByName,
        parentReferralId: originalRequest.id,
      };
      return req;
    });

    setReferralRequests(prev => [...prev, ...newRequests]);
    console.log(`[REFERRAL] Created ${newRequests.length} forwarded referral requests from ${forwardedByName} for business ${originalRequest.businessName}`);
    return newRequests;
  }, []);

  const acceptAsReferredParty = useCallback((referralRequestId: string) => {
    const currentRequests = referralRequestsRef.current;
    const req = currentRequests.find(r => r.id === referralRequestId);
    if (!req) {
      console.log('[REFERRAL] Could not find referral request ' + referralRequestId + '. Available IDs: ' + currentRequests.map(r => r.id).join(', '));
      return;
    }

    console.log('[REFERRAL] ' + req.referrerName + ' accepting referral ' + referralRequestId + '. forwardedById=' + req.forwardedById + ', parentReferralId=' + req.parentReferralId + ', businessId=' + req.businessId);

    setReferralRequests(prev => prev.map(r => {
      if (r.id === referralRequestId) return { ...r, status: 'accepted_by_referred' as ReferralStatus };
      if (req.parentReferralId && r.id === req.parentReferralId) return { ...r, status: 'accepted_by_referred' as ReferralStatus };
      return r;
    }));

    const hasForwarder = !!(req.forwardedById && req.parentReferralId);
    console.log('[REFERRAL] hasForwarder=' + hasForwarder + ', forwardedById=' + req.forwardedById + ', parentReferralId=' + req.parentReferralId);

    const now = Date.now();
    const parentReq = currentRequests.find(r => r.id === req.parentReferralId);

    const joinReq: BusinessJoinRequest = {
      id: 'bjr-' + now + '-' + req.referrerId,
      referralRequestId: req.id,
      parentReferralId: req.parentReferralId ?? req.id,
      referredPartyId: req.referrerId,
      referredPartyName: req.referrerName,
      referredPartyAvatar: req.referrerAvatar,
      referrerId: req.forwardedById ?? req.referrerId,
      referrerName: req.forwardedByName ?? req.referrerName,
      referrerAvatar: parentReq?.referrerAvatar ?? req.businessAvatar,
      businessId: req.businessId,
      businessName: req.businessName,
      businessAvatar: req.businessAvatar,
      referrerPoints: parentReq?.referrerPoints ?? req.referrerPoints,
      referredPoints: req.referredPoints,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    console.log('[REFERRAL] Adding business join request: id=' + joinReq.id + ', businessId=' + joinReq.businessId + ', referredParty=' + joinReq.referredPartyName + ', referrer=' + joinReq.referrerName);
    setBusinessJoinRequests(prev => {
      const updated = [...prev, joinReq];
      console.log('[REFERRAL] businessJoinRequests count after add: ' + updated.length);
      return updated;
    });

    if (hasForwarder) {
      setReferralNotifications(n => [...n, {
        id: 'notif-accepted-' + now,
        targetUserId: req.forwardedById!,
        type: 'referral_accepted' as const,
        title: 'Referral Accepted',
        message: req.referrerName + ' has accepted your referral request for ' + req.businessName + '!',
        businessName: req.businessName,
        businessAvatar: req.businessAvatar,
        referredPartyName: req.referrerName,
        createdAt: new Date().toISOString(),
        read: false,
      }]);
    }
  }, []);

  const declineAsReferredParty = useCallback((referralRequestId: string) => {
    const req = referralRequestsRef.current.find(r => r.id === referralRequestId);

    setReferralRequests(prev => prev.map(r =>
      r.id === referralRequestId ? { ...r, status: 'declined_by_referred' as ReferralStatus } : r
    ));

    if (req && req.forwardedById) {
      setReferralNotifications(n => [...n, {
        id: `notif-declined-${Date.now()}`,
        targetUserId: req.forwardedById!,
        type: 'referral_declined',
        title: 'Referral Declined',
        message: `${req.referrerName} has declined your referral request for ${req.businessName}.`,
        businessName: req.businessName,
        businessAvatar: req.businessAvatar,
        referredPartyName: req.referrerName,
        createdAt: new Date().toISOString(),
        read: false,
      }]);
    }
    console.log(`[REFERRAL] Referred party declined referral ${referralRequestId}`);
  }, []);

  const businessJoinRequestsRef = useRef<BusinessJoinRequest[]>(businessJoinRequests);
  businessJoinRequestsRef.current = businessJoinRequests;

  const businessAcceptJoinRequest = useCallback((joinRequestId: string) => {
    const req = businessJoinRequestsRef.current.find(r => r.id === joinRequestId);
    if (!req) {
      console.log('[REFERRAL] Could not find join request ' + joinRequestId + '. Available: ' + businessJoinRequestsRef.current.map(r => r.id).join(', '));
      return;
    }

    console.log('[REFERRAL] Business accepted join request from ' + req.referredPartyName + '. Notifying referrer ' + req.referrerName + ' (' + req.referrerId + ') and referred party ' + req.referredPartyName + ' (' + req.referredPartyId + ')');

    setBusinessJoinRequests(prev => prev.map(r => r.id === joinRequestId ? { ...r, status: 'accepted' as const } : r));

    const now = Date.now();
    setReferralNotifications(n => [
      ...n,
      {
        id: 'notif-biz-confirmed-referrer-' + now,
        targetUserId: req.referrerId,
        type: 'business_confirmed' as const,
        title: 'Business Confirmed',
        message: 'Thank you for your referral and for supporting our business! You earned ' + req.referrerPoints + ' points.',
        businessName: req.businessName,
        businessAvatar: req.businessAvatar,
        referrerName: req.referrerName,
        referredPartyName: req.referredPartyName,
        points: req.referrerPoints,
        createdAt: new Date().toISOString(),
        read: false,
      },
      {
        id: 'notif-biz-confirmed-referred-' + (now + 1),
        targetUserId: req.referredPartyId,
        type: 'business_confirmed' as const,
        title: 'Welcome to the BizCom!',
        message: 'Thank you for joining ' + req.businessName + "'s BizCom! You earned " + req.referredPoints + ' points.',
        businessName: req.businessName,
        businessAvatar: req.businessAvatar,
        referrerName: req.referrerName,
        referredPartyName: req.referredPartyName,
        points: req.referredPoints,
        createdAt: new Date().toISOString(),
        read: false,
      },
    ]);

    setReferralRequests(rr => rr.map(r => {
      if (r.id === req.referralRequestId) {
        return { ...r, status: 'confirmed_by_business' as ReferralStatus };
      }
      if (r.id === req.parentReferralId) {
        return { ...r, status: 'confirmed_by_business' as ReferralStatus };
      }
      return r;
    }));

    const newMember: BizComFollower = {
      id: req.referredPartyId,
      name: req.referredPartyName,
      avatar: req.referredPartyAvatar,
      joinedAt: new Date().toISOString(),
    };
    setBizComNewMembers(prev => {
      if (prev.some(m => m.id === newMember.id)) return prev;
      console.log('[REFERRAL] Auto-added ' + newMember.name + ' to BizCom members');
      return [...prev, newMember];
    });
  }, []);

  const businessDeclineJoinRequest = useCallback((joinRequestId: string) => {
    const req = businessJoinRequestsRef.current.find(r => r.id === joinRequestId);
    if (!req) {
      console.log('[REFERRAL] Could not find join request ' + joinRequestId);
      return;
    }

    console.log('[REFERRAL] Business declined join request from ' + req.referredPartyName + '. Notifying referrer ' + req.referrerName + ' (' + req.referrerId + ') and referred party ' + req.referredPartyName + ' (' + req.referredPartyId + ')');

    setBusinessJoinRequests(prev => prev.map(r => r.id === joinRequestId ? { ...r, status: 'declined' as const } : r));

    const now = Date.now();
    setReferralNotifications(n => [
      ...n,
      {
        id: 'notif-biz-declined-referrer-' + now,
        targetUserId: req.referrerId,
        type: 'business_declined' as const,
        title: 'Referral Update',
        message: req.businessName + ' has declined the referral request for ' + req.referredPartyName + '.',
        businessName: req.businessName,
        businessAvatar: req.businessAvatar,
        referrerName: req.referrerName,
        referredPartyName: req.referredPartyName,
        createdAt: new Date().toISOString(),
        read: false,
      },
      {
        id: 'notif-biz-declined-referred-' + (now + 1),
        targetUserId: req.referredPartyId,
        type: 'business_declined' as const,
        title: 'Request Declined',
        message: req.businessName + ' has declined your request to join their BizCom.',
        businessName: req.businessName,
        businessAvatar: req.businessAvatar,
        referrerName: req.referrerName,
        referredPartyName: req.referredPartyName,
        createdAt: new Date().toISOString(),
        read: false,
      },
    ]);

    setReferralRequests(rr => rr.map(r => {
      if (r.id === req.referralRequestId) {
        return { ...r, status: 'declined_by_business' as ReferralStatus };
      }
      return r;
    }));
  }, []);

  const markNotificationRead = useCallback((notifId: string) => {
    setReferralNotifications(prev => prev.map(n =>
      n.id === notifId ? { ...n, read: true } : n
    ));
  }, []);

  const updateReferredPartyStatus = useCallback((requestId: string, partyId: string, status: ReferralStatus) => {
    setReferralRequests(prev => prev.map(r => {
      if (r.id !== requestId) return r;
      return {
        ...r,
        referredParties: r.referredParties.map(p =>
          p.id === partyId ? { ...p, status } : p
        ),
      };
    }));
    console.log(`[REFERRAL] Updated referred party ${partyId} in request ${requestId} to status: ${status}`);
  }, []);

  const getRequestsByBusiness = useCallback((businessId: string) => {
    return referralRequests.filter(r => r.businessId === businessId);
  }, [referralRequests]);

  const getRequestsByReferrer = useCallback((referrerId: string) => {
    return referralRequests.filter(r => r.referrerId === referrerId);
  }, [referralRequests]);

  const isForwardedReferral = useCallback((requestId: string): boolean => {
    const req = referralRequestsRef.current.find(r => r.id === requestId);
    return !!req?.forwardedById;
  }, []);

  return {
    referralRequests,
    businessJoinRequests,
    referralNotifications,
    bizComNewMembers,
    createReferralRequest,
    createForwardedReferrals,
    updateReferralStatus,
    addReferredParties,
    updateReferredPartyStatus,
    getRequestsByBusiness,
    getRequestsByReferrer,
    isForwardedReferral,
    acceptAsReferredParty,
    declineAsReferredParty,
    businessAcceptJoinRequest,
    businessDeclineJoinRequest,
    markNotificationRead,
  };
});
