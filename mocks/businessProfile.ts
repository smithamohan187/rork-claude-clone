export interface BusinessProfileData {
  id: string;
  name: string;
  category: string;
  description: string;
  coverImage: string;
  logo: string;
  subscriberCount: number;
  activeOfferCount: number;
  welcomePoints: number;
  phone: string;
  email: string;
  website: string;
  address: string;
  hours: string;
  founded: string;
}

export interface OfferCard {
  id: string;
  title: string;
  description: string;
  validUntil: string;
  discount: string;
  saved: boolean;
}

export interface EventCard {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

export interface RewardTier {
  id: string;
  name: string;
  color: string;
  pointsRequired: number;
  icon: string;
}

export const MOCK_BUSINESS: BusinessProfileData = {
  id: 'bp-1',
  name: 'The Grind Coffee Co.',
  category: 'Café & Bakery',
  description: 'Artisan coffee roasters & freshly baked goods. Sourcing the finest single-origin beans since 2018.',
  coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
  logo: 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=200&q=80',
  subscriberCount: 2847,
  activeOfferCount: 5,
  welcomePoints: 50,
  phone: '+1 (555) 234-5678',
  email: 'hello@grindcoffee.co',
  website: 'www.grindcoffee.co',
  address: '42 Roastery Lane, Brooklyn, NY 11201',
  hours: 'Mon–Fri 7am–7pm · Sat–Sun 8am–5pm',
  founded: '2018',
};

export const ALL_BUSINESSES: Record<string, BusinessProfileData> = {
  'bp-1': MOCK_BUSINESS,
  'b1': {
    id: 'b1',
    name: 'Nourish Kitchen & Table',
    category: 'Food & Dining',
    description: 'Farm-to-table dining with seasonal menus crafted from locally sourced ingredients. A neighborhood favorite since 2016.',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80',
    subscriberCount: 1240,
    activeOfferCount: 3,
    welcomePoints: 50,
    phone: '+1 (555) 100-1001',
    email: 'hello@nourishkitchen.co',
    website: 'www.nourishkitchen.co',
    address: '18 Garden Row, Brooklyn, NY 11215',
    hours: 'Mon–Sun 11am–10pm',
    founded: '2016',
  },
  'b2': {
    id: 'b2',
    name: 'FitZone Performance Gym',
    category: 'Fitness',
    description: 'High-performance training facility with expert coaches, state-of-the-art equipment, and a supportive community.',
    coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80',
    subscriberCount: 860,
    activeOfferCount: 2,
    welcomePoints: 75,
    phone: '+1 (555) 200-2002',
    email: 'info@fitzoneperformance.com',
    website: 'www.fitzoneperformance.com',
    address: '55 Iron Ave, Manhattan, NY 10001',
    hours: 'Mon–Fri 5am–11pm · Sat–Sun 7am–9pm',
    founded: '2019',
  },
  'b3': {
    id: 'b3',
    name: 'Glow Beauty Studio',
    category: 'Beauty',
    description: 'Premium skincare and beauty treatments using organic, cruelty-free products. Glow from the inside out.',
    coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&q=80',
    subscriberCount: 2100,
    activeOfferCount: 4,
    welcomePoints: 100,
    phone: '+1 (555) 300-3003',
    email: 'book@glowbeauty.co',
    website: 'www.glowbeauty.co',
    address: '92 Bloom St, Brooklyn, NY 11211',
    hours: 'Tue–Sat 10am–8pm · Sun 11am–6pm',
    founded: '2020',
  },
  'b4': {
    id: 'b4',
    name: 'Urban Threads Boutique',
    category: 'Retail',
    description: 'Curated streetwear and sustainable fashion from independent designers. Style that makes a statement.',
    coverImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80',
    subscriberCount: 530,
    activeOfferCount: 2,
    welcomePoints: 30,
    phone: '+1 (555) 400-4004',
    email: 'shop@urbanthreads.nyc',
    website: 'www.urbanthreads.nyc',
    address: '77 Style Blvd, SoHo, NY 10012',
    hours: 'Mon–Sat 10am–9pm · Sun 12pm–7pm',
    founded: '2021',
  },
  'b5': {
    id: 'b5',
    name: 'Rivera Coffee Co.',
    category: 'Café & Bakery',
    description: 'Small-batch specialty coffee roasted in-house. Serving single-origin pour-overs and handmade pastries daily.',
    coverImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    logo: 'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=200&q=80',
    subscriberCount: 3400,
    activeOfferCount: 3,
    welcomePoints: 40,
    phone: '+1 (555) 500-5005',
    email: 'hello@riveracoffee.co',
    website: 'www.riveracoffee.co',
    address: '5 Bean St, Williamsburg, NY 11249',
    hours: 'Mon–Fri 6:30am–6pm · Sat–Sun 7am–5pm',
    founded: '2017',
  },
  'b6': {
    id: 'b6',
    name: 'SoundWave Events',
    category: 'Events',
    description: 'Live music, comedy nights, and cultural festivals that bring communities together. Never a dull evening.',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
    logo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80',
    subscriberCount: 4200,
    activeOfferCount: 6,
    welcomePoints: 60,
    phone: '+1 (555) 600-6006',
    email: 'events@soundwave.live',
    website: 'www.soundwave.live',
    address: '200 Bass Lane, Brooklyn, NY 11222',
    hours: 'Event-based · Check schedule',
    founded: '2015',
  },
};

export const ALL_OFFERS: Record<string, OfferCard[]> = {
  'b1': [
    { id: 'b1-o1', title: 'Weekend Brunch Special', description: 'Enjoy 20% off our signature brunch menu every Saturday and Sunday.', validUntil: '2026-05-31', discount: '20% OFF', saved: false },
    { id: 'b1-o2', title: 'Happy Hour 4–6pm', description: 'Half-price appetizers and craft cocktails on weekdays.', validUntil: '2026-06-15', discount: '50% OFF', saved: false },
    { id: 'b1-o3', title: 'Birthday Dinner Free Dessert', description: 'Celebrate with a complimentary dessert during your birthday month.', validUntil: '2026-12-31', discount: 'FREE', saved: false },
  ],
  'b2': [
    { id: 'b2-o1', title: 'Free Trial Week', description: 'Experience everything FitZone offers with a full 7-day free pass.', validUntil: '2026-05-31', discount: 'FREE', saved: false },
    { id: 'b2-o2', title: '3 Months for Price of 2', description: 'Sign up for a quarterly plan and get one month completely free.', validUntil: '2026-04-30', discount: '33% OFF', saved: false },
  ],
  'b3': [
    { id: 'b3-o1', title: 'First Facial Treatment', description: '30% off your very first facial. Discover your perfect skincare routine.', validUntil: '2026-06-30', discount: '30% OFF', saved: false },
    { id: 'b3-o2', title: 'Glow Package Deal', description: 'Book 3 treatments and get the 4th free. Mix & match any services.', validUntil: '2026-05-31', discount: 'BUY 3+1', saved: false },
    { id: 'b3-o3', title: 'Referral Reward', description: 'Refer a friend and both of you get 20% off your next visit.', validUntil: '2026-12-31', discount: '20% OFF', saved: false },
    { id: 'b3-o4', title: 'Student Discount', description: 'Valid student ID gets you 15% off all services, any day.', validUntil: '2026-12-31', discount: '15% OFF', saved: false },
  ],
  'b4': [
    { id: 'b4-o1', title: 'Spring Collection Drop', description: 'Be first to shop the new spring line — 15% off for subscribers.', validUntil: '2026-05-15', discount: '15% OFF', saved: false },
    { id: 'b4-o2', title: 'Loyalty Stamp Card', description: 'Every 5th purchase earns you a $25 store credit.', validUntil: '2026-12-31', discount: 'LOYALTY', saved: false },
  ],
  'b5': [
    { id: 'b5-o1', title: 'Double Points Monday', description: 'Earn 2x reward points on all purchases every Monday.', validUntil: '2026-06-30', discount: '2X PTS', saved: false },
    { id: 'b5-o2', title: 'Free Pastry with Any Coffee', description: 'New subscriber perk — your first coffee comes with a free pastry.', validUntil: '2026-05-31', discount: 'FREE', saved: false },
    { id: 'b5-o3', title: 'Bag of Beans Discount', description: 'Take home a bag of our house blend at 25% off retail price.', validUntil: '2026-07-01', discount: '25% OFF', saved: false },
  ],
  'b6': [
    { id: 'b6-o1', title: 'Early Bird Tickets', description: '40% off tickets when you book 2 weeks before any event.', validUntil: '2026-12-31', discount: '40% OFF', saved: false },
    { id: 'b6-o2', title: 'VIP Season Pass', description: 'Unlimited access to all events for one flat monthly fee.', validUntil: '2026-06-30', discount: 'VIP', saved: false },
    { id: 'b6-o3', title: 'Group Discount', description: 'Bring 4+ friends and everyone saves 20% on tickets.', validUntil: '2026-12-31', discount: '20% OFF', saved: false },
    { id: 'b6-o4', title: 'Student Night Thursdays', description: 'Free entry for students every Thursday. Just show your ID.', validUntil: '2026-12-31', discount: 'FREE', saved: false },
    { id: 'b6-o5', title: 'Birthday Party Package', description: 'Host your birthday with us — reserved area + 2 free drinks.', validUntil: '2026-12-31', discount: 'SPECIAL', saved: false },
    { id: 'b6-o6', title: 'Merch Bundle Deal', description: 'Buy any 2 merch items and get 30% off the bundle.', validUntil: '2026-08-01', discount: '30% OFF', saved: false },
  ],
};

export const ALL_EVENTS: Record<string, EventCard[]> = {
  'b1': [
    { id: 'b1-e1', title: 'Chef\'s Table Experience', date: '2026-04-20', time: '7:00 PM – 9:30 PM', location: 'Private Dining Room', description: 'An intimate 5-course tasting menu with wine pairings by our head chef.' },
    { id: 'b1-e2', title: 'Cooking Class: Pasta Night', date: '2026-05-03', time: '6:00 PM – 8:00 PM', location: 'Kitchen Studio', description: 'Learn to make fresh pasta from scratch. All ingredients provided.' },
  ],
  'b2': [
    { id: 'b2-e1', title: 'HIIT Challenge Week', date: '2026-04-21', time: '6:00 AM – 7:00 AM', location: 'Main Floor', description: 'Daily HIIT sessions for one week. Prizes for top performers.' },
    { id: 'b2-e2', title: 'Yoga & Meditation Retreat', date: '2026-05-10', time: '9:00 AM – 12:00 PM', location: 'Rooftop Studio', description: 'A morning of guided yoga flows and meditation techniques.' },
  ],
  'b3': [
    { id: 'b3-e1', title: 'Skincare Masterclass', date: '2026-04-22', time: '2:00 PM – 4:00 PM', location: 'Glow Studio', description: 'Learn the science behind glowing skin with our lead esthetician.' },
  ],
  'b4': [
    { id: 'b4-e1', title: 'Spring Fashion Pop-Up', date: '2026-04-26', time: '12:00 PM – 6:00 PM', location: 'Storefront', description: 'Exclusive preview of upcoming designers. Refreshments served.' },
  ],
  'b5': [
    { id: 'b5-e1', title: 'Cupping Session: Kenya vs Colombia', date: '2026-04-19', time: '10:00 AM – 11:30 AM', location: 'Tasting Bar', description: 'Explore flavor profiles of two beloved origins side by side.' },
    { id: 'b5-e2', title: 'Latte Art Throwdown', date: '2026-05-08', time: '5:00 PM – 7:00 PM', location: 'Main Counter', description: 'Watch local baristas compete for the best latte art. Free coffee for attendees.' },
  ],
  'b6': [
    { id: 'b6-e1', title: 'Indie Band Showcase', date: '2026-04-24', time: '8:00 PM – 11:00 PM', location: 'Main Stage', description: 'Three up-and-coming indie bands performing live.' },
    { id: 'b6-e2', title: 'Stand-Up Comedy Night', date: '2026-05-01', time: '7:30 PM – 10:00 PM', location: 'Lounge', description: 'A lineup of NYC\'s funniest comedians. BYOB welcome.' },
    { id: 'b6-e3', title: 'Open Mic Fridays', date: '2026-05-09', time: '6:00 PM – 9:00 PM', location: 'Acoustic Stage', description: 'Sign up to perform or just enjoy the vibes. All genres welcome.' },
  ],
};

export function getBusinessById(id: string): BusinessProfileData | null {
  if (ALL_BUSINESSES[id]) return ALL_BUSINESSES[id];
  const offerIdMap: Record<string, string> = {
    'o1': 'b1', 'o2': 'b2', 'o3': 'b3', 'o4': 'b4', 'o5': 'b5', 'o6': 'b6',
  };
  const mappedId = offerIdMap[id];
  if (mappedId && ALL_BUSINESSES[mappedId]) return ALL_BUSINESSES[mappedId];
  return MOCK_BUSINESS;
}

export function getOffersForBusiness(id: string): OfferCard[] {
  if (ALL_OFFERS[id]) return ALL_OFFERS[id];
  const offerIdMap: Record<string, string> = {
    'o1': 'b1', 'o2': 'b2', 'o3': 'b3', 'o4': 'b4', 'o5': 'b5', 'o6': 'b6',
  };
  const mappedId = offerIdMap[id];
  if (mappedId && ALL_OFFERS[mappedId]) return ALL_OFFERS[mappedId];
  return MOCK_OFFERS;
}

export function getEventsForBusiness(id: string): EventCard[] {
  if (ALL_EVENTS[id]) return ALL_EVENTS[id];
  const offerIdMap: Record<string, string> = {
    'o1': 'b1', 'o2': 'b2', 'o3': 'b3', 'o4': 'b4', 'o5': 'b5', 'o6': 'b6',
  };
  const mappedId = offerIdMap[id];
  if (mappedId && ALL_EVENTS[mappedId]) return ALL_EVENTS[mappedId];
  return MOCK_EVENTS;
}

export const MOCK_OFFERS: OfferCard[] = [
  {
    id: 'o1',
    title: 'Free Latte on First Visit',
    description: 'Welcome new subscribers with a complimentary house latte — any size, any milk.',
    validUntil: '2026-05-31',
    discount: 'FREE',
    saved: false,
  },
  {
    id: 'o2',
    title: '20% Off Pastry Combo',
    description: 'Grab any coffee + pastry combo and save 20%. Perfect for your morning fuel.',
    validUntil: '2026-04-30',
    discount: '20% OFF',
    saved: true,
  },
  {
    id: 'o3',
    title: 'Buy 5 Get 1 Free',
    description: 'Loyalty punch card — every 6th drink is on us. Applies to all hot beverages.',
    validUntil: '2026-06-15',
    discount: 'LOYALTY',
    saved: false,
  },
  {
    id: 'o4',
    title: 'Happy Hour 3–5pm',
    description: 'All iced drinks half price during weekday afternoons. Beat the slump!',
    validUntil: '2026-05-15',
    discount: '50% OFF',
    saved: false,
  },
  {
    id: 'o5',
    title: 'Birthday Treat',
    description: 'Free slice of cake during your birthday month. Just show your profile!',
    validUntil: '2026-12-31',
    discount: 'FREE',
    saved: false,
  },
];

export const MOCK_EVENTS: EventCard[] = [
  {
    id: 'e1',
    title: 'Latte Art Workshop',
    date: '2026-04-18',
    time: '10:00 AM – 12:00 PM',
    location: 'In-store, Main Branch',
    description: 'Learn the secrets of latte art from our head barista. All materials provided.',
  },
  {
    id: 'e2',
    title: 'Live Jazz & Coffee Night',
    date: '2026-04-25',
    time: '7:00 PM – 10:00 PM',
    location: 'Rooftop Terrace',
    description: 'Enjoy live jazz performances with specially curated coffee cocktails.',
  },
  {
    id: 'e3',
    title: 'Coffee Tasting: Ethiopian Origins',
    date: '2026-05-02',
    time: '3:00 PM – 4:30 PM',
    location: 'Tasting Room',
    description: 'Explore the rich flavors of Ethiopian single-origin beans with our master roaster.',
  },
];

export const REWARD_TIERS: RewardTier[] = [
  { id: 'rt1', name: 'Bronze', color: '#CD7F32', pointsRequired: 0, icon: '🥉' },
  { id: 'rt2', name: 'Silver', color: '#A8A9AD', pointsRequired: 500, icon: '🥈' },
  { id: 'rt3', name: 'Gold', color: '#FFD700', pointsRequired: 1500, icon: '🥇' },
];
