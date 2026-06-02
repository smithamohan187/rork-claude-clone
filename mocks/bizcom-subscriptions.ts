import type { BizComMemberTier } from '@/types';

export const BIZCOM_MEMBER_TIERS: BizComMemberTier[] = [
  {
    id: 'tier_2k',
    minMembers: 0,
    maxMembers: 2000,
    label: 'Up to 2,000 members',
    monthlyPrice: 30,
    currency: '£',
  },
  {
    id: 'tier_10k',
    minMembers: 2000,
    maxMembers: 10000,
    label: '2,000 – 10,000 members',
    monthlyPrice: 50,
    currency: '£',
  },
  {
    id: 'tier_20k',
    minMembers: 10000,
    maxMembers: 20000,
    label: '10,000 – 20,000 members',
    monthlyPrice: 100,
    currency: '£',
  },
  {
    id: 'tier_50k',
    minMembers: 20000,
    maxMembers: 50000,
    label: '20,000 – 50,000 members',
    monthlyPrice: 150,
    currency: '£',
  },
  {
    id: 'tier_unlimited',
    minMembers: 50000,
    maxMembers: null,
    label: '50,000+ Unlimited',
    monthlyPrice: 200,
    currency: '£',
  },
];

export function getTierForMemberCount(memberCount: number): BizComMemberTier {
  const tier = BIZCOM_MEMBER_TIERS.find(t => {
    if (t.maxMembers === null) {
      return memberCount >= t.minMembers;
    }
    return memberCount >= t.minMembers && memberCount < t.maxMembers;
  });
  return tier ?? BIZCOM_MEMBER_TIERS[0];
}

export function formatCurrency(amount: number, currency: string = '£'): string {
  return `${currency}${amount.toFixed(0)}`;
}
