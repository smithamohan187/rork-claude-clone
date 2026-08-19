import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSavedPosts, toggleSavePost, type SavedPostItem } from '@/api/services/savedPostService';
import { useAuth } from '@/contexts/AuthContext';

export function useSavedPosts() {
  const { authLoading, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<SavedPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await getSavedPosts();
      setPosts(data);
    } catch {
      /* silently fail — list stays empty */
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const remove = useCallback(async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await toggleSavePost(postId);
    } catch {
      refresh();
    }
  }, [refresh]);

  return { posts, isLoading, remove, refresh };
}
