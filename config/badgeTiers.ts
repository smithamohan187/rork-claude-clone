import { Shield, ShieldHalf, ShieldCheck, Crown, type LucideIcon } from 'lucide-react-native';

export type BadgeTier = 'none' | 'silver' | 'gold' | 'platinum';

export interface BadgeColors {
  background: string;
  text: string;
  border: string;
  glow: string;
  gradient: [string, string];
}

export interface BadgeConfig {
  tier: Exclude<BadgeTier, 'none'>;
  label: string;
  minPoints: number;
  maxPoints: number | null;
  emoji: string;
  colors: BadgeColors;
  icon: LucideIcon;
  description: string;
  perksLabel: string;
}

export const BADGE_TIERS: BadgeConfig[] = [
  {
    tier: 'silver',
    label: 'Silver',
    minPoints: 100,
    maxPoints: 499,
    emoji: '🥈',
    colors: {
      background: '#F2F3F5',
      text: '#5C6470',
      border: '#A8B0BA',
      glow: '#C0C8D2',
      gradient: ['#E8ECF0', '#A8B0BA'],
    },
    icon: ShieldHalf,
    description:
      "You're building momentum! Keep subscribing, referring, and redeeming to level up.",
    perksLabel: 'Early access to selected offers',
  },
  {
    tier: 'gold',
    label: 'Gold',
    minPoints: 500,
    maxPoints: 1499,
    emoji: '🥇',
    colors: {
      background: '#FFF6DC',
      text: '#8A5A00',
      border: '#F2B600',
      glow: '#FFD24D',
      gradient: ['#FFE48A', '#F2A700'],
    },
    icon: ShieldCheck,
    description:
      "You're a Gold member! Businesses love loyal fans like you. Keep the momentum going!",
    perksLabel: 'Priority offers + exclusive Gold deals',
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    minPoints: 1500,
    maxPoints: null,
    emoji: '💎',
    colors: {
      background: '#F0E9FA',
      text: '#4A148C',
      border: '#8E24AA',
      glow: '#CE93D8',
      gradient: ['#C9A4E8', '#5E1F92'],
    },
    icon: Crown,
    description:
      'TouchPoint Champion! You are at the top — enjoy the best perks from every business you follow.',
    perksLabel: 'VIP access + Platinum-exclusive rewards',
  },
];

export const NO_BADGE_ICON: LucideIcon = Shield;

/** Get the badge config a user qualifies for given their total points. */
export const getBadgeForPoints = (points: number): BadgeConfig | null => {
  if (!Number.isFinite(points) || points < BADGE_TIERS[0].minPoints) return null;
  for (let i = BADGE_TIERS.length - 1; i >= 0; i -= 1) {
    if (points >= BADGE_TIERS[i].minPoints) return BADGE_TIERS[i];
  }
  return null;
};

export interface ProgressInfo {
  nextTier: BadgeConfig | null;
  progress: number; // 0..1
  pointsNeeded: number;
}

/** Compute progress toward the next tier. */
export const getProgressToNextTier = (points: number): ProgressInfo => {
  const safe = Math.max(0, points);
  const next = BADGE_TIERS.find((t) => safe < t.minPoints);
  if (!next) {
    return { nextTier: null, progress: 1, pointsNeeded: 0 };
  }
  const idx = BADGE_TIERS.indexOf(next);
  const prev = idx > 0 ? BADGE_TIERS[idx - 1] : null;
  const base = prev ? prev.minPoints : 0;
  const span = next.minPoints - base;
  const gained = safe - base;
  const progress = span > 0 ? Math.min(1, Math.max(0, gained / span)) : 0;
  return {
    nextTier: next,
    progress,
    pointsNeeded: Math.max(0, next.minPoints - safe),
  };
};

/** Disclaimer copy shown only in the BadgeDetailModal and onboarding. */
export const POINTS_DISCLAIMER =
  'Points are non-monetary. TouchPoint does not pay cash or transfer monetary value.';
