import apiClient, { ApiResult } from './apiClient';

export type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type CreateUserInput = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  auth_provider: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export async function getUserById(id: string): Promise<ApiResult<UserRow>> {
  return apiClient.get<UserRow>(
    'users',
    { id },
    { columns: 'id, full_name, email, phone', maybeSingle: true },
  );
}

export async function userExists(id: string): Promise<ApiResult<boolean>> {
  const { data, error } = await apiClient.get<{ id: string }>(
    'users',
    { id },
    { columns: 'id', maybeSingle: true },
  );
  return { data: error ? null : !!data, error };
}

export async function createUser(body: CreateUserInput): Promise<ApiResult<null>> {
  return apiClient.post('users', body);
}

export async function updateUser(
  id: string,
  body: Partial<Omit<CreateUserInput, 'id'>>,
): Promise<ApiResult<null>> {
  return apiClient.put('users', { id }, body);
}
