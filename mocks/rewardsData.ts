export interface RedeemableReward {
  id: string;
  businessId: string;
  title: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'free_item' | 'voucher';
  expiryMinutes: number;
}

export const redeemableRewards: Record<string, RedeemableReward[]> = {
  b1: [
    { id: 'rw1', businessId: 'b1', title: '15% Off Next Order', description: 'Get 15% off your next coffee order', pointsCost: 200, type: 'discount', expiryMinutes: 30 },
    { id: 'rw2', businessId: 'b1', title: 'Free Espresso Shot', description: 'Add a free espresso shot to any drink', pointsCost: 100, type: 'free_item', expiryMinutes: 30 },
    { id: 'rw3', businessId: 'b1', title: '$5 Gift Voucher', description: 'Redeem a $5 voucher for in-store use', pointsCost: 350, type: 'voucher', expiryMinutes: 30 },
  ],
  b3: [
    { id: 'rw4', businessId: 'b3', title: 'Free Day Pass', description: 'One free day pass for the gym', pointsCost: 150, type: 'free_item', expiryMinutes: 30 },
    { id: 'rw5', businessId: 'b3', title: '20% Off Membership', description: '20% off your next month membership', pointsCost: 250, type: 'discount', expiryMinutes: 30 },
  ],
  b4: [
    { id: 'rw6', businessId: 'b4', title: 'Free Pastry', description: 'Get a free pastry with any order', pointsCost: 80, type: 'free_item', expiryMinutes: 30 },
    { id: 'rw7', businessId: 'b4', title: '10% Off Catering', description: '10% off your next catering order', pointsCost: 120, type: 'discount', expiryMinutes: 30 },
  ],
};

export interface TierInfo {
  name: string;
  threshold: number;
  color: string;
  icon: string;
}

export const tierLadder: TierInfo[] = [
  { name: 'Bronze', threshold: 0, color: '#CD7F32', icon: 'shield' },
  { name: 'Silver', threshold: 500, color: '#A8A9AD', icon: 'shield' },
  { name: 'Gold', threshold: 1500, color: '#FFD700', icon: 'crown' },
  { name: 'Platinum', threshold: 3000, color: '#00B246', icon: 'gem' },
  { name: 'Diamond', threshold: 5000, color: '#06B6D4', icon: 'diamond' },
];
