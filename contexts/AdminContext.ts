import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import type { Post, User } from '@/types';
import { posts as mockPosts, personalUsers, businessUsers } from '@/mocks/data';

const ADMIN_ANNOUNCEMENTS_KEY = 'admin_announcements';


export const adminUser: User = {
  id: 'admin1',
  name: 'TouchPoint Admin',
  username: 'touchpoint_admin',
  avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop',
  accountType: 'admin',
  bio: 'Official TouchPoint Platform Administrator',
  followers: 0,
  following: 0,
  points: 0,
};

const defaultAdminAnnouncements: Post[] = [
  {
    id: 'admin_post_1',
    author: adminUser,
    content: 'Welcome to TouchPoint! We are excited to have you here. Please review our community guidelines and make the most of your experience. Happy connecting!',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop',
    likes: 1243,
    comments: 87,
    shares: 156,
    isLiked: false,
    createdAt: 'Pinned',
    type: 'admin',
    isPinned: true,
    status: 'active',
  },
  {
    id: 'admin_post_2',
    author: adminUser,
    content: 'Platform Update: We have improved the messaging system and added new reward tiers. Check your Rewards tab to see what is new! Thank you for being part of our community.',
    likes: 892,
    comments: 54,
    shares: 98,
    isLiked: false,
    createdAt: '1d ago',
    type: 'admin',
    isPinned: true,
    status: 'active',
  },
];

export interface PostReport {
  id: string;
  postId: string;
  post: Post;
  reason: string;
  reportedBy: string;
  reportedAt: string;
  status: 'pending' | 'reviewed' | 'removed';
}

const defaultReports: PostReport[] = [
  {
    id: 'rpt1',
    postId: 'p1',
    post: mockPosts[0],
    reason: 'Misleading promotion',
    reportedBy: personalUsers[0].name,
    reportedAt: '2h ago',
    status: 'pending',
  },
  {
    id: 'rpt2',
    postId: 'p4',
    post: mockPosts[3],
    reason: 'Suspected spam content',
    reportedBy: personalUsers[2].name,
    reportedAt: '5h ago',
    status: 'pending',
  },
  {
    id: 'rpt3',
    postId: 'p2',
    post: mockPosts[1],
    reason: 'Inappropriate content',
    reportedBy: personalUsers[1].name,
    reportedAt: '1d ago',
    status: 'reviewed',
  },
];

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [announcements, setAnnouncements] = useState<Post[]>(defaultAdminAnnouncements);
  const [reports, setReports] = useState<PostReport[]>(defaultReports);
  const [allPosts, setAllPosts] = useState<Post[]>(mockPosts);

  const storedAnnouncements = useQuery({
    queryKey: ['adminAnnouncements'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(ADMIN_ANNOUNCEMENTS_KEY);
      return stored ? (JSON.parse(stored) as Post[]) : defaultAdminAnnouncements;
    },
  });

  useEffect(() => {
    if (storedAnnouncements.data) {
      setAnnouncements(storedAnnouncements.data);
    }
  }, [storedAnnouncements.data]);

  const syncAnnouncements = useMutation({
    mutationFn: async (updated: Post[]) => {
      await AsyncStorage.setItem(ADMIN_ANNOUNCEMENTS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAnnouncements'] });
    },
  });

  const { mutate: syncMutate } = syncAnnouncements;

  const createAnnouncement = useCallback((content: string, image?: string) => {
    const newPost: Post = {
      id: `admin_post_${Date.now()}`,
      author: adminUser,
      content,
      image,
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      createdAt: 'Just now',
      type: 'admin',
      isPinned: true,
      status: 'active',
    };
    const updated = [newPost, ...announcements];
    setAnnouncements(updated);
    syncMutate(updated);
    console.log('Admin announcement created:', newPost.id);
    return newPost;
  }, [announcements, syncMutate]);

  const removeAnnouncement = useCallback((postId: string) => {
    const updated = announcements.filter(a => a.id !== postId);
    setAnnouncements(updated);
    syncMutate(updated);
    console.log('Admin announcement removed:', postId);
  }, [announcements, syncMutate]);

  const flagPost = useCallback((postId: string) => {
    setAllPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, status: 'flagged' as const } : p
    ));
    console.log('Post flagged:', postId);
  }, []);

  const removePost = useCallback((postId: string) => {
    setAllPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, status: 'removed' as const } : p
    ));
    setReports(prev => prev.map(r =>
      r.postId === postId ? { ...r, status: 'removed' as const } : r
    ));
    console.log('Post removed:', postId);
  }, []);

  const approvePost = useCallback((postId: string) => {
    setAllPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, status: 'active' as const } : p
    ));
    setReports(prev => prev.map(r =>
      r.postId === postId ? { ...r, status: 'reviewed' as const } : r
    ));
    console.log('Post approved:', postId);
  }, []);

  const resolveReport = useCallback((reportId: string, action: 'reviewed' | 'removed') => {
    setReports(prev => prev.map(r =>
      r.id === reportId ? { ...r, status: action } : r
    ));
    console.log('Report resolved:', reportId, action);
  }, []);

  const totalUsers = personalUsers.length + businessUsers.length + 1;
  const activePostsCount = allPosts.filter(p => p.status !== 'removed').length;
  const pendingReports = reports.filter(r => r.status === 'pending').length;

  return {
    announcements,
    reports,
    allPosts,
    createAnnouncement,
    removeAnnouncement,
    flagPost,
    removePost,
    approvePost,
    resolveReport,
    totalUsers,
    activePostsCount,
    pendingReports,
    isLoading: storedAnnouncements.isLoading,
  };
});
