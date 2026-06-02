export type SubscriberTier = 'bronze' | 'silver' | 'gold';

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  lastActivity: string;
  tier: SubscriberTier;
  totalPoints: number;
  pointsEarned: number;
  pointsRedeemed: number;
  couponsUsed: number;
}

export const TIER_THRESHOLDS: Record<SubscriberTier, { min: number; next: number | null; nextLabel: string | null }> = {
  bronze: { min: 0, next: 500, nextLabel: 'Silver' },
  silver: { min: 500, next: 2000, nextLabel: 'Gold' },
  gold: { min: 2000, next: null, nextLabel: null },
};

export const TIER_COLORS: Record<SubscriberTier, { bg: string; fg: string; ring: string }> = {
  bronze: { bg: '#F7E8D9', fg: '#B87333', ring: '#B87333' },
  silver: { bg: '#ECEFF3', fg: '#6F7A86', ring: '#9AA3AD' },
  gold: { bg: '#FFF4D1', fg: '#A77700', ring: '#E5A100' },
};

export const subscribers: Subscriber[] = [
  {
    id: 's1',
    name: 'Ava Thompson',
    email: 'ava.t@mail.com',
    joinDate: '2025-08-12',
    lastActivity: '2026-04-15',
    tier: 'gold',
    totalPoints: 3240,
    pointsEarned: 4120,
    pointsRedeemed: 880,
    couponsUsed: 14,
  },
  {
    id: 's2',
    name: 'Marcus Chen',
    email: 'marcus@mail.com',
    joinDate: '2025-11-03',
    lastActivity: '2026-04-14',
    tier: 'silver',
    totalPoints: 1280,
    pointsEarned: 1480,
    pointsRedeemed: 200,
    couponsUsed: 5,
  },
  {
    id: 's3',
    name: 'Priya Patel',
    email: 'priya@mail.com',
    joinDate: '2026-01-22',
    lastActivity: '2026-04-16',
    tier: 'bronze',
    totalPoints: 240,
    pointsEarned: 320,
    pointsRedeemed: 80,
    couponsUsed: 2,
  },
  {
    id: 's4',
    name: 'Jordan Blake',
    email: 'jordan@mail.com',
    joinDate: '2025-06-30',
    lastActivity: '2026-04-10',
    tier: 'gold',
    totalPoints: 2890,
    pointsEarned: 3520,
    pointsRedeemed: 630,
    couponsUsed: 11,
  },
  {
    id: 's5',
    name: 'Sofia Rivera',
    email: 'sofia.r@mail.com',
    joinDate: '2025-09-14',
    lastActivity: '2026-04-13',
    tier: 'silver',
    totalPoints: 1640,
    pointsEarned: 1940,
    pointsRedeemed: 300,
    couponsUsed: 7,
  },
  {
    id: 's6',
    name: 'Liam Nguyen',
    email: 'liam@mail.com',
    joinDate: '2026-02-02',
    lastActivity: '2026-04-09',
    tier: 'bronze',
    totalPoints: 120,
    pointsEarned: 180,
    pointsRedeemed: 60,
    couponsUsed: 1,
  },
  {
    id: 's7',
    name: 'Emma Rossi',
    email: 'emma@mail.com',
    joinDate: '2025-07-19',
    lastActivity: '2026-04-16',
    tier: 'gold',
    totalPoints: 2110,
    pointsEarned: 2670,
    pointsRedeemed: 560,
    couponsUsed: 9,
  },
  {
    id: 's8',
    name: 'Noah Becker',
    email: 'noah@mail.com',
    joinDate: '2025-12-05',
    lastActivity: '2026-04-11',
    tier: 'silver',
    totalPoints: 940,
    pointsEarned: 1120,
    pointsRedeemed: 180,
    couponsUsed: 4,
  },
  {
    id: 's9',
    name: 'Hannah Kim',
    email: 'hannah@mail.com',
    joinDate: '2026-03-18',
    lastActivity: '2026-04-15',
    tier: 'bronze',
    totalPoints: 380,
    pointsEarned: 420,
    pointsRedeemed: 40,
    couponsUsed: 2,
  },
  {
    id: 's10',
    name: 'Diego Martinez',
    email: 'diego@mail.com',
    joinDate: '2025-10-09',
    lastActivity: '2026-04-07',
    tier: 'silver',
    totalPoints: 1780,
    pointsEarned: 2010,
    pointsRedeemed: 230,
    couponsUsed: 8,
  },
  {
    id: 's11',
    name: 'Olivia Brooks',
    email: 'olivia@mail.com',
    joinDate: '2025-05-11',
    lastActivity: '2026-04-16',
    tier: 'gold',
    totalPoints: 4010,
    pointsEarned: 4720,
    pointsRedeemed: 710,
    couponsUsed: 18,
  },
  {
    id: 's12',
    name: 'Ethan Clarke',
    email: 'ethan@mail.com',
    joinDate: '2026-03-29',
    lastActivity: '2026-04-12',
    tier: 'bronze',
    totalPoints: 60,
    pointsEarned: 80,
    pointsRedeemed: 20,
    couponsUsed: 0,
  },
];

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - d);
    const day = 24 * 60 * 60 * 1000;
    const days = Math.floor(diff / day);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch {
    return iso;
  }
}
