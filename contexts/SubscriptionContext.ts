import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import type { ActiveSubscription, ActiveBizComSubscription, BillingCycle, SubscriptionTier } from '@/types';
import { SUBSCRIPTION_PLANS } from '@/mocks/subscriptions';
import { BIZCOM_MEMBER_TIERS } from '@/mocks/bizcom-subscriptions';

const SUBSCRIPTION_KEY = 'active_subscription';
const BIZCOM_SUBSCRIPTION_KEY = 'bizcom_subscription';

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [bizComSubscription, setBizComSubscription] = useState<ActiveBizComSubscription | null>(null);

  const storedSubscription = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (stored) {
        return JSON.parse(stored) as ActiveSubscription;
      }
      const now = new Date();
      const nextBilling = new Date(now);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      const defaultSub: ActiveSubscription = {
        planId: 'plan_professional',
        tier: 'professional',
        billingCycle: 'monthly',
        startDate: now.toISOString(),
        nextBillingDate: nextBilling.toISOString(),
        status: 'active',
      };
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(defaultSub));
      console.log('[Subscription] Auto-seeded Alex Rivera with Professional plan');
      return defaultSub;
    },
  });

  const storedBizComSubscription = useQuery({
    queryKey: ['bizcom_subscription'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BIZCOM_SUBSCRIPTION_KEY);
      if (stored) {
        return JSON.parse(stored) as ActiveBizComSubscription;
      }
      const tier = BIZCOM_MEMBER_TIERS[0];
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setMonth(trialEnd.getMonth() + 3);
      const nextBilling = new Date(trialEnd);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      const defaultBizComSub: ActiveBizComSubscription = {
        tierId: tier.id,
        tierLabel: tier.label,
        monthlyPrice: tier.monthlyPrice,
        currency: tier.currency,
        currentMemberCount: 0,
        startDate: now.toISOString(),
        nextBillingDate: nextBilling.toISOString(),
        status: 'active',
        paymentLast4: '4242',
        paymentBrand: 'Visa',
      };
      await AsyncStorage.setItem(BIZCOM_SUBSCRIPTION_KEY, JSON.stringify(defaultBizComSub));
      console.log('[Subscription] Auto-seeded Alex Rivera with £30/month BizCom tier');
      return defaultBizComSub;
    },
  });

  useEffect(() => {
    if (storedSubscription.data !== undefined) {
      setSubscription(storedSubscription.data);
    }
  }, [storedSubscription.data]);

  useEffect(() => {
    if (storedBizComSubscription.data !== undefined) {
      setBizComSubscription(storedBizComSubscription.data);
    }
  }, [storedBizComSubscription.data]);

  const subscribeMutation = useMutation({
    mutationFn: async ({ tier, billingCycle }: { tier: SubscriptionTier; billingCycle: BillingCycle }) => {
      const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
      if (!plan) throw new Error('Plan not found');

      const now = new Date();
      const nextBilling = new Date(now);
      if (billingCycle === 'monthly') {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      } else {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      }

      const newSub: ActiveSubscription = {
        planId: plan.id,
        tier,
        billingCycle,
        startDate: now.toISOString(),
        nextBillingDate: nextBilling.toISOString(),
        status: 'active',
      };

      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(newSub));
      return newSub;
    },
    onSuccess: (data) => {
      setSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
      console.log('[Subscription] Subscribed to:', data.tier, data.billingCycle);
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async ({ tier, billingCycle }: { tier: SubscriptionTier; billingCycle: BillingCycle }) => {
      if (!subscription) throw new Error('No active subscription');

      const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
      if (!plan) throw new Error('Plan not found');

      const updated: ActiveSubscription = {
        ...subscription,
        planId: plan.id,
        tier,
        billingCycle,
      };

      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
      console.log('[Subscription] Plan changed to:', data.tier);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error('No active subscription');

      const updated: ActiveSubscription = {
        ...subscription,
        status: 'cancelled',
      };

      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
      console.log('[Subscription] Subscription cancelled');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error('No subscription to reactivate');

      const updated: ActiveSubscription = {
        ...subscription,
        status: 'active',
      };

      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
      console.log('[Subscription] Subscription reactivated');
    },
  });

  const bizComSubscribeMutation = useMutation({
    mutationFn: async ({ tierId, paymentLast4, paymentBrand }: { tierId: string; paymentLast4?: string; paymentBrand?: string }) => {
      const tier = BIZCOM_MEMBER_TIERS.find(t => t.id === tierId);
      if (!tier) throw new Error('BizCom tier not found');

      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setMonth(trialEnd.getMonth() + 3);
      const nextBilling = new Date(trialEnd);
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      const newSub: ActiveBizComSubscription = {
        tierId: tier.id,
        tierLabel: tier.label,
        monthlyPrice: tier.monthlyPrice,
        currency: tier.currency,
        currentMemberCount: 0,
        startDate: now.toISOString(),
        nextBillingDate: nextBilling.toISOString(),
        status: 'trialing',
        trialEndsAt: trialEnd.toISOString(),
        paymentLast4,
        paymentBrand,
      };

      await AsyncStorage.setItem(BIZCOM_SUBSCRIPTION_KEY, JSON.stringify(newSub));
      return newSub;
    },
    onSuccess: (data) => {
      setBizComSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['bizcom_subscription'] });
      console.log('[Subscription] BizCom subscribed to tier:', data.tierId);
    },
  });

  const bizComChangeTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      if (!bizComSubscription) throw new Error('No BizCom subscription');
      const tier = BIZCOM_MEMBER_TIERS.find(t => t.id === tierId);
      if (!tier) throw new Error('BizCom tier not found');

      const updated: ActiveBizComSubscription = {
        ...bizComSubscription,
        tierId: tier.id,
        tierLabel: tier.label,
        monthlyPrice: tier.monthlyPrice,
        currency: tier.currency,
      };

      await AsyncStorage.setItem(BIZCOM_SUBSCRIPTION_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setBizComSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['bizcom_subscription'] });
      console.log('[Subscription] BizCom tier changed to:', data.tierId);
    },
  });

  const bizComCancelMutation = useMutation({
    mutationFn: async () => {
      if (!bizComSubscription) throw new Error('No BizCom subscription');
      const updated: ActiveBizComSubscription = {
        ...bizComSubscription,
        status: 'cancelled',
      };
      await AsyncStorage.setItem(BIZCOM_SUBSCRIPTION_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setBizComSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['bizcom_subscription'] });
      console.log('[Subscription] BizCom subscription cancelled');
    },
  });

  const bizComReactivateMutation = useMutation({
    mutationFn: async () => {
      if (!bizComSubscription) throw new Error('No BizCom subscription');
      const updated: ActiveBizComSubscription = {
        ...bizComSubscription,
        status: 'active',
      };
      await AsyncStorage.setItem(BIZCOM_SUBSCRIPTION_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setBizComSubscription(data);
      void queryClient.invalidateQueries({ queryKey: ['bizcom_subscription'] });
      console.log('[Subscription] BizCom subscription reactivated');
    },
  });

  const { mutate: subscribeMutate } = subscribeMutation;
  const { mutate: changePlanMutate } = changePlanMutation;
  const { mutate: cancelMutate } = cancelMutation;
  const { mutate: reactivateMutate } = reactivateMutation;
  const { mutate: bizComSubscribeMutate } = bizComSubscribeMutation;
  const { mutate: bizComChangeTierMutate } = bizComChangeTierMutation;
  const { mutate: bizComCancelMutate } = bizComCancelMutation;
  const { mutate: bizComReactivateMutate } = bizComReactivateMutation;

  const subscribe = useCallback((tier: SubscriptionTier, billingCycle: BillingCycle) => {
    subscribeMutate({ tier, billingCycle });
  }, [subscribeMutate]);

  const changePlan = useCallback((tier: SubscriptionTier, billingCycle: BillingCycle) => {
    changePlanMutate({ tier, billingCycle });
  }, [changePlanMutate]);

  const cancelSubscription = useCallback(() => {
    cancelMutate();
  }, [cancelMutate]);

  const reactivateSubscription = useCallback(() => {
    reactivateMutate();
  }, [reactivateMutate]);

  const bizComSubscribe = useCallback((tierId: string, paymentLast4?: string, paymentBrand?: string) => {
    bizComSubscribeMutate({ tierId, paymentLast4, paymentBrand });
  }, [bizComSubscribeMutate]);

  const bizComChangeTier = useCallback((tierId: string) => {
    bizComChangeTierMutate(tierId);
  }, [bizComChangeTierMutate]);

  const bizComCancel = useCallback(() => {
    bizComCancelMutate();
  }, [bizComCancelMutate]);

  const bizComReactivate = useCallback(() => {
    bizComReactivateMutate();
  }, [bizComReactivateMutate]);

  return useMemo(() => {
    const currentPlan = subscription
      ? SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId) ?? null
      : null;

    const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing';

    const currentBizComTier = bizComSubscription
      ? BIZCOM_MEMBER_TIERS.find(t => t.id === bizComSubscription.tierId) ?? null
      : null;

    const isBizComSubscribed = bizComSubscription?.status === 'active' || bizComSubscription?.status === 'trialing';

    return {
      subscription,
      currentPlan,
      isSubscribed,
      plans: SUBSCRIPTION_PLANS,
      subscribe,
      changePlan,
      cancelSubscription,
      reactivateSubscription,
      isLoading: storedSubscription.isLoading || storedBizComSubscription.isLoading,
      isSubscribing: subscribeMutation.isPending,
      isChangingPlan: changePlanMutation.isPending,
      bizComSubscription,
      currentBizComTier,
      isBizComSubscribed,
      bizComTiers: BIZCOM_MEMBER_TIERS,
      bizComSubscribe,
      bizComChangeTier,
      bizComCancel,
      bizComReactivate,
      isBizComSubscribing: bizComSubscribeMutation.isPending,
    };
  }, [
    subscription,
    bizComSubscription,
    subscribe,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    storedSubscription.isLoading,
    storedBizComSubscription.isLoading,
    subscribeMutation.isPending,
    changePlanMutation.isPending,
    bizComSubscribe,
    bizComChangeTier,
    bizComCancel,
    bizComReactivate,
    bizComSubscribeMutation.isPending,
  ]);
});
