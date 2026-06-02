import React, { useCallback, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';

export type ItemStatus = 'active' | 'disabled' | 'expired';

export interface OfferItem {
  id: string;
  type: 'offer';
  title: string;
  description: string;
  offer_value: string;
  valid_from: string;
  valid_until: string;
  terms: string;
  max_redemptions: string;
  image_url: string | null;
  status: ItemStatus;
}

export interface EventItem {
  id: string;
  type: 'event';
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: string;
  entry_fee: string;
  notes: string;
  image_url: string | null;
  status: ItemStatus;
}

export interface PostItem {
  id: string;
  type: 'post';
  text: string;
  image_url: string | null;
  status: ItemStatus;
  created_at: string;
  likes: number;
  comments: number;
}

export type ContentItem = OfferItem | EventItem | PostItem;

const initialOffers: OfferItem[] = [
  {
    id: 'o1',
    type: 'offer',
    title: 'Buy 1 Get 1 Coffee',
    description: 'Every Tuesday, enjoy BOGO on all brewed coffees.',
    offer_value: 'Buy 1 Get 1',
    valid_from: '2025-05-01',
    valid_until: '2025-05-31',
    terms: 'Valid only on Tuesdays. Dine-in only.',
    max_redemptions: '100',
    image_url: 'https://picsum.photos/seed/offer1/600/400',
    status: 'active',
  },
  {
    id: 'o2',
    type: 'offer',
    title: '10% Off Pastries',
    description: 'Get 10% off all pastries every morning before 10 AM.',
    offer_value: '10% off',
    valid_from: '2025-05-01',
    valid_until: '2025-06-15',
    terms: '',
    max_redemptions: '',
    image_url: null,
    status: 'disabled',
  },
];

const initialEvents: EventItem[] = [
  {
    id: 'e1',
    type: 'event',
    title: 'Open Mic Night',
    description: 'Join us every Friday at 7 PM for live performances.',
    date: '2026-06-12',
    start_time: '07:00 PM',
    end_time: '10:00 PM',
    location: 'The Brew House, MG Road',
    capacity: '40',
    entry_fee: 'Free',
    notes: '',
    image_url: 'https://picsum.photos/seed/event1/600/400',
    status: 'active',
  },
  {
    id: 'e2',
    type: 'event',
    title: 'Latte Art Workshop',
    description: 'Learn latte art from our head barista.',
    date: '2026-07-20',
    start_time: '11:00 AM',
    end_time: '01:00 PM',
    location: 'The Brew House, MG Road',
    capacity: '15',
    entry_fee: '₹500',
    notes: 'Includes welcome drink and materials.',
    image_url: 'https://picsum.photos/seed/event2/600/400',
    status: 'disabled',
  },
];

const initialPosts: PostItem[] = [
  {
    id: 'p1',
    type: 'post',
    text: 'We just refreshed our interiors! Come feel the new vibe. ☕',
    image_url: 'https://picsum.photos/seed/post1/600/400',
    status: 'active',
    created_at: '2025-05-01T10:30:00Z',
    likes: 24,
    comments: 2,
  },
  {
    id: 'p2',
    type: 'post',
    text: 'Thank you for 500 subscribers! You mean the world to us. 🙌',
    image_url: null,
    status: 'active',
    created_at: '2025-04-28T08:00:00Z',
    likes: 61,
    comments: 0,
  },
];

export const [ManageContentProvider, useManageContent] = createContextHook(() => {
  const [offers, setOffers] = useState<OfferItem[]>(initialOffers);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);

  const updateStatus = useCallback((id: string, type: ContentItem['type'], status: ItemStatus) => {
    if (type === 'offer') setOffers((p) => p.map((o) => (o.id === id ? { ...o, status } : o)));
    else if (type === 'event') setEvents((p) => p.map((e) => (e.id === id ? { ...e, status } : e)));
    else setPosts((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
  }, []);

  const removeItem = useCallback((id: string, type: ContentItem['type']) => {
    if (type === 'offer') setOffers((p) => p.filter((o) => o.id !== id));
    else if (type === 'event') setEvents((p) => p.filter((e) => e.id !== id));
    else setPosts((p) => p.filter((x) => x.id !== id));
  }, []);

  const updateOffer = useCallback((id: string, draft: OfferItem) => {
    setOffers((p) => p.map((o) => (o.id === id ? { ...draft } : o)));
  }, []);

  const updateEvent = useCallback((id: string, draft: EventItem) => {
    setEvents((p) => p.map((e) => (e.id === id ? { ...draft } : e)));
  }, []);

  const updatePost = useCallback((id: string, draft: PostItem) => {
    setPosts((p) => p.map((x) => (x.id === id ? { ...draft } : x)));
  }, []);

  const getOffer = useCallback((id: string) => offers.find((o) => o.id === id), [offers]);
  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events]);
  const getPost = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);

  return {
    offers,
    events,
    posts,
    updateStatus,
    removeItem,
    updateOffer,
    updateEvent,
    updatePost,
    getOffer,
    getEvent,
    getPost,
  };
});
