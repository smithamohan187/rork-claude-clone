import React, { useCallback, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { initialMockPosts, type BusinessPost, type PostComment } from '@/mocks/posts';

export const [PostsProvider, usePosts] = createContextHook(() => {
  const [posts, setPosts] = useState<BusinessPost[]>(initialMockPosts);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});

  const addPost = useCallback((p: { text: string; image_url: string | null; business_id?: string; business_name?: string; business_logo?: string }) => {
    const newPost: BusinessPost = {
      id: `p-${Date.now()}`,
      type: 'post',
      business_id: p.business_id ?? 'b1',
      business_name: p.business_name ?? 'The Brew House',
      business_logo: p.business_logo ?? 'https://picsum.photos/seed/brew/100/100',
      text: p.text,
      image_url: p.image_url,
      created_at: new Date().toISOString(),
      likes: 0,
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    return newPost;
  }, []);

  const updatePost = useCallback((id: string, updates: { text?: string; image_url?: string | null }) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const wasLiked = !!prev[id];
      setPosts((p) => p.map((x) => (x.id === id ? { ...x, likes: x.likes + (wasLiked ? -1 : 1) } : x)));
      return { ...prev, [id]: !wasLiked };
    });
  }, []);

  const addComment = useCallback((id: string, text: string) => {
    const c: PostComment = {
      id: `c-${Date.now()}`,
      user: 'You',
      text,
      time: 'Just now',
    };
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: [...p.comments, c] } : p)));
  }, []);

  const getPost = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);

  const getPostsForBusiness = useCallback(
    (businessId: string) => posts.filter((p) => p.business_id === businessId),
    [posts],
  );

  return {
    posts,
    likedIds,
    addPost,
    updatePost,
    deletePost,
    toggleLike,
    addComment,
    getPost,
    getPostsForBusiness,
  };
});
