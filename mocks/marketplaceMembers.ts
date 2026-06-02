export type MemberBadge = 'Platinum Member' | 'Gold Member' | 'Silver Member' | 'Bronze Member';

export interface MarketplaceMember {
  id: string;
  name: string;
  handle: string;
  badge: MemberBadge;
  avatar: string;
  location: string;
  points: number;
  joinedAt: string;
}

export const BADGE_COLORS: Record<MemberBadge, { bg: string; text: string; border: string }> = {
  'Platinum Member': { bg: '#E8F5E9', text: '#1B5E20', border: '#81C784' },
  'Gold Member': { bg: '#FFF8E1', text: '#F57F17', border: '#FFD54F' },
  'Silver Member': { bg: '#F3F3F3', text: '#616161', border: '#BDBDBD' },
  'Bronze Member': { bg: '#FBE9E7', text: '#BF360C', border: '#FFAB91' },
};

export const marketplaceMembers: MarketplaceMember[] = [
  {
    id: '1',
    name: 'Thomas Müller',
    handle: '@thomasmuller',
    badge: 'Gold Member',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    location: 'Berlin, DE',
    points: 3450,
    joinedAt: 'Mar 2025',
  },
  {
    id: '2',
    name: 'Sophie Dubois',
    handle: '@sophiedubois',
    badge: 'Silver Member',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    location: 'Paris, FR',
    points: 1280,
    joinedAt: 'Jan 2025',
  },
  {
    id: '3',
    name: 'Luca Bianchi',
    handle: '@lucabianchi',
    badge: 'Platinum Member',
    avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
    location: 'Milan, IT',
    points: 8920,
    joinedAt: 'Nov 2024',
  },
  {
    id: '4',
    name: 'Emma Johansson',
    handle: '@emmajohansson',
    badge: 'Gold Member',
    avatar: 'https://randomuser.me/api/portraits/women/21.jpg',
    location: 'Stockholm, SE',
    points: 4100,
    joinedAt: 'Feb 2025',
  },
  {
    id: '5',
    name: 'Oliver Bennett',
    handle: '@oliverbennett',
    badge: 'Bronze Member',
    avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    location: 'London, UK',
    points: 650,
    joinedAt: 'Apr 2025',
  },
  {
    id: '6',
    name: 'Isabelle Laurent',
    handle: '@isabellelaurent',
    badge: 'Silver Member',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    location: 'Lyon, FR',
    points: 2100,
    joinedAt: 'Dec 2024',
  },
];
