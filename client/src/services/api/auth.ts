import type { ApiClient } from '@/hooks/useApiClient';
import type {
  AuthLoginResponse,
  AuthRegisterPayload,
  AuthRegisterResponse,
  LoginCredentials,
  User,
} from '@/types';

export async function loginUser(
  client: ApiClient,
  credentials: LoginCredentials,
): Promise<AuthLoginResponse> {
  return client.post<AuthLoginResponse>('/auth/login', credentials);
}

export async function registerUser(
  client: ApiClient,
  data: AuthRegisterPayload,
): Promise<AuthRegisterResponse> {
  return client.post<AuthRegisterResponse>('/auth/register', data);
}

export async function logoutUser(client: ApiClient): Promise<void> {
  await client.post('/auth/logout');
}

export async function fetchCurrentUser(client: ApiClient): Promise<User> {
  return client.get<User>('/auth/me');
}
