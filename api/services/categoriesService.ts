import { apiClient } from '../client';

export interface Category {
  id: string;
  name: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const result = await apiClient.get<Category[]>('/categories');
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to fetch categories');
  }
  return result.data;
}