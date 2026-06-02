export interface DummyComment {
  id: string;
  author: string;
  authorInitials: string;
  avatarColor: string;
  body: string;
  createdAt: string;
  likeCount: number;
  isBusinessReply: boolean;
  parentId: string | null;
}

export const DUMMY_COMMENTS: Record<string, DummyComment[]> = {
  'o1': [
    {
      id: 'c1',
      author: 'Rahul K.',
      authorInitials: 'RK',
      avatarColor: '#00B246',
      body: 'Is this valid at the Indiranagar branch too? 🙌',
      createdAt: '2h ago',
      likeCount: 0,
      isBusinessReply: false,
      parentId: null,
    },
    {
      id: 'c2',
      author: 'Nourish Kitchen',
      authorInitials: 'NK',
      avatarColor: '#0984E3',
      body: 'Yes Rahul, valid at all 3 branches! Show your subscriber badge at checkout 😊',
      createdAt: '1h ago',
      likeCount: 3,
      isBusinessReply: true,
      parentId: 'c1',
    },
    {
      id: 'c3',
      author: 'Priya S.',
      authorInitials: 'PS',
      avatarColor: '#00B894',
      body: 'Just used this — the cold brew combo is amazing!',
      createdAt: '45m ago',
      likeCount: 1,
      isBusinessReply: false,
      parentId: null,
    },
  ],
  'o2': [
    {
      id: 'c4',
      author: 'Arun M.',
      authorInitials: 'AM',
      avatarColor: '#E17055',
      body: 'What time does the offer start?',
      createdAt: '3h ago',
      likeCount: 0,
      isBusinessReply: false,
      parentId: null,
    },
  ],
};

export const DUMMY_REACTIONS: Record<string, number> = {
  'o1': 24,
  'o2': 7,
  'e1': 15,
};
