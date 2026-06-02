export interface PostComment {
  id: string;
  user: string;
  text: string;
  time: string;
}

export interface BusinessPost {
  id: string;
  type: 'post';
  business_id: string;
  business_name: string;
  business_logo: string;
  text: string;
  image_url: string | null;
  created_at: string;
  likes: number;
  comments: PostComment[];
}

export const initialMockPosts: BusinessPost[] = [
  {
    id: 'p1',
    type: 'post',
    business_id: 'b1',
    business_name: 'The Brew House',
    business_logo: 'https://picsum.photos/seed/brew/100/100',
    text: 'We just refreshed our interiors! Come feel the new vibe. ☕',
    image_url: 'https://picsum.photos/seed/post1/600/400',
    created_at: '2025-05-01T10:30:00Z',
    likes: 24,
    comments: [
      { id: 'c1', user: 'Arya M.', text: 'Looks amazing!', time: '1h ago' },
      { id: 'c2', user: 'Rohan K.', text: "Can't wait to visit!", time: '30m ago' },
    ],
  },
  {
    id: 'p2',
    type: 'post',
    business_id: 'b1',
    business_name: 'The Brew House',
    business_logo: 'https://picsum.photos/seed/brew/100/100',
    text: 'Thank you for 500 subscribers! You mean the world to us. 🙌',
    image_url: null,
    created_at: '2025-04-28T08:00:00Z',
    likes: 61,
    comments: [],
  },
];

/** Format an ISO timestamp into a friendly relative time. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}
