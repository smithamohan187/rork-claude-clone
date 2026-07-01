import { useState, useCallback, useEffect } from 'react';
import {
  fetchMyPosts,
  fetchPostById,
  createPost,
  updatePost,
  deletePost,
  togglePostStatus,
  type Post,
  type CreatePostPayload,
} from '@/api/services/postsService';

export function usePosts(initialFilter?: 'active' | 'disabled') {
  const [posts, setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async (filter?: 'active' | 'disabled') => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyPosts(filter ?? initialFilter);
      setPosts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [initialFilter]);

  useEffect(() => { load(); }, [load]);

  const addPost = useCallback(async (payload: CreatePostPayload): Promise<Post> => {
    const post = await createPost(payload);
    setPosts(prev => [post, ...prev]);
    return post;
  }, []);

  const editPost = useCallback(async (id: string, payload: Partial<CreatePostPayload>): Promise<Post> => {
    const updated = await updatePost(id, payload);
    setPosts(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }, []);

  const toggleStatus = useCallback(async (id: string, isActive: boolean): Promise<void> => {
    const updated = await togglePostStatus(id, isActive);
    setPosts(prev => prev.map(p => p.id === id ? updated : p));
  }, []);

  const removePost = useCallback(async (id: string): Promise<void> => {
    await deletePost(id);
    setPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  return { posts, loading, error, refresh: load, addPost, editPost, toggleStatus, removePost };
}

export function usePost(id: string) {
  const [post, setPost]     = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchPostById(id);
        if (!cancelled) setPost(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { post, loading, error };
}
