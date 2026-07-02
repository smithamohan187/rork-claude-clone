import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  fetchBusinessPosts,
  togglePostStatus,
  deletePost as deletePostService,
  type Post,
} from '@/api/services/postsService';

export type PostFilter = 'all' | 'active' | 'disabled';

export function useBusinessPosts(businessId: string, filter: PostFilter) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await fetchBusinessPosts(businessId, status);
      setPosts(data);
    } catch {
      // silently fail — list stays empty
    } finally {
      setIsLoading(false);
    }
  }, [businessId, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleDisable = useCallback(
    async (postId: string, currentIsActive: boolean) => {
      try {
        await togglePostStatus(postId, !currentIsActive);
        await refresh();
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Could not update post status.');
      }
    },
    [refresh],
  );

  const deletePost = useCallback(
    async (postId: string) => {
      try {
        await deletePostService(postId);
        await refresh();
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Could not delete post.');
      }
    },
    [refresh],
  );

  return { posts, isLoading, refresh, toggleDisable, deletePost };
}
