export interface FeaturedOffer {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  offerTitle: string;
  discount: string;
  category: string;
  imagePlaceholder: string;
  isSubscribed: boolean;
}

export interface NearbyBusiness {
  id: string;
  name: string;
  logo: string;
  category: string;
  categoryColor: string;
  subscribers: number;
  welcomePoints: number;
  distance: string;
  rating: number;
}

export const categories = [
  { key: 'all', label: 'All' },
  { key: 'food', label: 'Food' },
  { key: 'retail', label: 'Retail' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'events', label: 'Events' },
];

export const featuredOffers: FeaturedOffer[] = [
  {
    id: 'o1',
    businessId: 'b1',
    businessName: 'Nourish Kitchen',
    businessLogo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=80&h=80&fit=crop',
    offerTitle: 'Weekend Brunch Special',
    discount: '20% OFF',
    category: 'food',
    imagePlaceholder: '#E8735A',
    isSubscribed: true,
  },
  {
    id: 'o2',
    businessId: 'b2',
    businessName: 'FitZone Gym',
    businessLogo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=80&h=80&fit=crop',
    offerTitle: 'Free Trial Week',
    discount: 'FREE',
    category: 'fitness',
    imagePlaceholder: '#4CAF93',
    isSubscribed: false,
  },
  {
    id: 'o3',
    businessId: 'b3',
    businessName: 'Glow Studio',
    businessLogo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=80&h=80&fit=crop',
    offerTitle: 'First Facial Treatment',
    discount: '30% OFF',
    category: 'beauty',
    imagePlaceholder: '#E8F5EE',
    isSubscribed: false,
  },
  {
    id: 'o4',
    businessId: 'b4',
    businessName: 'Urban Threads',
    businessLogo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&h=80&fit=crop',
    offerTitle: 'Spring Collection Drop',
    discount: '15% OFF',
    category: 'retail',
    imagePlaceholder: '#6B8EC4',
    isSubscribed: true,
  },
  {
    id: 'o5',
    businessId: 'b5',
    businessName: 'Rivera Coffee',
    businessLogo: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=80&h=80&fit=crop',
    offerTitle: 'Double Points Monday',
    discount: '2X PTS',
    category: 'food',
    imagePlaceholder: '#8B6F4E',
    isSubscribed: true,
  },
  {
    id: 'o6',
    businessId: 'b6',
    businessName: 'SoundWave Festival',
    businessLogo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop',
    offerTitle: 'Early Bird Tickets',
    discount: '40% OFF',
    category: 'events',
    imagePlaceholder: '#00B246',
    isSubscribed: false,
  },
];

export const nearbyBusinesses: NearbyBusiness[] = [
  {
    id: 'b1',
    name: 'Nourish Kitchen & Table',
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
    category: 'Food & Dining',
    categoryColor: '#1A5C35',
    subscribers: 1240,
    welcomePoints: 50,
    distance: '0.3 mi',
    rating: 4.8,
  },
  {
    id: 'b2',
    name: 'FitZone Performance Gym',
    logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop',
    category: 'Fitness',
    categoryColor: '#10B981',
    subscribers: 860,
    welcomePoints: 75,
    distance: '0.5 mi',
    rating: 4.6,
  },
  {
    id: 'b3',
    name: 'Glow Beauty Studio',
    logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop',
    category: 'Beauty',
    categoryColor: '#EC4899',
    subscribers: 2100,
    welcomePoints: 100,
    distance: '0.7 mi',
    rating: 4.9,
  },
  {
    id: 'b4',
    name: 'Urban Threads Boutique',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    category: 'Retail',
    categoryColor: '#3B82F6',
    subscribers: 530,
    welcomePoints: 30,
    distance: '1.0 mi',
    rating: 4.5,
  },
  {
    id: 'b5',
    name: 'Rivera Coffee Co.',
    logo: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=100&h=100&fit=crop',
    category: 'Food & Dining',
    categoryColor: '#1A5C35',
    subscribers: 3400,
    welcomePoints: 40,
    distance: '0.2 mi',
    rating: 4.7,
  },
  {
    id: 'b6',
    name: 'SoundWave Events',
    logo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop',
    category: 'Events',
    categoryColor: '#00B246',
    subscribers: 4200,
    welcomePoints: 60,
    distance: '1.5 mi',
    rating: 4.4,
  },
];
